
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
    private cache: Map<string, { value: ClientResponse; expiry: number; createdAt: number; lastAccessed: number }>;
    private maxEntries: number;
    private enableLRU: boolean
    private defaultTTLMs: number;
    private staleWindowMs: number
    private enableStaleWhileRevalidate: boolean;
    private cleanupIntervalMs: number
    private clock: () => number;
    private inFlightRefreshes: Map<string, Promise<void>>;
    private cleanupTimer: NodeJS.Timeout | null;
    
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
        const entry = this.cache.get(key);
        const now = this.clock();
        if (!entry) return null;
        if (entry.expiry < now) {
            if (this.enableStaleWhileRevalidate && (now - entry.expiry) <= this.staleWindowMs) {
                this.triggerRefresh(key);
                return entry.value;
            }
            return null;
        }
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
        this.cache.set(key, { value: data, expiry, createdAt: now, lastAccessed: now });
        if (this.cache.size > this.maxEntries) {
            this.evict();
        }
    }
    delete(key: string): void {
        this.cache.delete(key);
    }
    clear(): void {
        this.cache.clear();
    }
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        const now = this.clock();
        if (entry.expiry < now) {
            return false;
        }
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
            }
        } else {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
    }

    private async triggerRefresh(key: string) {
        if (this.inFlightRefreshes.has(key)) {
            return;
        }
        const refreshPromise = this.refresh(key).finally(() => {
            this.inFlightRefreshes.delete(key);
        });
        this.inFlightRefreshes.set(key, refreshPromise);
    }
    private async refresh(key: string) {
        // Placeholder: actual refresh logic to fetch new data and update cache
        // This would typically involve calling a provided fetcher function
        // For demonstration, we'll just simulate a delay
        await new Promise(res => setTimeout(res, 1000));
        // After fetching new data, update the cache
        // this.set(key, newData, this.defaultTTLMs);
    }   
    dispose() {
        this.stopCleanupTimer();
    }
}

