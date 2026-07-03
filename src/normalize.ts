import type {
  StorefrontProduct,
  StorefrontCategory,
} from "./types.js";

/** First defined value among the given keys (handles snake_case ⟷ camelCase). */
function pick<T = unknown>(o: Record<string, any>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (o[k] !== undefined && o[k] !== null) return o[k] as T;
  }
  return undefined;
}

/** Unwrap a paginated `{ data: [...] }` envelope (store-be) or pass an array through. */
export function unwrapList(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.items)) return res.items;
  return [];
}

export function normalizeCategory(o: Record<string, any>): StorefrontCategory {
  return {
    id: pick<string>(o, "id", "category_id", "categoryId") ?? "",
    name: pick<string>(o, "name") ?? "",
    slug: pick<string>(o, "slug") ?? null,
    description: pick<string>(o, "description") ?? null,
    imageUrl: pick<string>(o, "imageUrl", "image_url", "image_1_url", "image1Url") ?? null,
    isActive: pick<boolean>(o, "isActive", "is_active") ?? true,
    ...o,
  };
}

export function normalizeProduct(o: Record<string, any>): StorefrontProduct {
  const category = pick<Record<string, any>>(o, "category") ?? {};
  const status = pick<number>(o, "status") ?? (pick<boolean>(o, "isActive", "is_active") ? 1 : 2);
  return {
    id: pick<string>(o, "id", "product_id", "productId") ?? "",
    name: pick<string>(o, "name") ?? "",
    description: pick<string>(o, "description") ?? "",
    price: Number(pick(o, "price") ?? 0),
    imageUrl: pick<string>(o, "imageUrl", "image_url") ?? null,
    categoryId:
      pick<string>(o, "categoryId", "category_id") ??
      pick<string>(category, "category_id", "categoryId", "id") ??
      null,
    categoryName: pick<string>(category, "name") ?? pick<string>(o, "categoryName", "category_name") ?? null,
    type: pick<string>(o, "type") ?? "product",
    status,
    isActive: status === 1,
    onSale: Boolean(pick(o, "onSale", "on_sale") ?? false),
    isOffer: Boolean(pick(o, "isOffer", "is_offer") ?? false),
    originalPrice: numOrNull(pick(o, "originalPrice", "original_price")),
    discount: numOrNull(pick(o, "discount")),
    salePrice: numOrNull(pick(o, "salePrice", "sale_price")),
    duration: pick<string>(o, "duration") ?? null,
    difficulty: pick<string>(o, "difficulty") ?? null,
    stockQuantity: numOrNull(pick(o, "stockQuantity", "stock_quantity")),
    raw: o,
  };
}

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
