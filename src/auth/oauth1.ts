import { createHmac, randomBytes } from "node:crypto";

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  const port =
    parsed.port &&
    !((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80"))
      ? `:${parsed.port}`
      : "";
  return `${parsed.protocol}//${parsed.hostname}${port}${parsed.pathname}`;
}

export function oauth1Header(params: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  extraParams?: Record<string, string>;
}): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  };

  const parsed = new URL(params.url);
  const collected: Record<string, string> = { ...oauth, ...(params.extraParams ?? {}) };
  parsed.searchParams.forEach((value, key) => {
    collected[key] = value;
  });

  const paramString = Object.keys(collected)
    .sort()
    .map((key) => `${encode(key)}=${encode(collected[key]!)}`)
    .join("&");

  const base = [params.method.toUpperCase(), encode(normalizeUrl(params.url)), encode(paramString)].join("&");
  const signingKey = `${encode(params.consumerSecret)}&`;
  const signature = createHmac("sha1", signingKey).update(base).digest("base64");
  oauth.oauth_signature = signature;

  return (
    "OAuth " +
    Object.entries(oauth)
      .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
      .join(", ")
  );
}
