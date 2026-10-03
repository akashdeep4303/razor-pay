import type { InventoryView, OrderView, ProductView, WooOrder, WooProduct } from "./types.js";

export function toOrderView(order: WooOrder, redactPii: boolean): OrderView {
  const name = `${order.billing.first_name} ${order.billing.last_name}`.trim();
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    total: order.total,
    currency: order.currency,
    paymentMethod: order.payment_method_title || order.payment_method,
    createdAt: order.date_created,
    customer: {
      name,
      email: redactPii ? undefined : order.billing.email,
      phone: redactPii ? undefined : order.billing.phone,
    },
    items: order.line_items.map((item) => ({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      total: item.total,
    })),
  };
}

export function toProductView(product: WooProduct): ProductView {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    status: product.status,
    price: product.price,
    stockStatus: product.stock_status,
    stockQuantity: product.stock_quantity,
    manageStock: product.manage_stock,
    lowStockAmount: product.low_stock_amount,
  };
}

export function toInventoryView(product: WooProduct): InventoryView {
  const qty = product.stock_quantity;
  const threshold = product.low_stock_amount ?? 5;
  const lowStock =
    product.stock_status !== "instock" || (product.manage_stock && qty !== null && qty <= threshold);
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    stockStatus: product.stock_status,
    stockQuantity: qty,
    manageStock: product.manage_stock,
    lowStock,
  };
}
