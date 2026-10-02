// Run with Node 22.18+ (native TypeScript stripping): node --test test/crawl.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';

for (const host of ['go.snkisk.com', 'sinkaisoku.com', 'docs.go.snkisk.com', 'docs.sinkaisoku.com']) {
  test(`${host}: discovery needs no database and preserves private URL exclusions`, async () => {
    const env = new Proxy({}, { get() { throw new Error('Discovery must not access bindings'); } });
    const robots = await worker.fetch(new Request(`https://${host}/robots.txt`), env);
    assert.equal(robots.status, 200);
    assert.match(robots.headers.get('content-type'), /^text\/plain/);
    const text = await robots.text();
    const canonicalHost = host.startsWith('docs.') ? 'docs.sinkaisoku.com' : 'sinkaisoku.com';
    assert.ok(text.includes(`Sitemap: https://${canonicalHost}/sitemap.xml`));
    if (host.startsWith('docs.')) {
      // Previously robots.txt was 404: do not introduce new crawler restrictions.
      assert.ok(text.startsWith('User-agent: *\nAllow: /\n'));
      assert.ok(!text.includes('Disallow:'));
    } else {
      assert.ok(text.startsWith('User-agent: *\nDisallow: /\nAllow: /$\nAllow: /sitemap.xml$\n'));
      assert.ok(text.includes('User-agent: GPTBot\nUser-agent: ClaudeBot\nUser-agent: Google-Extended\nUser-agent: Applebot-Extended\nUser-agent: CCBot\nUser-agent: Amazonbot\nUser-agent: meta-externalagent\nDisallow: /\n'));
      assert.ok(!text.includes('Allow: /\n'));
    }
    const sitemap = await worker.fetch(new Request(`https://${host}/sitemap.xml`), env);
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.headers.get('content-type'), /^application\/xml/);
    const xml = await sitemap.text();
    const canonicalPath = host.startsWith('docs.') ? '/query' : '/';
    assert.ok(xml.includes(`<loc>https://${canonicalHost}${canonicalPath}</loc>`));
    assert.equal((xml.match(/<loc>/g) || []).length, 1);
    assert.ok(!xml.includes('go.snkisk.com'));
    assert.ok(!/manage|admin|key=|target_url/.test(xml));
  });
}
