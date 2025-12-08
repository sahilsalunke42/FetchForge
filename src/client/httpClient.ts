// httpClient.ts — corrected minimal version (no queue, no adapters yet)

import { ClientRequest } from "./request";
import { ClientResponse, ClientResponseImpl } from "./response";
import {
    NetworkError,
    TimeoutError,
    HTTPError,
    RetryLimitExceededError,
    RateLimitError,
    AbortError
} from "../core/Errors";

class CacheProvider {
    private cache: Map<string, { data: ClientResponse; expiry: number }>;

    constructor() {
        this.cache = new Map();
    }

    get(key: string): ClientResponse | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (entry.expiry < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    set(key: string, data: ClientResponse, ttlMs: number) {
        this.cache.set(key, { data, expiry: Date.now() + ttlMs });
    }
}


class RateLimiter {
    private tokens: number;
    private lastRefill: number;
    private capacity: number;
    private refillRate: number;

    constructor({ maxRequestsPerSecond }: { maxRequestsPerSecond: number }) {
        this.capacity = maxRequestsPerSecond;
        this.tokens = maxRequestsPerSecond;
        this.refillRate = maxRequestsPerSecond / 1000;
        this.lastRefill = Date.now();
    }

    private refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;
    }

    async consume() {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return;
        }
        throw new RateLimitError(1000 / this.refillRate, "Rate limit exceeded");
    }
}

// Exponential backoff with jitter
function computeBackoff(attempt: number) {
    const base = 100 * Math.pow(2, attempt); // 100, 200, 400...
    const jitter = Math.random() * 50;
    return base + jitter;
}



type BeforeMiddleware = (req: ClientRequest) => Promise<ClientRequest> | ClientRequest;
type AfterMiddleware = (res: ClientResponse) => Promise<ClientResponse> | ClientResponse;



export class HttpClient {
    private cache = new CacheProvider();
    private rateLimiter: RateLimiter;

    private beforeMiddlewares: BeforeMiddleware[] = [];
    private afterMiddlewares: AfterMiddleware[] = [];

    constructor({ maxRequestsPerSecond }: { maxRequestsPerSecond: number }) {
        this.rateLimiter = new RateLimiter({ maxRequestsPerSecond });
    }

    useBefore(mw: BeforeMiddleware) {
        this.beforeMiddlewares.push(mw);
    }

    useAfter(mw: AfterMiddleware) {
        this.afterMiddlewares.push(mw);
    }

    private async runBefore(req: ClientRequest) {
        for (const mw of this.beforeMiddlewares) req = await mw(req);
        return req;
    }

    private async runAfter(res: ClientResponse) {
        for (const mw of this.afterMiddlewares) res = await mw(res);
        return res;
    }


    async sendRequest<T = any>(req: ClientRequest): Promise<ClientResponse<T>> {
        req = await this.runBefore(req);

        // enforce rate limit
        await this.rateLimiter.consume();

        const key = `${req.method}:${req.url}`;

        // cache check
        if (req.cache?.enabled) {
            const hit = this.cache.get(key);
            if (hit) return hit as ClientResponse<T>;
        }

        const maxRetries = req.retry?.retries ?? 0;
        let attempt = 0;

        while (true) {
            try {
                const response = await this.executeOnce<T>(req);

                if (!response.ok) {
                    throw new HTTPError(response.status, "  HTTP error occurred");
                }

                if (req.cache?.enabled) {
                    this.cache.set(key, response, req.cache.durationMs);
                }

                return await this.runAfter(response);
            }
            catch (err: any) {

                if (attempt >= maxRetries) {
                    throw new RetryLimitExceededError("Retry limit exceeded");
                }

                if (
                    err instanceof TimeoutError ||
                    err instanceof NetworkError ||
                    err instanceof HTTPError && err.statusCode >= 500
                ) {
                    const delay = computeBackoff(attempt);
                    await new Promise(res => setTimeout(res, delay));
                    attempt++;
                    continue;
                }

                throw err;
            }
        }
    }


    private async executeOnce<T>(req: ClientRequest): Promise<ClientResponse<T>> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), req.timeoutMs);

        let raw: Response;
        const start = Date.now();

        try {
            raw = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                signal: controller.signal
            });
        }
        catch (e: any) {
            clearTimeout(timeout);
            if (e.name === "AbortError") throw new TimeoutError("Request timed out");
            throw new NetworkError("Request failed due to network issues");
        }

        clearTimeout(timeout);

        let body: string | null = null;
        try {
            body = await raw.text();
        } catch {
            body = null;
        }

        return new ClientResponseImpl<T>({
            url: req.url,
            method: req.method,
            status: raw.status,
            headers: Object.fromEntries(raw.headers.entries()),
            body,
            ok: raw.ok,
            durationMs: Date.now() - start
        });
    }
}
