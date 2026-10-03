import type { AuthMode } from "../config.js";

export function resolveAuthMode(storeUrl: string, authMode: AuthMode): Exclude<AuthMode, "auto"> {
  if (authMode !== "auto") return authMode;
  return storeUrl.startsWith("https://") ? "basic" : "oauth1";
}

export function basicAuthHeader(consumerKey: string, consumerSecret: string): string {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}
