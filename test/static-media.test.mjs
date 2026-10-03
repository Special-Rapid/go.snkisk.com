import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../src/index.ts';
import { proxyVerifiedImage, SHARE_PREVIEW_ASSET } from '../src/static-media.ts';

const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0x40, 0xff, 0xd9]);
const asset = { ...SHARE_PREVIEW_ASSET, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };

test('verified proxy preserves exact bytes and public response while isolating upstream headers', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, SHARE_PREVIEW_ASSET.url);
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, undefined);
    assert.deepEqual(options.headers, { Accept: 'image/jpeg' });
    assert.ok(options.signal instanceof AbortSignal);
    return new Response(bytes, { headers: { 'content-type': 'Image/JPEG; charset=binary', 'set-cookie': 'private=1', 'cache-control': 'private' } });
  });
  const response = await proxyVerifiedImage(asset);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
});

for (const [name, upstream] of [
  ['redirect', () => new Response(null, { status: 302, headers: { location: 'https://example.com/image.jpg' } })],
  ['upstream HTTP failure', () => new Response('error', { status: 503 })],
  ['wrong MIME', () => new Response(bytes, { headers: { 'content-type': 'text/html' } })],
  ['short body', () => new Response(bytes.slice(0, -1), { headers: { 'content-type': 'image/jpeg' } })],
  ['oversized body', () => new Response(new Uint8Array(bytes.length + 1), { headers: { 'content-type': 'image/jpeg' } })],
  ['same-size hash mismatch', () => { const changed = bytes.slice(); changed[3] ^= 1; return new Response(changed, { headers: { 'content-type': 'image/jpeg' } }); }],
  ['network/offline failure', () => { throw new Error('offline'); }],
  ['body read failure', () => new Response(new ReadableStream({ start(controller) { controller.error(new Error('broken stream')); } }), { headers: { 'content-type': 'image/jpeg' } })],
]) test(`${name} never publishes or publicly caches an unverified image`, async (t) => {
  t.mock.method(globalThis, 'fetch', upstream);
  const response = await proxyVerifiedImage(asset);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), 'Image temporarily unavailable');
});

test('stream size bound cancels the reader before publication', async (t) => {
  let cancelled = false;
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(bytes); controller.enqueue(bytes); },
    cancel() { cancelled = true; },
  }), { headers: { 'content-type': 'image/jpeg' } }));
  assert.equal((await proxyVerifiedImage(asset)).status, 502);
  assert.ok(cancelled);
});

test('decoded body is checked even when transport length differs due to compression', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(bytes, { headers: {
    'content-type': 'image/jpeg', 'content-encoding': 'gzip', 'content-length': '999',
  } }));
  assert.equal((await proxyVerifiedImage(asset)).status, 200);
});

test('invalid mapping cannot reach the network', async (t) => {
  t.mock.method(globalThis, 'fetch', () => { assert.fail('invalid mapping fetched'); });
  for (const url of ['https://example.com/image.jpg', `${asset.url}?key=secret`, asset.url.replace('https://', 'http://'), asset.url.replace('/images/', '/other/')]) {
    assert.equal((await proxyVerifiedImage({ ...asset, url })).status, 502);
  }
});

test('existing public GET route uses only the pinned URL and needs no database/auth binding', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++;
    assert.equal(url, SHARE_PREVIEW_ASSET.url);
    assert.equal(options.headers.Authorization, undefined);
    return new Response(null, { status: 503 });
  });
  const env = new Proxy({}, { get() { assert.fail('asset route accessed a binding'); } });
  for (const host of ['go.snkisk.com', 'sinkaisoku.com']) {
    const response = await worker.fetch(new Request(`https://${host}/assets/share-preview-amber-waves.jpg?untrusted=https://example.com/`, {
      headers: { Authorization: 'Bearer private' },
    }), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls, 2);
});
