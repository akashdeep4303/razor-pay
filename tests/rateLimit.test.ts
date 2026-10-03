import { describe, expect, it } from "vitest";
import { RateLimiter, parseRetryAfter } from "../src/http/rateLimit.js";

describe("rate limiter", () => {
  it("caps concurrency", async () => {
    const limiter = new RateLimiter({ rps: 50, maxConcurrency: 2 });
    let current = 0;
    let max = 0;
    await Promise.all(
      Array.from({ length: 6 }, () =>
        limiter.schedule(async () => {
          current += 1;
          max = Math.max(max, current);
          await new Promise((r) => setTimeout(r, 20));
          current -= 1;
        }),
      ),
    );
    expect(max).toBeLessThanOrEqual(2);
  });

  it("parses Retry-After seconds", () => {
    expect(parseRetryAfter("2")).toBe(2000);
  });
});
