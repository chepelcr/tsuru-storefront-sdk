# @chepelcr/tsuru-storefront-sdk

Shared **data layer** for the Tsuru storefront templates. One place for the API
contract, guest signing, and demo-vs-live URL logic so every template stays
consistent — fixes are a version bump, not an 8-repo sweep.

What it provides:

- **`loadStorefrontConfig()`** — reads `/config.json` → `{ mode, orgId | templateId }`
  (`"live"` normalizes to `"prod"`).
- **`configureStorefrontAmplify({ identityPoolId, region })`** — wires the W7 guest
  (unauthenticated) Cognito identity pool. Call once at startup.
- **`createStorefrontClient({ config })`** — mode-aware, **SigV4-signed** client:
  - demo → `/api/templates/{templateId}/…` (template rows)
  - prod → `/api/public/organizations/{orgId}/…` (content) + `/api/organizations/{orgId}/…` (products/categories) + `/countries/…` (CR locations)
  - responses normalized to the canonical `Storefront*` DTOs (snake_case ⟷ camelCase unified).

## Usage

```ts
// main.tsx
import { configureStorefrontAmplify } from "@chepelcr/tsuru-storefront-sdk";
configureStorefrontAmplify({
  identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
  region: import.meta.env.VITE_AWS_REGION ?? "us-east-1",
});

// anywhere
import { loadStorefrontConfig, createStorefrontClient } from "@chepelcr/tsuru-storefront-sdk";
const config = await loadStorefrontConfig();
const api = createStorefrontClient({ config: config! });
const products = await api.getProducts();   // canonical StorefrontProduct[]
```

## Store identity, branding and contact (1.1.0)

Render the org's own data, never the template's placeholders:

```ts
const client = createStorefrontClient({ config });
const org = await client.getOrganization();   // name, slug, description, logoUrl
const theme = await client.getTheme();        // logoUrl = owner logo, else template's
const contact = await client.getContact();    // phone/whatsapp: { countryCode, dialCode, number }

const wa = whatsappPhone(contact);            // whatsapp, else phone, else null
if (wa) window.open(whatsappUrl(wa, message));
```

`dialCode` is resolved by management-be through the countries catalog
(`contact_settings.phone_country_code` → `countries.iso_code`); templates never
map ISO codes. The wire is snake_case; `normalize.ts` maps it to these types.

## Checkout orders (1.2.0)

```ts
const order = await client.createOrder({
  customerName, customerPhone, deliveryMethod,
  address: { stateId, countyId, districtId, neighborhoodId, address },  // data-be location ids
  items: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
  comment: null,
});
// order.trackingNumber → quote it in the WhatsApp hand-off
```

Creates a store-be storefront pedido (status `pending`) with the same structured
address columns a POS order uses. Live stores only; demo mode rejects.

## Install (GitHub Packages)

`.npmrc` in the consuming repo:

```
@chepelcr:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

In GitHub Actions set `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (reads same-owner
packages). Locally, use a PAT with `read:packages`.

## Env the templates pass in

- `VITE_IDENTITY_POOL_ID` — W7 anonymous identity pool id
- `VITE_AWS_REGION` — default `us-east-1`
- (optional) client `host` — defaults to `https://public-api.tsuru.jcampos.dev`
