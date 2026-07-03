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

export interface StorefrontTheme {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  fontFamily?: string | null;
  [key: string]: unknown;
}

export interface StorefrontContact {
  email?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  address?: string | null;
  [key: string]: unknown;
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
  isService?: boolean;
  onSale?: boolean;
  isOffer?: boolean;
  type?: string;
  categoryId?: string;
  [key: string]: string | number | boolean | undefined;
}
