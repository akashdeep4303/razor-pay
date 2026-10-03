import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { assertConfigured, loadConfig } from "./config.js";
import { logError, logInfo } from "./log.js";
import { registerTools } from "./mcp/tools.js";
import { WooStore } from "./wc/store.js";

async function main(): Promise<void> {
  const config = loadConfig();
  assertConfigured(config);
  const store = new WooStore(config);

  const server = new McpServer({
    name: "woocommerce-connector",
    version: "1.0.0",
  });
  registerTools(server, store, config.redactPii);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logInfo("MCP server ready", {
    storeUrl: config.storeUrl,
    authMode: config.authMode,
    redactPii: config.redactPii,
  });
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
