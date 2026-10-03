import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { startMockWooCommerce, type MockServer } from "../src/mock/httpServer.js";
import { DEMO_CONSUMER_KEY, DEMO_CONSUMER_SECRET } from "../src/mock/fixtures.js";
import { WooStore } from "../src/wc/store.js";

describe("WooCommerce connector", () => {
  let mock: MockServer;
  let store: WooStore;

  beforeAll(async () => {
    mock = await startMockWooCommerce(0);
    store = new WooStore(
      loadConfig({
        storeUrl: mock.url,
        consumerKey: DEMO_CONSUMER_KEY,
        consumerSecret: DEMO_CONSUMER_SECRET,
        authMode: "basic",
        rateLimitRps: 30,
        maxRetries: 3,
        maxConcurrency: 2,
        redactPii: false,
      }),
    );
  });

  afterAll(async () => {
    await mock.close();
  });

  it("lists, gets, and searches orders", async () => {
    const list = await store.orders.list({ perPage: 10 });
    expect(list.meta.total).toBe(5);
    expect(list.items[0]?.id).toBe(5014);

    const found = await store.orders.search({ query: "ananya", status: "failed" });
    expect(found.items).toHaveLength(1);
    expect(found.items[0]?.id).toBe(5011);

    const one = await store.orders.get(5012);
    expect(one.status).toBe("processing");
    expect(one.items).toHaveLength(2);
  });

  it("lists products and inventory, including low stock", async () => {
    const products = await store.products.search({ query: "Tee" });
    expect(products.items[0]?.sku).toBe("RP-TEE-IND");

    const bySku = await store.products.search({ query: "", sku: "RP-POS-PAPER" });
    expect(bySku.items).toHaveLength(1);

    const inventory = await store.products.inventory({ lowStockOnly: true });
    const skus = inventory.items.map((item) => item.sku).sort();
    expect(skus).toContain("RP-SBX-ST");
    expect(skus).toContain("RP-POS-PAPER");
    expect(skus).not.toContain("RP-TEE-IND");
  });

  it("maps 404 and 401 to connector errors", async () => {
    await expect(store.orders.get(9999)).rejects.toMatchObject({ code: "not_found", status: 404 });

    const bad = new WooStore(
      loadConfig({
        storeUrl: mock.url,
        consumerKey: "ck_wrong",
        consumerSecret: "cs_wrong",
        authMode: "basic",
        maxRetries: 0,
      }),
    );
    await expect(bad.orders.list()).rejects.toMatchObject({ code: "auth_failed", status: 401 });
  });

  it("retries after a 429", async () => {
    mock.forceRateLimitOnce();
    const order = await store.orders.get(5013);
    expect(order.status).toBe("completed");
  });

  it("authenticates with OAuth 1.0a and query-string keys", async () => {
    const oauth = new WooStore(
      loadConfig({
        storeUrl: mock.url,
        consumerKey: DEMO_CONSUMER_KEY,
        consumerSecret: DEMO_CONSUMER_SECRET,
        authMode: "oauth1",
        maxRetries: 1,
      }),
    );
    const listed = await oauth.orders.list({ status: "refunded" });
    expect(listed.items[0]?.id).toBe(5015);

    const query = new WooStore(
      loadConfig({
        storeUrl: mock.url,
        consumerKey: DEMO_CONSUMER_KEY,
        consumerSecret: DEMO_CONSUMER_SECRET,
        authMode: "query",
        maxRetries: 1,
      }),
    );
    const product = await query.products.get(102);
    expect(product.stockStatus).toBe("outofstock");
  });

  it("redacts customer PII when configured", async () => {
    const redacted = new WooStore(
      loadConfig({
        storeUrl: mock.url,
        consumerKey: DEMO_CONSUMER_KEY,
        consumerSecret: DEMO_CONSUMER_SECRET,
        authMode: "basic",
        redactPii: true,
      }),
    );
    const order = await redacted.orders.get(5011);
    expect(order.customer.email).toBeUndefined();
    expect(order.customer.phone).toBeUndefined();
    expect(order.customer.name).toContain("Ananya");
  });

  it("completes the WooCommerce app-auth callback", async () => {
    const authorize = new URL(`${mock.url}/wc-auth/v1/authorize`);
    authorize.searchParams.set("app_name", "Agent Studio");
    authorize.searchParams.set("scope", "read");
    authorize.searchParams.set("user_id", "test");
    authorize.searchParams.set("return_url", "http://127.0.0.1/done");

    const received = await new Promise<Record<string, string>>((resolve, reject) => {
      import("node:http").then(({ createServer }) => {
        const server = createServer((req, res) => {
          const chunks: Buffer[] = [];
          req.on("data", (c) => chunks.push(c as Buffer));
          req.on("end", () => {
            res.end("ok");
            server.close();
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, string>);
          });
        });
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          if (!addr || typeof addr === "string") {
            reject(new Error("no port"));
            return;
          }
          authorize.searchParams.set("callback_url", `http://127.0.0.1:${addr.port}/callback`);
          fetch(authorize, { redirect: "manual" }).catch(reject);
        });
      });
    });

    expect(received.consumer_key).toBe(DEMO_CONSUMER_KEY);
    expect(received.key_permissions).toBe("read");
  });
});
