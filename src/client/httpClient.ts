import { ClientRequest } from "./request";
import { ClientResponse, ClientResponseImpl } from "./response";
import { MemoryCache } from "../utils/cacheMemory";
import { RateLimiter } from "../utils/rateLimiter";
import { computeBackoff } from "../utils/backoff";
import { RequestQueue } from "../utils/queue";
import { runBeforeMiddlewares, BeforeMiddleware } from "../middleware/beforeMiddleware";
import { runAfterMiddlewares, AfterMiddleware } from "../middleware/afterMiddleware";
import {
  NetworkError,
  TimeoutError,
  HTTPError,
  RetryLimitExceededError
} from "../core/Errors";

export class HttpClient {
  private cache: MemoryCache;
  private rateLimiter: RateLimiter;
  private queue: RequestQueue;

  private beforeMiddlewares: BeforeMiddleware[] = [];
  private afterMiddlewares: AfterMiddleware[] = [];

  constructor(config: {
    maxRequestsPerSecond: number;
    maxConcurrency: number;
    cacheProvider?: MemoryCache;
    limiter?: RateLimiter;
  }) {
    this.cache = config.cacheProvider ?? new MemoryCache();
    this.rateLimiter = config.limiter ?? new RateLimiter({ maxRequestsPerSecond: config.maxRequestsPerSecond });
    this.queue = new RequestQueue(config.maxConcurrency);

    this.cache.setFetcher(async (key) => {
      return this.executeWithoutRetry(JSON.parse(key));
    });
  }

  useBefore(mw: BeforeMiddleware) {
    this.beforeMiddlewares.push(mw);
  }

  useAfter(mw: AfterMiddleware) {
    this.afterMiddlewares.push(mw);
  }

  async sendRequest<T = any>(req: ClientRequest): Promise<ClientResponse<T>> {
    req = await runBeforeMiddlewares(req, this.beforeMiddlewares);

    await this.rateLimiter.consume();

    const cacheKey = JSON.stringify(req);

    const cached = req.cache?.enabled
      ? this.cache.get(cacheKey)
      : null;

    if (cached) {
      return await runAfterMiddlewares(cached as ClientResponse<T>, this.afterMiddlewares);
    }

    const maxRetries = req.retry?.retries ?? 0;
    let attempt = 0;

    while (true) {
      try {
        const response = await this.queue.enqueue(() => this.executeOnce<T>(req));

        if (!response.ok) {
          throw new HTTPError(response.status, "  HTTP error occurred");
        }

        if (req.cache?.enabled) {
          this.cache.set(cacheKey, response, req.cache.durationMs);
        }

        return await runAfterMiddlewares(response, this.afterMiddlewares);
      } catch (err) {
        const retryEligible =
          err instanceof TimeoutError ||
          err instanceof NetworkError ||
          (err instanceof HTTPError && err.statusCode >= 500);

        if (!retryEligible || attempt >= maxRetries) {
          throw new RetryLimitExceededError("Retry limit exceeded");
        }

        const delay = computeBackoff(attempt);
        await new Promise((res) => setTimeout(res, delay));
        attempt++;
      }
    }
  }

  private async executeOnce<T>(req: ClientRequest): Promise<ClientResponse<T>> {
    return this.executeWithoutRetry(req);
  }

  private async executeWithoutRetry<T>(req: ClientRequest): Promise<ClientResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs);

    const start = Date.now();
    let raw: Response;

    try {
      raw = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: controller.signal
      });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") throw new TimeoutError("Request timed out");
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
