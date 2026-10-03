import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('Workers runtime publishes verified bytes and rejects redirects without following them', async () => {
  const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0x40, 0xff, 0xd9]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  const source = stripTypeScriptTypes(readFileSync(new URL('../src/static-media.ts', import.meta.url), 'utf8'));
  let calls = 0;
  let upstream = () => new Response(bytes, { headers: { 'content-type': 'image/jpeg' } });
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: `${source}\nexport default { async fetch() { return proxyVerifiedImage({ ...SHARE_PREVIEW_ASSET, bytes: ${bytes.length}, sha256: ${JSON.stringify(digest)} }); } };`,
    compatibilityDate: '2026-06-12',
    outboundService: async (request) => {
      calls += 1;
      assert.equal(request.url, 'https://images.snkisk.com/go.snkisk.com/images/fdfe80cf-dd14-4f32-aea6-bdaa1f186c4d.jpg');
      assert.equal(request.headers.get('accept'), 'image/jpeg');
      assert.equal(request.headers.get('authorization'), null);
      assert.equal(request.headers.get('cookie'), null);
      return upstream();
    },
  }));
  try {
    const good = await mf.dispatchFetch('https://go.snkisk.com/assets/share-preview-amber-waves.jpg');
    assert.equal(good.status, 200);
    assert.equal(calls, 1);
    assert.equal(good.headers.get('content-type'), 'image/jpeg');
    assert.equal(good.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.deepEqual(new Uint8Array(await good.arrayBuffer()), bytes);

    for (const redirect of [301, 302, 303, 307, 308]) {
      upstream = () => new Response(null, { status: redirect, headers: { location: 'https://example.com/image.jpg' } });
      const before = calls;
      const bad = await mf.dispatchFetch('https://sinkaisoku.com/assets/share-preview-amber-waves.jpg');
      assert.equal(bad.status, 502);
      assert.equal(bad.headers.get('cache-control'), 'no-store');
      assert.equal(calls, before + 1, 'redirect destination must never be fetched');
      assert.equal(await bad.text(), 'Image temporarily unavailable');
    }
  } finally {
    await mf.dispose();
  }
});
