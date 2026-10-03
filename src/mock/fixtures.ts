import type { WooOrder, WooProduct } from "../wc/types.js";

export const DEMO_CONSUMER_KEY = "ck_demo_key";
export const DEMO_CONSUMER_SECRET = "cs_demo_secret";

const address = (
  first: string,
  last: string,
  email: string,
  phone: string,
  city: string,
  state: string,
  postcode: string,
) => ({
  first_name: first,
  last_name: last,
  address_1: "221 fictional street",
  city,
  state,
  postcode,
  country: "IN",
  email,
  phone,
});

export const products: WooProduct[] = [
  {
    id: 101,
    name: "Razorpay Tee — Indigo",
    slug: "razorpay-tee-indigo",
    sku: "RP-TEE-IND",
    type: "simple",
    status: "publish",
    price: "799.00",
    regular_price: "799.00",
    stock_status: "instock",
    stock_quantity: 42,
    manage_stock: true,
    low_stock_amount: 8,
    permalink: "https://demo.merchant.test/product/razorpay-tee-indigo",
  },
  {
    id: 102,
    name: "UPI Soundbox Stand",
    slug: "upi-soundbox-stand",
    sku: "RP-SBX-ST",
    type: "simple",
    status: "publish",
    price: "349.00",
    regular_price: "349.00",
    stock_status: "outofstock",
    stock_quantity: 0,
    manage_stock: true,
    low_stock_amount: 5,
    permalink: "https://demo.merchant.test/product/upi-soundbox-stand",
  },
  {
    id: 103,
    name: "POS Roll Paper 10-pack",
    slug: "pos-roll-paper",
    sku: "RP-POS-PAPER",
    type: "simple",
    status: "publish",
    price: "199.00",
    regular_price: "199.00",
    stock_status: "instock",
    stock_quantity: 4,
    manage_stock: true,
    low_stock_amount: 10,
    permalink: "https://demo.merchant.test/product/pos-roll-paper",
  },
  {
    id: 104,
    name: "Gift card — ₹500",
    slug: "gift-card-500",
    sku: "RP-GIFT-500",
    type: "simple",
    status: "publish",
    price: "500.00",
    regular_price: "500.00",
    stock_status: "instock",
    stock_quantity: null,
    manage_stock: false,
    low_stock_amount: null,
    permalink: "https://demo.merchant.test/product/gift-card-500",
  },
];

function line(id: number, product: WooProduct, quantity: number): WooOrder["line_items"][number] {
  return {
    id,
    name: product.name,
    product_id: product.id,
    variation_id: 0,
    quantity,
    sku: product.sku,
    total: (Number(product.price) * quantity).toFixed(2),
  };
}

