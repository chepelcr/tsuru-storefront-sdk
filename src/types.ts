/**
 * Canonical storefront DTO contracts.
 *
 * Both backends that feed a storefront return the *same information* in slightly
 * different envelopes — store-be (live org products/categories) is snake_case and
 * paginated; management-be (demo template rows) is camelCase and unwrapped. The
 * SDK normalizes both into these canonical shapes so a template renders one shape
 * regardless of demo vs live mode.
 */

export type StorefrontMode = "demo" | "prod";

/** Resolved storefront config from /config.json. */
export interface StorefrontConfig {
  /** "demo" (template rows) or "prod" (live org). config.json "live" maps to "prod". */
  mode: StorefrontMode;
  /** Present in prod mode. */
  orgId?: string;
  /** Present in demo mode (and echoed in prod for reference). */
  templateId?: string;
}

/**
 * The store's identity. Live: management-be's PublicOrganizationResponse. Demo:
 * the template row (its display name stands in for the store name).
 */
export interface StorefrontOrganization {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  description: string | null;
  /** The owner's uploaded logo. `StorefrontTheme.logoUrl` already prefers it. */
  logoUrl: string | null;
}

/** Live: management-be's PublicBrandingResponse. */
export interface StorefrontTheme {
  primaryColor: string | null;
  secondaryColor: string | null;
  /** Owner logo first, template placeholder second (resolved by the backend). */
  logoUrl: string | null;
  faviconUrl: string | null;
  fontFamily: string | null;
  loadingIcon: string | null;
  productFallbackIcon: string | null;
}

/**
 * A structured phone (management-be PublicPhoneResponse, same shape as
 * store-be's PhoneResponse). `dialCode` is resolved by the backend through the
 * countries catalog, so a template never maps ISO codes itself.
 */
export interface StorefrontPhone {
  /** ISO numeric country, e.g. "188". NOT a dialing code. */
  countryCode: string | null;
  /** Dialing code digits without "+", e.g. "506". */
  dialCode: string | null;
  /** Local digits, e.g. "88887777". */
  number: string;
}

/** Live: management-be's PublicContactResponse. Empty fields are null, never placeholders. */
export interface StorefrontContact {
  email: string | null;
  phone: StorefrontPhone | null;
  whatsapp: StorefrontPhone | null;
  address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  businessHours: string | null;
}

export interface StorefrontCategory {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  description: string;
  /** Net price (integer, minor-unit-free per the products table). */
  price: number;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  /** "product" | "service" | "program". */
  type: string;
  /** 1=active, 2=inactive, 3=deleted (mirrors products.status). */
  status: number;
  isActive: boolean;
  onSale: boolean;
  /** Storefront "Oferta" flag (W10), independent of onSale. */
  isOffer: boolean;
  originalPrice: number | null;
  discount: number | null;
  salePrice: number | null;
  duration: string | null;
  difficulty: string | null;
  stockQuantity: number | null;
  /** Raw backend row, in case a template needs a field the canonical shape omits. */
  raw: Record<string, unknown>;
}

export interface StorefrontPage {
  id: string;
  slug: string;
  title?: string | null;
  type?: string | null;
  isActive?: boolean;
  [key: string]: unknown;
}

/** CR location cascade rows (data-be). */
export interface StateRow { state_id: number; state_name: string; }
export interface CountyRow { state_id: number; county_id: number; county_name: string; }
export interface DistrictRow { state_id: number; county_id: number; district_id: number; district_name: string; }
export interface NeighborhoodRow {
  state_id: number; county_id: number; district_id: number;
  neighborhood_id: number; neighborhood_name: string;
}

export interface ProductFilters {
  onSale?: boolean;
  isOffer?: boolean;
  type?: string;
  categoryId?: string;
  [key: string]: string | number | boolean | undefined;
}

// ── Wire shapes (snake_case, exactly as management-be serializes them) ─────
// Normalized into the canonical types above by normalize.ts; templates never
// see these.

export interface WirePublicOrganization {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  description: string | null;
  logo_url: string | null;
}

/** Demo mode: management-be's template row (GET /api/templates/{id}). */
export interface WireTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
}

export interface WirePublicBranding {
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  font_family: string | null;
  loading_icon: string | null;
  product_fallback_icon: string | null;
}

export interface WirePublicPhone {
  country_code: string | null;
  dial_code: string | null;
  number: string;
}

export interface WirePublicContact {
  email: string | null;
  phone: WirePublicPhone | null;
  whatsapp: WirePublicPhone | null;
  address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  business_hours: string | null;
}

/**
 * Demo mode: the template's contact row. It predates the structured phone and
 * carries a flat number; demo stores have no org country to resolve.
 */
export interface WireTemplateContact {
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  address: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  business_hours: unknown;
}

// ── Storefront orders (store-be CreateStorefrontOrderDTO) ──────────────────

/**
 * A guest order placed from the storefront checkout. The address uses the
 * same data-be location ids as a POS order (provincia/cantón/distrito/barrio),
 * so the pedido lands in the order list exactly like an internal one.
 */
export interface StorefrontOrderInput {
  customerName: string;
  customerPhone: string;
  /** e.g. "correos", "uber-flash", "personal", "pickup" */
  deliveryMethod: string | null;
  address: {
    stateId: number | null;
    countyId: number | null;
    districtId: number | null;
    neighborhoodId: number | null;
    /** Dirección exacta (otras señas). */
    address: string;
  } | null;
  items: { productId: string; quantity: number }[];
  comment: string | null;
}

export interface StorefrontOrderCreated {
  orderId: number;
  documentNumber: string;
  /** Public number the customer quotes when following up (WhatsApp). */
  trackingNumber: string;
  orderStatus: string;
  grandTotal: number | null;
}

export interface WireStorefrontOrderCreated {
  order_id: number;
  document_number: string;
  tracking_number: string;
  order_status: string;
  grand_total: number | null;
}
