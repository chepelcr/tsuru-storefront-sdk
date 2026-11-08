import type {
  StorefrontProduct,
  StorefrontCategory,
  StorefrontOrganization,
  StorefrontTheme,
  StorefrontContact,
  StorefrontPhone,
  WirePublicOrganization,
  WireTemplate,
  WirePublicBranding,
  WirePublicContact,
  WirePublicPhone,
  WireTemplateContact,
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
    status: Number(pick(o, "status") ?? 1),
    ...o,
  };
}

export function normalizeProduct(o: Record<string, any>): StorefrontProduct {
  const category = pick<Record<string, any>>(o, "category") ?? {};
  const status = Number(pick(o, "status") ?? 1);
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

// ── Store identity / branding / contact ─────────────────────────────────────

export function normalizeOrganization(o: WirePublicOrganization): StorefrontOrganization {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    subdomain: o.subdomain,
    description: o.description,
    logoUrl: o.logo_url,
  };
}

/** Demo stores present the template itself as the store. */
export function normalizeTemplateAsOrganization(t: WireTemplate): StorefrontOrganization {
  return {
    id: t.id,
    name: t.display_name,
    slug: t.name,
    subdomain: null,
    description: t.description,
    logoUrl: null,
  };
}

export function normalizeTheme(t: WirePublicBranding): StorefrontTheme {
  return {
    primaryColor: t.primary_color,
    secondaryColor: t.secondary_color,
    logoUrl: t.logo_url,
    faviconUrl: t.favicon_url,
    fontFamily: t.font_family,
    loadingIcon: t.loading_icon,
    productFallbackIcon: t.product_fallback_icon,
  };
}

function normalizePhone(p: WirePublicPhone | null): StorefrontPhone | null {
  if (!p) return null;
  return { countryCode: p.country_code, dialCode: p.dial_code, number: p.number };
}

export function normalizeContact(c: WirePublicContact): StorefrontContact {
  return {
    email: c.email,
    phone: normalizePhone(c.phone),
    whatsapp: normalizePhone(c.whatsapp),
    address: c.address,
    country: c.country,
    state: c.state,
    city: c.city,
    postalCode: c.postal_code,
    facebookUrl: c.facebook_url,
    instagramUrl: c.instagram_url,
    twitterUrl: c.twitter_url,
    businessHours: c.business_hours,
  };
}

function flatPhone(value: string | null): StorefrontPhone | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits ? { countryCode: null, dialCode: null, number: digits } : null;
}

export function normalizeTemplateContact(c: WireTemplateContact): StorefrontContact {
  return {
    email: c.email,
    phone: flatPhone(c.phone),
    whatsapp: flatPhone(c.whatsapp_number),
    address: c.address,
    country: null,
    state: null,
    city: null,
    postalCode: null,
    facebookUrl: c.facebook_url,
    instagramUrl: c.instagram_url,
    twitterUrl: c.twitter_url,
    businessHours: c.business_hours == null ? null : JSON.stringify(c.business_hours),
  };
}
