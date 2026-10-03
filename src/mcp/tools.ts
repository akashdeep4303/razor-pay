import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConnectorError } from "../http/errors.js";
import { redactDeep } from "../redact.js";
import type { WooStore } from "../wc/store.js";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(error: unknown) {
  const message =
    error instanceof ConnectorError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : "unknown error";
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

const pageSchema = z.number().int().min(1).max(100).optional().describe("1-based page index");
const perPageSchema = z.number().int().min(1).max(50).optional().describe("Page size, max 50");

export function registerTools(server: McpServer, store: WooStore, redactPii: boolean): void {
  const wrap = (data: unknown) => ok(redactPii ? redactDeep(data) : data);

  server.registerTool(
    "woocommerce_list_orders",
    {
      title: "List orders",
      description:
        "List WooCommerce orders newest first. Use status filters such as failed, pending, processing, completed, refunded, on-hold.",
      inputSchema: {
        page: pageSchema,
        perPage: perPageSchema,
        status: z.string().optional().describe("Order status slug"),
        after: z.string().optional().describe("ISO8601 lower bound on date_created"),
        before: z.string().optional().describe("ISO8601 upper bound on date_created"),
      },
    },
    async (args) => {
      try {
        return wrap(await store.orders.list(args));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "woocommerce_get_order",
    {
      title: "Get order",
      description: "Fetch a single WooCommerce order by numeric id, including line items and customer contact fields.",
      inputSchema: {
        id: z.number().int().positive().describe("WooCommerce order id"),
      },
    },
    async ({ id }) => {
      try {
        return wrap(await store.orders.get(id));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "woocommerce_search_orders",
    {
      title: "Search orders",
      description:
        "Search orders by order number, customer name, email, phone, or SKU. Optionally restrict by status.",
      inputSchema: {
        query: z.string().min(1).describe("Search string"),
        status: z.string().optional(),
        page: pageSchema,
        perPage: perPageSchema,
      },
    },
    async (args) => {
      try {
        return wrap(await store.orders.search(args));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "woocommerce_list_products",
    {
      title: "List products",
      description: "List published catalog products with price and stock fields.",
      inputSchema: {
        page: pageSchema,
        perPage: perPageSchema,
        stockStatus: z.enum(["instock", "outofstock", "onbackorder"]).optional(),
      },
    },
    async (args) => {
      try {
        return wrap(await store.products.list(args));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "woocommerce_get_product",
    {
      title: "Get product",
      description: "Fetch a single catalog product by numeric id.",
      inputSchema: {
        id: z.number().int().positive().describe("WooCommerce product id"),
      },
    },
    async ({ id }) => {
      try {
        return wrap(await store.products.get(id));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "woocommerce_search_products",
    {
      title: "Search products",
      description: "Search the catalog by name or exact SKU.",
      inputSchema: {
        query: z.string().optional().describe("Name search"),
        sku: z.string().optional().describe("Exact SKU"),
        page: pageSchema,
        perPage: perPageSchema,
      },
    },
    async (args) => {
      try {
        if (!args.query && !args.sku) {
          return fail(new Error("Provide query or sku"));
        }
        return wrap(await store.products.search({ query: args.query ?? "", sku: args.sku, page: args.page, perPage: args.perPage }));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "woocommerce_list_inventory",
    {
      title: "List inventory",
      description:
        "Read stock status and quantities. Set lowStockOnly to surface SKUs that are out of stock or at/under the low-stock threshold.",
      inputSchema: {
        page: pageSchema,
        perPage: perPageSchema,
        sku: z.string().optional(),
        stockStatus: z.enum(["instock", "outofstock", "onbackorder"]).optional(),
        lowStockOnly: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return wrap(await store.products.inventory(args));
      } catch (error) {
        return fail(error);
      }
    },
  );

  server.registerTool(
    "woocommerce_get_inventory",
    {
      title: "Get inventory",
      description: "Read inventory for one product id.",
      inputSchema: {
        productId: z.number().int().positive(),
      },
    },
    async ({ productId }) => {
      try {
        const product = await store.products.get(productId);
        const [row] = (await store.products.inventory({ sku: product.sku })).items.filter(
          (item) => item.productId === productId,
        );
        if (!row) return fail(new Error("Inventory row missing"));
        return wrap(row);
      } catch (error) {
        return fail(error);
      }
    },
  );
}
