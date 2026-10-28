import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_FEED_URL = 'https://dream-group-toys.com.ua/export_xml_dgt/five_brands.xml';
const MAX_FEED_BYTES = 10 * 1024 * 1024;

export async function loadFeed(options: {
  url?: string; file?: string; root?: string; fetcher?: typeof fetch;
} = {}): Promise<{ xml: string; source: string }> {
  // Offline fixtures are an explicit opt-in, never a silent network-error fallback.
  if (options.file) {
    const filename = path.resolve(options.root || process.cwd(), options.file);
    if ((await stat(filename)).size > MAX_FEED_BYTES) throw new Error('XML feed exceeds 10 MB');
    return { xml: await readFile(filename, 'utf8'), source: `file:${options.file}` };
  }
  const url = options.url || DEFAULT_FEED_URL;
  if (new URL(url).protocol !== 'https:') throw new Error('Feed URL must use HTTPS');
  const response = await (options.fetcher || fetch)(url, {
    headers: { Accept: 'application/xml, text/xml;q=0.9, */*;q=0.5' },
    cache: 'no-store', signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Feed download failed: HTTP ${response.status}`);
  if (!response.body) throw new Error('Feed download returned an empty body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_FEED_BYTES) { await reader.cancel(); throw new Error('XML feed exceeds 10 MB'); }
    chunks.push(value);
  }
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  if (!xml.trim()) throw new Error('Feed download returned an empty XML');
  return { xml, source: url };
}
