import { signedFetch } from "./signedFetch.js";
import { effectiveId } from "./config.js";
import {
  normalizeCategory,
  normalizeProduct,
  unwrapList,
  normalizeOrganization,
  normalizeTemplateAsOrganization,
  normalizeTheme,
  normalizeContact,
  normalizeTemplateContact,
} from "./normalize.js";
import type {
  StorefrontConfig,
  StorefrontOrganization,
  StorefrontTheme,
  StorefrontContact,
  WirePublicOrganization,
  WireTemplate,
  WirePublicBranding,
  WirePublicContact,
  WireTemplateContact,
  StorefrontOrderInput,
  StorefrontOrderCreated,
  WireStorefrontOrderCreated,
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

    /**
     * Place a guest order with the store (live stores only — a demo template
     * has no organization to receive it, so this rejects in demo mode).
     */
    async createOrder(input: StorefrontOrderInput): Promise<StorefrontOrderCreated> {
      if (isDemo) throw new Error("Demo storefronts do not take orders");
      const body = {
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        delivery_method: input.deliveryMethod,
        address: input.address && {
          state_id: input.address.stateId,
          county_id: input.address.countyId,
          district_id: input.address.districtId,
          neighborhood_id: input.address.neighborhoodId,
          address: input.address.address,
        },
        items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        comment: input.comment,
      };
      const url = `${host}${commercePath("orders")}`;
      const res = await signedFetch(url, region, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Storefront API ${res.status} for ${commercePath("orders")}`);
      const created = (await res.json()) as WireStorefrontOrderCreated;
      return {
        orderId: created.order_id,
        documentNumber: created.document_number,
        trackingNumber: created.tracking_number,
        orderStatus: created.order_status,
        grandTotal: created.grand_total,
      };
    },

    /** The store's name, slug, description and owner logo. */
    async getOrganization(): Promise<StorefrontOrganization> {
      const key = requireId();
      return isDemo
        ? normalizeTemplateAsOrganization(await get<WireTemplate>(`/api/templates/${key}`))
        : normalizeOrganization(
            await get<WirePublicOrganization>(`/api/public/organizations/${key}`),
          );
    },

    /** Colors, fonts and logo (owner logo first, resolved by the backend). */
    async getTheme(): Promise<StorefrontTheme> {
      return normalizeTheme(await get<WirePublicBranding>(contentPath("theme")));
    },

    /** Contact with structured phone/whatsapp; empty fields are null. */
    async getContact(): Promise<StorefrontContact> {
      return isDemo
        ? normalizeTemplateContact(await get<WireTemplateContact>(contentPath("contact")))
        : normalizeContact(await get<WirePublicContact>(contentPath("contact")));
    },
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
