const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\+?\d[\d\s\-()]{8,}\d/g;

export function redactText(value: string): string {
  return value.replace(EMAIL, "[redacted-email]").replace(PHONE, "[redacted-phone]");
}

export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redactText(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (["email", "phone", "phone_number", "billing", "shipping", "address_1", "address_2"].includes(lower)) {
        out[key] = typeof nested === "string" ? "[redacted]" : redactDeep(nested);
      } else {
        out[key] = redactDeep(nested);
      }
    }
    return out as T;
  }
  return value;
}
