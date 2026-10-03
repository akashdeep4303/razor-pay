import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type AuthMode = "auto" | "basic" | "query" | "oauth1";

export interface ConnectorConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  authMode: AuthMode;
  rateLimitRps: number;
  maxRetries: number;
  maxConcurrency: number;
  redactPii: boolean;
}

function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function loadCredentialsFile(): { storeUrl?: string; consumerKey?: string; consumerSecret?: string } {
  const path = resolve(process.cwd(), ".credentials.json");
  if (!existsSync(path)) return {};
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    storeUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
  };
  return parsed;
}

export function loadConfig(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
  loadDotEnv(resolve(process.cwd(), ".env"));
  const file = loadCredentialsFile();

  const storeUrl = (overrides.storeUrl ?? process.env.WC_STORE_URL ?? file.storeUrl ?? "").replace(/\/$/, "");
  const consumerKey = overrides.consumerKey ?? process.env.WC_CONSUMER_KEY ?? file.consumerKey ?? "";
  const consumerSecret = overrides.consumerSecret ?? process.env.WC_CONSUMER_SECRET ?? file.consumerSecret ?? "";
  const authMode = (overrides.authMode ?? (process.env.WC_AUTH_MODE as AuthMode | undefined) ?? "auto") as AuthMode;

  return {
    storeUrl,
    consumerKey,
    consumerSecret,
    authMode,
    rateLimitRps: overrides.rateLimitRps ?? Number(process.env.WC_RATE_LIMIT_RPS ?? 5),
    maxRetries: overrides.maxRetries ?? Number(process.env.WC_MAX_RETRIES ?? 4),
    maxConcurrency: overrides.maxConcurrency ?? Number(process.env.WC_MAX_CONCURRENCY ?? 3),
    redactPii: overrides.redactPii ?? process.env.WC_REDACT_PII === "true",
  };
}

export function assertConfigured(config: ConnectorConfig): void {
  if (!config.storeUrl) {
    throw new Error("Missing WC_STORE_URL. Copy .env.example to .env or run `npm run connect`.");
  }
  if (!config.consumerKey || !config.consumerSecret) {
    throw new Error(
      "Missing WooCommerce credentials. Set WC_CONSUMER_KEY/WC_CONSUMER_SECRET or run `npm run connect`.",
    );
  }
}
