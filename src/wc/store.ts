import type { ConnectorConfig } from "../config.js";
import { WooClient } from "../http/client.js";
import { OrdersApi } from "./orders.js";
import { ProductsApi } from "./products.js";

export class WooStore {
  readonly orders: OrdersApi;
  readonly products: ProductsApi;
  readonly client: WooClient;

  constructor(config: ConnectorConfig) {
    this.client = new WooClient(config);
    this.orders = new OrdersApi(this.client, config.redactPii);
    this.products = new ProductsApi(this.client);
  }

  async ping(): Promise<{ ok: true; storeUrl: string }> {
    await this.client.get("/orders", { query: { per_page: 1 } });
    return { ok: true, storeUrl: "configured" };
  }
}
