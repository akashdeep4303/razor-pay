export interface WooAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  sku: string;
  total: string;
}

export interface WooOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  payment_method: string;
  payment_method_title: string;
  date_created: string;
  date_modified: string;
  customer_id: number;
  billing: WooAddress;
  shipping: WooAddress;
  line_items: WooLineItem[];
  meta_data?: Array<{ key: string; value: unknown }>;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  type: string;
  status: string;
  price: string;
  regular_price: string;
  stock_status: "instock" | "outofstock" | "onbackorder";
  stock_quantity: number | null;
  manage_stock: boolean;
  low_stock_amount: number | null;
  permalink: string;
}

export interface ListMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ListResult<T> {
  items: T[];
  meta: ListMeta;
}

export interface OrderView {
  id: number;
  number: string;
  status: string;
  total: string;
  currency: string;
  paymentMethod: string;
  createdAt: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: Array<{ name: string; sku: string; quantity: number; total: string }>;
}

export interface ProductView {
  id: number;
  name: string;
  sku: string;
  status: string;
  price: string;
  stockStatus: string;
  stockQuantity: number | null;
  manageStock: boolean;
  lowStockAmount: number | null;
}

export interface InventoryView {
  productId: number;
  name: string;
  sku: string;
  stockStatus: string;
  stockQuantity: number | null;
  manageStock: boolean;
  lowStock: boolean;
}
