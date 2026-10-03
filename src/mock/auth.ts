import { createHmac } from "node:crypto";
import { DEMO_CONSUMER_KEY, DEMO_CONSUMER_SECRET } from "./fixtures.js";

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function extractBasic(header: string | null): { user: string; pass: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (idx === -1) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

export function verifyMockAuth(url: URL, authorization: string | null): boolean {
  const queryKey = url.searchParams.get("consumer_key");
  const querySecret = url.searchParams.get("consumer_secret");
  if (queryKey && querySecret) {
    return queryKey === DEMO_CONSUMER_KEY && querySecret === DEMO_CONSUMER_SECRET;
  }

  const basic = extractBasic(authorization);
  if (basic) {
    return basic.user === DEMO_CONSUMER_KEY && basic.pass === DEMO_CONSUMER_SECRET;
  }

  if (authorization?.startsWith("OAuth ")) {
    const params: Record<string, string> = {};
    for (const part of authorization.slice(6).split(",")) {
      const [rawKey, rawValue] = part.trim().split("=");
      if (!rawKey || !rawValue) continue;
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/^"|"$/g, ""));
    }
    if (params.oauth_consumer_key !== DEMO_CONSUMER_KEY) return false;
    const signature = params.oauth_signature;
    if (!signature) return false;

    const collected: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      collected[key] = value;
    });
    for (const [key, value] of Object.entries(params)) {
      if (key !== "oauth_signature") collected[key] = value;
    }
    const paramString = Object.keys(collected)
      .sort()
      .map((key) => `${encode(key)}=${encode(collected[key]!)}`)
      .join("&");
    const baseUrl = `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}${url.pathname}`;
    const base = ["GET", encode(baseUrl), encode(paramString)].join("&");
    const expected = createHmac("sha1", `${encode(DEMO_CONSUMER_SECRET)}&`).update(base).digest("base64");
    return expected === signature;
  }

  return false;
}
