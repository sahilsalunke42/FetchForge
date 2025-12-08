// backoff.ts is a small, stateless utility module that computes delays for retries using exponential backoff with jitter, ensuring that repeated request failures do not overload the server. It exposes a pure function like computeBackoff(attempt: number, baseMs = 100, maxMs = 30000) which increases the delay exponentially (baseMs * 2^attempt) and then adds a small randomized jitter (e.g., 0–50ms) to prevent multiple clients from retrying at the same synchronized intervals. The function clamps the final delay to maxMs and returns the computed duration in milliseconds. HttpClient’s retry loop calls this function after a failed attempt, then sleeps for the returned duration before retrying. This separates retry timing logic from HttpClient, keeps the design clean, makes retry behavior configurable, and allows easy unit testing of retry timing without involving any network calls.

// Exponential backoff with jitter
export function computeBackoff(attempt: number, baseMs = 100, maxMs = 30000): number {
    const exponentialDelay = baseMs * Math.pow(2, attempt); // e.g., 100, 200, 400...
    const jitter = Math.random() * 50; // random jitter between 0-50ms
    const delay = Math.min(exponentialDelay + jitter, maxMs);
    return delay;
}

