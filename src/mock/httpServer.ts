import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  DEMO_CONSUMER_KEY,
  DEMO_CONSUMER_SECRET,
  filterOrders,
  filterProducts,
  orders,
  paginate,
  products,
} from "./fixtures.js";
import { verifyMockAuth } from "./auth.js";

export interface MockServer {
  url: string;
  port: number;
  close: () => Promise<void>;
  forceRateLimitOnce: () => void;
}

function readUrl(req: IncomingMessage, host: string): URL {
  return new URL(req.url ?? "/", `http://${host}`);
}

function send(res: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(json),
    ...extraHeaders,
  });
  res.end(json);
}

function unauthorized(res: ServerResponse): void {
  send(res, 401, { code: "woocommerce_rest_cannot_view", message: "Consumer key is missing or invalid." });
}

export function startMockWooCommerce(port = 8787): Promise<MockServer> {
  let rateLimitOnce = false;

  const server: Server = createServer(async (req, res) => {
    const host = req.headers.host ?? `127.0.0.1:${port}`;
    const url = readUrl(req, host);

    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/wc-auth/v1/authorize") {
      const callbackUrl = url.searchParams.get("callback_url");
      const returnUrl = url.searchParams.get("return_url") ?? "http://127.0.0.1/done";
      const userId = url.searchParams.get("user_id") ?? "merchant-demo";
      if (callbackUrl) {
        await fetch(callbackUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            key_id: 1,
            user_id: userId,
            consumer_key: DEMO_CONSUMER_KEY,
            consumer_secret: DEMO_CONSUMER_SECRET,
            key_permissions: url.searchParams.get("scope") ?? "read",
          }),
        }).catch(() => undefined);
      }
      res.writeHead(302, { Location: returnUrl });
      res.end();
      return;
    }

    if (!url.pathname.startsWith("/wp-json/wc/v3")) {
      send(res, 404, { message: "not found" });
      return;
    }

    if (rateLimitOnce) {
      rateLimitOnce = false;
      send(res, 429, { message: "Too many requests" }, { "retry-after": "0" });
      return;
    }

    if (!verifyMockAuth(url, req.headers.authorization ?? null)) {
      unauthorized(res);
      return;
    }

    if (url.pathname === "/wp-json/wc/v3/orders" && req.method === "GET") {
      const filtered = filterOrders(orders, url.searchParams);
      const page = paginate(filtered, url.searchParams);
      send(res, 200, page.slice, {
        "x-wp-total": String(page.total),
        "x-wp-totalpages": String(page.totalPages),
      });
      return;
    }

    const orderMatch = url.pathname.match(/^\/wp-json\/wc\/v3\/orders\/(\d+)$/);
    if (orderMatch && req.method === "GET") {
      const order = orders.find((item) => item.id === Number(orderMatch[1]));
      if (!order) {
        send(res, 404, { message: "Invalid ID." });
        return;
      }
      send(res, 200, order);
      return;
    }

    if (url.pathname === "/wp-json/wc/v3/products" && req.method === "GET") {
      const filtered = filterProducts(products, url.searchParams);
      const page = paginate(filtered, url.searchParams);
      send(res, 200, page.slice, {
        "x-wp-total": String(page.total),
        "x-wp-totalpages": String(page.totalPages),
      });
      return;
    }

    const productMatch = url.pathname.match(/^\/wp-json\/wc\/v3\/products\/(\d+)$/);
    if (productMatch && req.method === "GET") {
      const product = products.find((item) => item.id === Number(productMatch[1]));
      if (!product) {
        send(res, 404, { message: "Invalid ID." });
        return;
      }
      send(res, 200, product);
      return;
    }

    send(res, 404, { message: "not found" });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        url: `http://127.0.0.1:${actualPort}`,
        port: actualPort,
        forceRateLimitOnce: () => {
          rateLimitOnce = true;
        },
        close: () =>
          new Promise((done, fail) => {
            server.close((err) => (err ? fail(err) : done()));
          }),
      });
    });
  });
}

const isMain = process.argv[1]?.includes("httpServer");
if (isMain) {
  const port = Number(process.env.MOCK_PORT ?? 8787);
  const mock = await startMockWooCommerce(port);
  process.stderr.write(`Mock WooCommerce listening on ${mock.url}\n`);
  process.stderr.write("Demo credentials: ck_demo_key / cs_demo_secret\n");
  process.stderr.write("App auth: GET /wc-auth/v1/authorize\n");
}
