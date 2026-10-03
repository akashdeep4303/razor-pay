export class ConnectorError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}

export function httpError(status: number, body: string): ConnectorError {
  if (status === 401 || status === 403) {
    return new ConnectorError("WooCommerce rejected the credentials or the key lacks this scope.", "auth_failed", status);
  }
  if (status === 404) {
    return new ConnectorError("Resource not found in the merchant store.", "not_found", status);
  }
  if (status === 429) {
    return new ConnectorError("WooCommerce or the host rate-limited the connector.", "rate_limited", status, true);
  }
  if (status >= 500) {
    return new ConnectorError(`WooCommerce returned ${status}.`, "upstream_error", status, true);
  }
  return new ConnectorError(`WooCommerce returned ${status}: ${body.slice(0, 240)}`, "http_error", status);
}
