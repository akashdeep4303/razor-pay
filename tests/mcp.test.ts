import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "../src/config.js";
import { registerTools } from "../src/mcp/tools.js";
import { startMockWooCommerce, type MockServer } from "../src/mock/httpServer.js";
import { DEMO_CONSUMER_KEY, DEMO_CONSUMER_SECRET } from "../src/mock/fixtures.js";
import { WooStore } from "../src/wc/store.js";

describe("MCP tools", () => {
  let mock: MockServer;
  let client: Client;

  beforeAll(async () => {
    mock = await startMockWooCommerce(0);
    const store = new WooStore(
      loadConfig({
        storeUrl: mock.url,
        consumerKey: DEMO_CONSUMER_KEY,
        consumerSecret: DEMO_CONSUMER_SECRET,
        authMode: "basic",
      }),
    );
    const server = new McpServer({ name: "woocommerce-connector", version: "1.0.0" });
    registerTools(server, store, false);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterAll(async () => {
    await client.close();
    await mock.close();
  });

  it("exposes list/get/search primitives", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "woocommerce_get_inventory",
        "woocommerce_get_order",
        "woocommerce_get_product",
        "woocommerce_list_inventory",
        "woocommerce_list_orders",
        "woocommerce_list_products",
        "woocommerce_search_orders",
        "woocommerce_search_products",
      ].sort(),
    );
  });

  it("returns structured order search results", async () => {
    const result = await client.callTool({
      name: "woocommerce_search_orders",
      arguments: { query: "5012" },
    });
    const content = (result.content ?? []) as Array<{ type: string; text?: string }>;
    const text = content.find((part) => part.type === "text");
    expect(text?.text ?? "").toContain("Rahul Mehta");
  });
});
