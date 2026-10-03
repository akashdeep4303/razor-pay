import type { WooClient } from "../http/client.js";
import { parseListMeta } from "../http/client.js";
import { toInventoryView, toProductView } from "./normalize.js";
import type { InventoryView, ListResult, ProductView, WooProduct } from "./types.js";

export interface ProductQuery {
  page?: number;
  perPage?: number;
  search?: string;
  sku?: string;
  stockStatus?: string;
  status?: string;
}

export class ProductsApi {
  constructor(private readonly client: WooClient) {}

  async list(query: ProductQuery = {}): Promise<ListResult<ProductView>> {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 10, 50);
    const { data, headers } = await this.client.get<WooProduct[]>("/products", {
      query: {
        page,
        per_page: perPage,
        search: query.search,
        sku: query.sku,
        stock_status: query.stockStatus,
        status: query.status ?? "publish",
      },
    });
    return {
      items: data.map(toProductView),
      meta: parseListMeta(headers, page, perPage, data.length),
    };
  }

  async get(id: number): Promise<ProductView> {
    const { data } = await this.client.get<WooProduct>(`/products/${id}`);
    return toProductView(data);
  }

  async search(params: { query: string; sku?: string; page?: number; perPage?: number }): Promise<ListResult<ProductView>> {
    return this.list({
      search: params.query,
      sku: params.sku,
      page: params.page,
      perPage: params.perPage,
    });
  }

  async inventory(query: ProductQuery & { lowStockOnly?: boolean } = {}): Promise<ListResult<InventoryView>> {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 20, 50);
    const { data, headers } = await this.client.get<WooProduct[]>("/products", {
      query: {
        page,
        per_page: perPage,
        search: query.search,
        sku: query.sku,
        stock_status: query.stockStatus,
        status: query.status ?? "publish",
      },
    });
    let items = data.map(toInventoryView);
    if (query.lowStockOnly) items = items.filter((item) => item.lowStock);
    return {
      items,
      meta: parseListMeta(headers, page, perPage, data.length),
    };
  }
}
