import type { WooClient } from "../http/client.js";
import { parseListMeta } from "../http/client.js";
import { toOrderView } from "./normalize.js";
import type { ListResult, OrderView, WooOrder } from "./types.js";

export interface OrderQuery {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  after?: string;
  before?: string;
  customer?: number;
  orderby?: "date" | "id" | "modified";
  order?: "asc" | "desc";
}

export class OrdersApi {
  constructor(
    private readonly client: WooClient,
    private readonly redactPii: boolean,
  ) {}

  async list(query: OrderQuery = {}): Promise<ListResult<OrderView>> {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 10, 50);
    const { data, headers } = await this.client.get<WooOrder[]>("/orders", {
      query: {
        page,
        per_page: perPage,
        status: query.status,
        search: query.search,
        after: query.after,
        before: query.before,
        customer: query.customer,
        orderby: query.orderby ?? "date",
        order: query.order ?? "desc",
      },
    });
    return {
      items: data.map((order) => toOrderView(order, this.redactPii)),
      meta: parseListMeta(headers, page, perPage, data.length),
    };
  }

  async get(id: number): Promise<OrderView> {
    const { data } = await this.client.get<WooOrder>(`/orders/${id}`);
    return toOrderView(data, this.redactPii);
  }

  async search(params: { query: string; status?: string; page?: number; perPage?: number }): Promise<ListResult<OrderView>> {
    return this.list({
      search: params.query,
      status: params.status,
      page: params.page,
      perPage: params.perPage,
    });
  }
}
