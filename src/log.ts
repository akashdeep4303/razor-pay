/** MCP stdio uses stdout. All operational logs go to stderr. */
export function logInfo(message: string, extra?: Record<string, unknown>): void {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  process.stderr.write(`[woocommerce-connector] ${message}${suffix}\n`);
}

export function logError(message: string, extra?: Record<string, unknown>): void {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
  process.stderr.write(`[woocommerce-connector:error] ${message}${suffix}\n`);
}
