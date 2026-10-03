# Assignment notes

## Choice

Option 3 — private WooCommerce connector — because the FDE role is to sit between a merchant’s existing tool and Agent Studio, not to scrape a website or operate a phone line.

## Merchant problem

Support and ops teams ask “what happened to this payment / is this SKU actually available?” and then bounce between WooCommerce admin, Razorpay dashboard, and email. The connector gives an agent **constrained read primitives** so it can answer that without a write key and without dumping the raw REST API into the model.

## Demo data

Five fictional orders and four products. No real customers. Demo keys: `ck_demo_key` / `cs_demo_secret`, accepted only by the local mock.

## Evaluation checklist

- [ ] `npm test`
- [ ] `npm run demo`
- [ ] Auth: API key (basic, query, OAuth 1.0a) and `/wc-auth/v1/authorize` callback
- [ ] Tools: list / get / search for orders, products, inventory
- [ ] 429 retry
- [ ] Read-only (no write routes registered)
