
// Exponential backoff with jitter
export function computeBackoff(attempt: number, baseMs = 100, maxMs = 30000): number {
    const exponentialDelay = baseMs * Math.pow(2, attempt); // e.g., 100, 200, 400...
    const jitter = Math.random() * 50; // random jitter between 0-50ms
    const delay = Math.min(exponentialDelay + jitter, maxMs);
    return delay;
}

