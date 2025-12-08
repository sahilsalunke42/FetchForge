import { RateLimitError } from "../core/Errors";

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private capacity: number; // bucket size
  private refillRate: number; // tokens per ms
  private clock: () => number;

  constructor(config: {
    maxRequestsPerSecond: number;
    burstCapacity?: number;
    clock?: () => number;
  }) {
    this.capacity = config.burstCapacity ?? config.maxRequestsPerSecond;
    this.tokens = this.capacity;

    // refillRate = X tokens per second → divide by 1000 to get per ms
    this.refillRate = config.maxRequestsPerSecond / 1000;

    // clock injection for testing
    this.clock = config.clock ?? (() => Date.now());

    this.lastRefill = this.clock();
  }

  private refill() {
    const now = this.clock();
    const elapsed = now - this.lastRefill;

    if (elapsed > 0) {
      this.tokens = Math.min(
        this.capacity,
        this.tokens + elapsed * this.refillRate
      );
      this.lastRefill = now;
    }
  }

  async consume(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    throw new RateLimitError(429);
  }

  availableTokens(): number {
    this.refill();
    return this.tokens;
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = this.clock();
  }
}
