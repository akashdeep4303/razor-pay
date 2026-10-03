export interface RateLimiterOptions {
  rps: number;
  maxConcurrency: number;
}

/**
 * Spacing + concurrency gate. WooCommerce REST API has no published global quota;
 * this protects the merchant WordPress host and pairs with 429/5xx retries.
 */
export class RateLimiter {
  private readonly queue: Array<() => void> = [];
  private inFlight = 0;
  private nextSlot = 0;
  private readonly minInterval: number;

  constructor(private readonly options: RateLimiterOptions) {
    this.minInterval = 1000 / Math.max(options.rps, 0.001);
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    await this.enter();
    try {
      return await fn();
    } finally {
      this.inFlight -= 1;
      this.pump();
    }
  }

  private enter(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.pump();
    });
  }

  private pump(): void {
    if (!this.queue.length || this.inFlight >= this.options.maxConcurrency) return;
    const now = Date.now();
    const wait = Math.max(0, this.nextSlot - now);
    if (wait > 0) {
      setTimeout(() => this.pump(), wait);
      return;
    }
    this.nextSlot = now + this.minInterval;
    this.inFlight += 1;
    const resolve = this.queue.shift();
    resolve?.();
  }
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

export function backoffMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs !== undefined) return retryAfterMs;
  const base = Math.min(8000, 250 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 120);
  return base + jitter;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
