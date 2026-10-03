import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { registerTools } from "./mcp/tools.js";
import { startMockWooCommerce } from "./mock/httpServer.js";
import { DEMO_CONSUMER_KEY, DEMO_CONSUMER_SECRET } from "./mock/fixtures.js";
import { WooStore } from "./wc/store.js";

interface ToolTextPart {
  type: string;
  text?: string;
}

async function callTool(client: Client, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await client.callTool({ name, arguments: args });
  const content = (result.content ?? []) as ToolTextPart[];
  const text = content.find((part) => part.type === "text");
  if (result.isError) throw new Error(text?.text ?? "tool error");
  if (!text?.text) return result;
  return JSON.parse(text.text) as unknown;
}

async function main(): Promise<void> {
  const mock = await startMockWooCommerce(0);
  const config = loadConfig({
    storeUrl: mock.url,
    consumerKey: DEMO_CONSUMER_KEY,
    consumerSecret: DEMO_CONSUMER_SECRET,
    authMode: "basic",
    rateLimitRps: 20,
    maxRetries: 3,
    maxConcurrency: 2,
    redactPii: false,
  });

  const store = new WooStore(config);
  const server = new McpServer({ name: "woocommerce-connector", version: "1.0.0" });
  registerTools(server, store, false);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "demo", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const listed = await client.listTools();
  const failed = (await callTool(client, "woocommerce_search_orders", { query: "ananya", status: "failed" })) as {
    items: Array<{ id: number; status: string; total: string; customer: { name: string } }>;
  };
  const order = (await callTool(client, "woocommerce_get_order", { id: 5012 })) as { id: number; status: string };
  const low = (await callTool(client, "woocommerce_list_inventory", { lowStockOnly: true })) as {
    items: Array<{ sku: string; stockStatus: string; stockQuantity: number | null }>;
  };
  const sku = (await callTool(client, "woocommerce_search_products", { sku: "RP-TEE-IND" })) as {
    items: Array<{ name: string }>;
  };

  mock.forceRateLimitOnce();
  const afterRetry = await store.orders.get(5011);

  const oauthStore = new WooStore({ ...config, authMode: "oauth1" });
  const oauthOrders = await oauthStore.orders.list({ perPage: 2 });

  const queryStore = new WooStore({ ...config, authMode: "query" });
  const queryProducts = await queryStore.products.list({ perPage: 1 });

  console.log(
    JSON.stringify(
      {
        ok: true,
        mockUrl: mock.url,
        mcpTools: listed.tools.map((tool) => tool.name),
        failedPaymentRecovery: failed.items.map((item) => ({
          orderId: item.id,
          customer: item.customer.name,
          amount: item.total,
          nextAction: "Ask the customer to retry Razorpay checkout; do not capture a card on this channel.",
        })),
        processingOrder: order,
        lowStock: low.items,
        skuSearch: sku.items.map((item) => item.name),
        retriedAfter429: afterRetry.id,
        oauth1OrderCount: oauthOrders.items.length,
        queryAuthSku: queryProducts.items[0]?.sku,
      },
      null,
      2,
    ),
  );

  await client.close();
  await mock.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
