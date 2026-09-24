export * from "./types.js";
export { loadStorefrontConfig, effectiveId } from "./config.js";
export { configureStorefrontAmplify } from "./auth.js";
export type { StorefrontAuthOptions } from "./auth.js";
export { signedFetch } from "./signedFetch.js";
export { createStorefrontClient } from "./client.js";
export type { StorefrontClient, StorefrontClientOptions } from "./client.js";
export {
  normalizeProduct,
  normalizeCategory,
  unwrapList,
  normalizeOrganization,
  normalizeTheme,
  normalizeContact,
} from "./normalize.js";
export { formatPhone, telHref, whatsappPhone, whatsappUrl } from "./phone.js";
