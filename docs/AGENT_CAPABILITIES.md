# What the agent can and cannot do

This is the contract an Agent Studio agent should treat as source of truth when the WooCommerce connector is attached.

## Can

- List orders with pagination and status filters (`failed`, `pending`, `processing`, `completed`, `on-hold`, `refunded`, …).
- Fetch one order by id, including line items, totals, payment method label, and (unless `WC_REDACT_PII=true`) billing email/phone.
- Search orders by a string (order number, customer name, email, phone, or SKU in the mock; WooCommerce’s own `search` parameter on a live store).
- List / get / search catalog products (name, SKU, price, stock status).
- Read inventory: quantity, `manage_stock`, stock status, and a derived `lowStock` flag.
- Authenticate with a **read** REST API key or the WooCommerce app-auth consent flow.
- Survive host throttling via client-side rate limits and 429 retries.

## Cannot

- Create, update, delete, refund, capture, or re-charge an order.
- Change stock, prices, or product visibility.
- Call WordPress admin, wp-admin-ajax, or any route outside `/wp-json/wc/v3` (except the one-time `/wc-auth/v1/authorize` onboarding).
- Bypass WooCommerce or WordPress capability checks. A read key cannot see other merchants; a key minted for a shop manager only sees what that user can see.
- Promise that a listed `failed` order can be retried inside this connector. Recovery is “read context, then send the customer back to Razorpay checkout.”
- Access Razorpay payment APIs, settlements, or disputes. Payment method title is informational only.
- Return PII if `WC_REDACT_PII=true`. Support workflows that need email/phone must run in a private tenancy with redaction off and logging that never writes those fields (this process logs only status codes and redacted URLs).

## Recommended agent policy

1. Prefer `get` when the ticket already has an order id; `search` second; `list` last.
2. Never dump a full page of orders into the customer-facing reply — summarize.
3. If stock is low, say so and stop. Do not offer to “fix inventory.”
4. If auth fails, ask a human to rotate the WooCommerce key; do not retry with guessed secrets.
