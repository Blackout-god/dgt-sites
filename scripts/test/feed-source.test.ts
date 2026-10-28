import test from 'node:test';
import assert from 'node:assert/strict';
import { loadFeed, DEFAULT_FEED_URL } from '../lib/feed-source';

test('online feed is the default, and failed requests do not silently read the fixture', async () => {
  let requested = '';
  const fetcher = (async (url: string | URL | Request) => { requested = String(url); return new Response('<yml_catalog/>'); }) as typeof fetch;
  const result = await loadFeed({ fetcher });
  assert.equal(requested, DEFAULT_FEED_URL);
  assert.equal(result.source, DEFAULT_FEED_URL);
  assert.equal(result.xml, '<yml_catalog/>');
  await assert.rejects(loadFeed({ fetcher: (async () => new Response('', { status: 503 })) as typeof fetch }), /HTTP 503/);
});
test('local XML is used only through explicit file mode', async () => {
  const result = await loadFeed({ file: 'five_brands.xml', fetcher: (async () => { throw new Error('Network must not be used'); }) as typeof fetch });
  assert.match(result.xml, /yml_catalog/);
  assert.equal(result.source, 'file:five_brands.xml');
});
test('blank, oversized and non-HTTPS sources are rejected', async () => {
  await assert.rejects(loadFeed({ fetcher: (async () => new Response('  ')) as typeof fetch }), /empty XML/);
  await assert.rejects(loadFeed({ fetcher: (async () => new Response('x'.repeat(10 * 1024 * 1024 + 1))) as typeof fetch }), /exceeds/);
  await assert.rejects(loadFeed({ url: 'http://example.test/feed.xml' }), /HTTPS/);
});
