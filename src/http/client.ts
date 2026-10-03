import { basicAuthHeader, resolveAuthMode } from "../auth/apiKey.js";
import { oauth1Header } from "../auth/oauth1.js";
import type { ConnectorConfig } from "../config.js";
import { ConnectorError, httpError } from "./errors.js";
import { backoffMs, parseRetryAfter, RateLimiter, sleep } from "./rateLimit.js";
import { logError, logInfo } from "../log.js";

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
}

export class WooClient {
  private readonly limiter: RateLimiter;

  constructor(private readonly config: ConnectorConfig) {
    this.limiter = new RateLimiter({
      rps: config.rateLimitRps,
      maxConcurrency: config.maxConcurrency,
    });
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; headers: Headers }> {
    const url = this.buildUrl(path, options.query);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.limiter.schedule(() => this.send<T>(url));
      } catch (error) {
        lastError = error;
        const retryable = error instanceof ConnectorError && error.retryable;
        if (!retryable || attempt === this.config.maxRetries) throw error;
        const wait = backoffMs(attempt, (error as ConnectorError & { retryAfterMs?: number }).retryAfterMs);
        logInfo("retrying WooCommerce request", { attempt: attempt + 1, waitMs: wait, path });
        await sleep(wait);
      }
    }

    throw lastError;
  }

  private async send<T>(url: string): Promise<{ data: T; headers: Headers }> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "agent-studio-woocommerce-connector/1.0",
    };

    const mode = resolveAuthMode(this.config.storeUrl, this.config.authMode);
    if (mode === "basic") {
      headers.Authorization = basicAuthHeader(this.config.consumerKey, this.config.consumerSecret);
    } else if (mode === "oauth1") {
      headers.Authorization = oauth1Header({
        method: "GET",
        url,
        consumerKey: this.config.consumerKey,
        consumerSecret: this.config.consumerSecret,
      });
    }

    const finalUrl = mode === "query" ? this.withQueryAuth(url) : url;
    const response = await fetch(finalUrl, { method: "GET", headers });
    const body = await response.text();

    if (response.status === 429) {
      const err = httpError(429, body) as ConnectorError & { retryAfterMs?: number };
      err.retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      throw err;
    }

    if (!response.ok) {
      logError("WooCommerce HTTP error", { status: response.status, url: this.stripSecrets(finalUrl) });
      throw httpError(response.status, body);
    }

    return { data: body ? (JSON.parse(body) as T) : ({} as T), headers: response.headers };
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const base = `${this.config.storeUrl}/wp-json/wc/v3${path.startsWith("/") ? path : `/${path}`}`;
    const url = new URL(base);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private withQueryAuth(url: string): string {
    const parsed = new URL(url);
    parsed.searchParams.set("consumer_key", this.config.consumerKey);
    parsed.searchParams.set("consumer_secret", this.config.consumerSecret);
    return parsed.toString();
  }

  private stripSecrets(url: string): string {
    const parsed = new URL(url);
    parsed.searchParams.delete("consumer_key");
    parsed.searchParams.delete("consumer_secret");
    return parsed.toString();
  }
}

export function parseListMeta(headers: Headers, page: number, perPage: number, itemCount: number) {
  const total = Number(headers.get("x-wp-total") ?? itemCount);
  const totalPages = Number(headers.get("x-wp-totalpages") ?? 1);
  return { page, perPage, total, totalPages };
}
