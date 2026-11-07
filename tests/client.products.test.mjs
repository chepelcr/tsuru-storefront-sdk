import assert from 'node:assert/strict';
import { beforeEach, describe, it, mock } from 'node:test';

const transport = mock.fn();
mock.module('../dist/signedFetch.js', { exports: { signedFetch: transport } });
const { createStorefrontClient } = await import('../dist/client.js');

beforeEach(() => transport.mock.resetCalls());

for (const config of [
  { mode: 'demo', templateId: 'template-1' },
  { mode: 'prod', orgId: 'org-1' },
]) {
  describe(`public product catalog in ${config.mode} mode`, () => {
    for (const type of ['product', 'service', 'program']) {
      it(`sends the ${type} filter and retains the returned classification`, async () => {
        transport.mock.mockImplementation(async () => new Response(JSON.stringify([
          { id: 'item-1', name: 'Catalog item', price: 100, type },
        ]), { status: 200 }));
        const client = createStorefrontClient({ config, host: 'https://storefront.test' });
        const products = await client.getProducts({ type });
        const url = new URL(transport.mock.calls[0].arguments[0]);
        if (config.mode === 'demo') {
          assert.equal(url.pathname, '/api/templates/template-1/products');
          assert.equal(url.searchParams.get('type'), type);
        } else {
          assert.equal(url.pathname, '/api/public/organizations/org-1/products');
          assert.equal(url.searchParams.get('search'), `type:${type}`);
        }
        assert.equal(url.searchParams.has('isService'), false);
        assert.equal(products[0].type, type);
      });
    }
  });
}

describe('live public catalog', () => {
  const config = { mode: 'prod', orgId: 'org-1' };

  it('searches with q and sends store-be snake_case filters', async () => {
    transport.mock.mockImplementation(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const client = createStorefrontClient({ config, host: 'https://storefront.test' });
    await client.searchProducts('  café  ', { categoryId: 'cat-1', isOffer: true, pageSize: 24 });
    const url = new URL(transport.mock.calls[0].arguments[0]);
    assert.equal(url.pathname, '/api/public/organizations/org-1/products');
    assert.equal(url.searchParams.get('q'), 'café');
    assert.equal(url.searchParams.get('search'), 'is_offer:true,category_id:cat-1');
    assert.equal(url.searchParams.get('page_size'), '24');
  });

  it('reads categories from the public catalog', async () => {
    transport.mock.mockImplementation(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const client = createStorefrontClient({ config, host: 'https://storefront.test' });
    await client.getCategories();
    assert.equal(new URL(transport.mock.calls[0].arguments[0]).pathname, '/api/public/organizations/org-1/categories');
  });

  it('returns null for a product that is not public', async () => {
    transport.mock.mockImplementation(async () => new Response('{"detail":"Product not found"}', { status: 404 }));
    const client = createStorefrontClient({ config, host: 'https://storefront.test' });
    assert.equal(await client.getProduct('p-1'), null);
    assert.equal(new URL(transport.mock.calls[0].arguments[0]).pathname, '/api/public/organizations/org-1/products/p-1');
  });
});
