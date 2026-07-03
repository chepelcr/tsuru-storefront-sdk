import type { StorefrontConfig, StorefrontMode } from "./types.js";

/**
 * Load and normalize the storefront config bundled at `/config.json`.
 *
 * The org-site provisioner writes `{ mode: "live", orgId, templateId }`; the
 * example (demo) builds bundle `{ mode: "demo", templateId }`. Anything that
 * isn't "demo" is treated as a live org ("prod").
 */
export async function loadStorefrontConfig(
  url = "/config.json",
): Promise<StorefrontConfig | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    const raw = await res.json();
    const mode: StorefrontMode = raw?.mode === "demo" ? "demo" : "prod";
    return {
      mode,
      orgId: raw?.orgId ?? raw?.organizationId ?? undefined,
      templateId: raw?.templateId ?? undefined,
    };
  } catch {
    return null;
  }
}

/** The id the client keys reads by: templateId in demo, orgId in prod. */
export function effectiveId(config: StorefrontConfig): string | undefined {
  return config.mode === "demo" ? config.templateId : config.orgId;
}
