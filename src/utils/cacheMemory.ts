import { ClientResponse } from "../client/response";

export interface ICacheProvider {
    get(key: string): ClientResponse | null;
    set(key: string, data: ClientResponse, ttlMs: number): void;
    delete(key: string): void;
    clear(): void;
    has(key: string): boolean;
    size(): number;
    keys(): string[];
}

export class MemoryCache implements ICacheProvider {
    private cache: Map<string, {
        value: ClientResponse;
        expiry: number;
        createdAt: number;
        lastAccessed: number;
    }>;

    private maxEntries: number;
    private enableLRU: boolean;
    private defaultTTLMs: number;
    private staleWindowMs: number;
    private enableStaleWhileRevalidate: boolean;
    private cleanupIntervalMs: number;
    private clock: () => number;

    private inFlightRefreshes: Map<string, Promise<void>>;
    private cleanupTimer: NodeJS.Timeout | null;

    private fetcher?: (key: string) => Promise<ClientResponse>;

    constructor(config?: {
        maxEntries?: number;
        enableLRU?: boolean;
        defaultTTLMs?: number;
        staleWindowMs?: number;
        enableStaleWhileRevalidate?: boolean;
        cleanupIntervalMs?: number;
        clock?: () => number;
    }) {
        this.cache = new Map();

        this.maxEntries = config?.maxEntries ?? 1000;
        this.enableLRU = config?.enableLRU ?? true;
        this.defaultTTLMs = config?.defaultTTLMs ?? 5 * 60 * 1000;
        this.staleWindowMs = config?.staleWindowMs ?? 60 * 1000;
        this.enableStaleWhileRevalidate = config?.enableStaleWhileRevalidate ?? true;
        this.cleanupIntervalMs = config?.cleanupIntervalMs ?? 10 * 60 * 1000;
        this.clock = config?.clock ?? (() => Date.now());

        this.inFlightRefreshes = new Map();
        this.cleanupTimer = null;

        this.startCleanupTimer();
    }

    setFetcher(fetcher: (key: string) => Promise<ClientResponse>) {
        this.fetcher = fetcher;
    }

    private startCleanupTimer() {
        if (this.cleanupIntervalMs > 0) {
            this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
        }
    }

    private stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    private cleanup() {
        const now = this.clock();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiry < now) {
                this.cache.delete(key);
            }
        }
    }

    get(key: string): ClientResponse | null {
        const now = this.clock();
        const entry = this.cache.get(key);

        if (!entry) return null;

        // expired
        if (entry.expiry < now) {
            const age = now - entry.expiry;

            // stale-while-revalidate path
            if (this.enableStaleWhileRevalidate && age <= this.staleWindowMs) {
                this.triggerRefresh(key);
                return entry.value;
            }

            // fully expired → remove entry
            this.cache.delete(key);
            return null;
        }

        // Update LRU metadata
        if (this.enableLRU) {
            entry.lastAccessed = now;
            this.cache.delete(key);
            this.cache.set(key, entry);
        }

        return entry.value;
    }

    set(key: string, data: ClientResponse, ttlMs?: number): void {
        const now = this.clock();
        const expiry = now + (ttlMs ?? this.defaultTTLMs);

        const existing = this.cache.get(key);
        const createdAt = existing?.createdAt ?? now;

        this.cache.set(key, {
            value: data,
            expiry,
            createdAt,
            lastAccessed: now
        });

        if (this.cache.size > this.maxEntries) {
            this.evict();
        }
    }

    delete(key: string): void {
        this.cache.delete(key);
        this.inFlightRefreshes.delete(key);
    }

    clear(): void {
        this.cache.clear();
        this.inFlightRefreshes.clear();
    }

    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const now = this.clock();
        if (entry.expiry < now) return false;

        return true;
    }

    size(): number {
        this.cleanup();
        return this.cache.size;
    }

    keys(): string[] {
        this.cleanup();
        return Array.from(this.cache.keys());
    }

    private evict() {
        if (this.enableLRU) {
            let oldestKey: string | null = null;
            let oldestAccess = Infinity;

            for (const [key, entry] of this.cache.entries()) {
                if (entry.lastAccessed < oldestAccess) {
                    oldestAccess = entry.lastAccessed;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                this.cache.delete(oldestKey);
                this.inFlightRefreshes.delete(oldestKey);
            }
        } else {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
                this.inFlightRefreshes.delete(firstKey);
            }
        }
    }


    private async triggerRefresh(key: string) {
        if (!this.fetcher) return; // no fetcher → do nothing
        if (this.inFlightRefreshes.has(key)) return;

        const promise = this.refresh(key).finally(() => {
            this.inFlightRefreshes.delete(key);
        });

        this.inFlightRefreshes.set(key, promise);
    }

    private async refresh(key: string) {
        if (!this.fetcher) return;

        try {
            const newValue = await this.fetcher(key);
            this.set(key, newValue, this.defaultTTLMs);
        } catch {
            // ignore refresh failures, keep stale entry
        }
    }

    dispose() {
        this.stopCleanupTimer();
    }
}