export const orders: WooOrder[] = [
  {
    id: 5011,
    number: "5011",
    status: "failed",
    currency: "INR",
    total: "799.00",
    payment_method: "razorpay",
    payment_method_title: "Razorpay",
    date_created: "2026-09-28T09:12:00",
    date_modified: "2026-09-28T09:13:00",
    customer_id: 12,
    billing: address("Ananya", "Iyer", "ananya.iyer@example.test", "+91 90000 11111", "Bengaluru", "KA", "560001"),
    shipping: address("Ananya", "Iyer", "ananya.iyer@example.test", "+91 90000 11111", "Bengaluru", "KA", "560001"),
    line_items: [line(1, products[0]!, 1)],
  },
  {
    id: 5012,
    number: "5012",
    status: "processing",
    currency: "INR",
    total: "1048.00",
    payment_method: "razorpay",
    payment_method_title: "Razorpay",
    date_created: "2026-09-29T14:40:00",
    date_modified: "2026-09-29T14:41:00",
    customer_id: 13,
    billing: address("Rahul", "Mehta", "rahul.mehta@example.test", "+91 90000 22222", "Mumbai", "MH", "400001"),
    shipping: address("Rahul", "Mehta", "rahul.mehta@example.test", "+91 90000 22222", "Mumbai", "MH", "400001"),
    line_items: [line(2, products[0]!, 1), line(3, products[2]!, 1)],
  },
  {
    id: 5013,
    number: "5013",
    status: "completed",
    currency: "INR",
    total: "500.00",
    payment_method: "cod",
    payment_method_title: "Cash on delivery",
    date_created: "2026-09-20T11:00:00",
    date_modified: "2026-09-21T10:00:00",
    customer_id: 14,
    billing: address("Fatima", "Khan", "fatima.khan@example.test", "+91 90000 33333", "Hyderabad", "TS", "500001"),
    shipping: address("Fatima", "Khan", "fatima.khan@example.test", "+91 90000 33333", "Hyderabad", "TS", "500001"),
    line_items: [line(4, products[3]!, 1)],
  },
  {
    id: 5014,
    number: "5014",
    status: "on-hold",
    currency: "INR",
    total: "349.00",
    payment_method: "razorpay",
    payment_method_title: "Razorpay",
    date_created: "2026-10-01T08:05:00",
    date_modified: "2026-10-01T08:06:00",
    customer_id: 15,
    billing: address("Vikram", "Singh", "vikram.singh@example.test", "+91 90000 44444", "Jaipur", "RJ", "302001"),
    shipping: address("Vikram", "Singh", "vikram.singh@example.test", "+91 90000 44444", "Jaipur", "RJ", "302001"),
    line_items: [line(5, products[1]!, 1)],
  },
  {
    id: 5015,
    number: "5015",
    status: "refunded",
    currency: "INR",
    total: "799.00",
    payment_method: "razorpay",
    payment_method_title: "Razorpay",
    date_created: "2026-09-10T16:22:00",
    date_modified: "2026-09-12T12:00:00",
    customer_id: 12,
    billing: address("Ananya", "Iyer", "ananya.iyer@example.test", "+91 90000 11111", "Bengaluru", "KA", "560001"),
    shipping: address("Ananya", "Iyer", "ananya.iyer@example.test", "+91 90000 11111", "Bengaluru", "KA", "560001"),
    line_items: [line(6, products[0]!, 1)],
  },
];

export function filterOrders(
  all: WooOrder[],
  query: URLSearchParams,
): WooOrder[] {
  let result = [...all];
  const status = query.get("status");
  const search = query.get("search")?.toLowerCase();
  const customer = query.get("customer");
  if (status && status !== "any") result = result.filter((o) => o.status === status);
  if (customer) result = result.filter((o) => String(o.customer_id) === customer);
  if (search) {
    result = result.filter((o) => {
      const hay = [
        o.number,
        o.billing.email,
        o.billing.first_name,
        o.billing.last_name,
        o.billing.phone,
        ...o.line_items.map((i) => i.sku),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }
  result.sort((a, b) => (a.date_created < b.date_created ? 1 : -1));
  return result;
}

export function filterProducts(all: WooProduct[], query: URLSearchParams): WooProduct[] {
  let result = [...all];
  const search = query.get("search")?.toLowerCase();
  const sku = query.get("sku")?.toLowerCase();
  const stockStatus = query.get("stock_status");
  const status = query.get("status");
  if (status) result = result.filter((p) => p.status === status);
  if (stockStatus) result = result.filter((p) => p.stock_status === stockStatus);
  if (sku) result = result.filter((p) => p.sku.toLowerCase() === sku);
  if (search) {
    result = result.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(search));
  }
  return result;
}

export function paginate<T>(items: T[], query: URLSearchParams): { slice: T[]; total: number; totalPages: number; page: number; perPage: number } {
  const page = Math.max(1, Number(query.get("page") ?? 1));
  const perPage = Math.max(1, Number(query.get("per_page") ?? 10));
  const start = (page - 1) * perPage;
  const slice = items.slice(start, start + perPage);
  return {
    slice,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / perPage)),
    page,
    perPage,
  };
}
