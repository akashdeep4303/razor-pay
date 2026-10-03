import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function arg(name: string, fallback?: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  return fallback ?? "";
}

function html(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:sans-serif;padding:2rem"><h1>${title}</h1><p>${body}</p></body></html>`;
}

/**
 * WooCommerce app authentication (merchant consent) flow.
 * Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication
 *
 * The merchant store redirects/callback-POSTs consumer key+secret to our HTTPS callback.
 * For this assignment the mock store auto-approves; against a real store the merchant
 * clicks Approve on /wc-auth/v1/authorize.
 */
async function main(): Promise<void> {
  const storeUrl = arg("store-url", process.env.WC_STORE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
  const appName = arg("app-name", "Razorpay Agent Studio");
  const scope = arg("scope", "read");
  const callbackPort = Number(arg("callback-port", "8790"));
  const userId = arg("user-id", "agent-studio");

  const callbackUrl = `http://127.0.0.1:${callbackPort}/callback`;
  const returnUrl = `http://127.0.0.1:${callbackPort}/done`;

  const credentials = await new Promise<{ consumerKey: string; consumerSecret: string; permissions: string }>(
    (resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for WooCommerce app-auth callback")), 20_000);
      const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", `http://127.0.0.1:${callbackPort}`);

        if (req.method === "POST" && url.pathname === "/callback") {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk as Buffer));
          req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            let payload: {
              consumer_key?: string;
              consumer_secret?: string;
              key_permissions?: string;
            };
            try {
              payload = JSON.parse(raw) as typeof payload;
            } catch {
              res.writeHead(400);
              res.end("invalid json");
              return;
            }
            if (!payload.consumer_key || !payload.consumer_secret) {
              res.writeHead(400);
              res.end("missing keys");
              return;
            }
            res.writeHead(200);
            res.end("ok");
            clearTimeout(timer);
            resolvePromise({
              consumerKey: payload.consumer_key,
              consumerSecret: payload.consumer_secret,
              permissions: payload.key_permissions ?? scope,
            });
            server.close();
          });
          return;
        }

        if (url.pathname === "/done") {
          res.writeHead(200, { "content-type": "text/html" });
          res.end(html("Connected", "You can close this tab. Credentials were stored locally in <code>.credentials.json</code>."));
          return;
        }

        res.writeHead(404);
        res.end("not found");
      });

      server.listen(callbackPort, "127.0.0.1", async () => {
        const authorize = new URL(`${storeUrl}/wc-auth/v1/authorize`);
        authorize.searchParams.set("app_name", appName);
        authorize.searchParams.set("scope", scope);
        authorize.searchParams.set("user_id", userId);
        authorize.searchParams.set("return_url", returnUrl);
        authorize.searchParams.set("callback_url", callbackUrl);

        process.stderr.write("Open and approve this URL in the merchant WordPress admin:\n");
        process.stderr.write(`${authorize.toString()}\n`);
        process.stderr.write("The mock store auto-approves when fetched.\n");

        try {
          await fetch(authorize.toString(), { redirect: "manual" });
        } catch (error) {
          reject(error);
        }
      });

    },
  );

  const payload = {
    storeUrl,
    consumerKey: credentials.consumerKey,
    consumerSecret: credentials.consumerSecret,
    permissions: credentials.permissions,
    connectedAt: new Date().toISOString(),
  };
  const path = resolve(process.cwd(), ".credentials.json");
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n", { mode: 0o600 });
  process.stderr.write(`Wrote ${path} (read scope only).\n`);
  process.exit(0);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
