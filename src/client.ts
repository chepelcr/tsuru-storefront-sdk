import { signedFetch } from "./signedFetch.js";
import { effectiveId } from "./config.js";
import { normalizeCategory, normalizeProduct, unwrapList } from "./normalize.js";
import type {
  StorefrontConfig,
  StorefrontTheme,
  StorefrontContact,
  StorefrontCategory,
  StorefrontProduct,
  StorefrontPage,
  ProductFilters,
  StateRow,
  CountyRow,
  DistrictRow,
  NeighborhoodRow,
} from "./types.js";

export interface StorefrontClientOptions {
  config: StorefrontConfig;
  /** Public-API host (no trailing slash). Default: https://public-api.tsuru.jcampos.dev */
  host?: string;
  /** AWS region for SigV4. Default: us-east-1 */
  region?: string;
}

const DEFAULT_HOST = "https://public-api.tsuru.jcampos.dev";
const CR_ISO = "188";

/**
 * Build the mode-aware, guest-signed storefront client.
 *
 * Demo mode reads the template rows (`/api/templates/{templateId}/…`); live/prod
 * mode reads the org — content via management-be (`/api/public/organizations/{orgId}/…`)
 * and products/categories via store-be (`/api/organizations/{orgId}/…`). Location
 * catalogs (data-be) are served at `/countries/…` (no `/api` prefix). Every request
 * is SigV4-signed with guest credentials.
 */
export function createStorefrontClient(opts: StorefrontClientOptions) {
  const host = (opts.host ?? DEFAULT_HOST).replace(/\/$/, "");
  const region = opts.region ?? "us-east-1";
  const { config } = opts;
  const isDemo = config.mode === "demo";
  const id = effectiveId(config);

  async function get<T = any>(path: string, params?: Record<string, unknown>): Promise<T> {
    let url = host + path;
    if (params) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
      }
      const s = qs.toString();
      if (s) url += (url.includes("?") ? "&" : "?") + s;
    }
    const res = await signedFetch(url, region);
    if (!res.ok) {
      throw new Error(`Storefront API ${res.status} for ${path}`);
    }
    return res.json() as Promise<T>;
  }

  function requireId(): string {
    if (!id) throw new Error(`Storefront config missing ${isDemo ? "templateId" : "orgId"}`);
    return id;
  }

  /** Content base: demo → template rows; prod → org public content (management-be). */
  function contentPath(resource: string): string {
    const key = requireId();
    return isDemo
      ? `/api/templates/${key}/${resource}`
      : `/api/public/organizations/${key}/${resource}`;
  }

  /** Commerce base: demo → template rows (management-be); prod → org (store-be). */
  function commercePath(resource: string): string {
    const key = requireId();
    return isDemo
      ? `/api/templates/${key}/${resource}`
      : `/api/organizations/${key}/${resource}`;
  }

  return {
    config,
    mode: config.mode,
    id,

    getTheme: () => get<StorefrontTheme>(contentPath("theme")),
    getContact: () => get<StorefrontContact>(contentPath("contact")),
    getPages: () => get<StorefrontPage[]>(contentPath("pages")),
    getPage: (slug: string) => get<StorefrontPage>(contentPath(`pages/${slug}`)),

    async getCategories(): Promise<StorefrontCategory[]> {
      const res = await get<any>(commercePath("categories"));
      return unwrapList(res).map(normalizeCategory);
    },

    async getProducts(filters?: ProductFilters): Promise<StorefrontProduct[]> {
      const params: Record<string, unknown> = {};
      if (filters) {
        // demo (management-be) reads discrete params; prod (store-be) reads a `search` DSL.
        if (isDemo) {
          if (filters.isService !== undefined) params.isService = filters.isService;
          if (filters.onSale !== undefined) params.onSale = filters.onSale;
          if (filters.type) params.type = filters.type;
        } else {
          const parts: string[] = [];
          if (filters.type) parts.push(`type:${filters.type}`);
          if (filters.isOffer !== undefined) parts.push(`isOffer:${filters.isOffer}`);
          if (filters.categoryId) parts.push(`categoryId:${filters.categoryId}`);
          if (parts.length) params.search = parts.join(",");
        }
      }
      const res = await get<any>(commercePath("products"), params);
      return unwrapList(res).map(normalizeProduct);
    },

    // ── CR location cascade (data-be, no /api prefix) ──────────────────────
    getStates: (iso: string = CR_ISO) =>
      get<StateRow[]>(`/countries/${iso}/states`),
    getCounties: (stateId: number, iso: string = CR_ISO) =>
      get<CountyRow[]>(`/countries/${iso}/states/${stateId}/counties`),
    getDistricts: (stateId: number, countyId: number, iso: string = CR_ISO) =>
      get<DistrictRow[]>(`/countries/${iso}/states/${stateId}/counties/${countyId}/districts`),
    getNeighborhoods: (
      stateId: number,
      countyId: number,
      districtId: number,
      iso: string = CR_ISO,
    ) =>
      get<NeighborhoodRow[]>(
        `/countries/${iso}/states/${stateId}/counties/${countyId}/districts/${districtId}/neighborhoods`,
      ),
  };
}

export type StorefrontClient = ReturnType<typeof createStorefrontClient>;
