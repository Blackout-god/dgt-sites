import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { parseFeed, hashText, validateImport, type Snapshot } from '@dream/catalog';
import { loadFeed } from './lib/feed-source';

const { xml, source } = await loadFeed({ url: process.env.FEED_URL, file: process.env.FEED_FILE });
const snapshot = await parseFeed(xml);
const brand = process.env.BRAND || 'INKATOYS';
snapshot.brand = brand;
snapshot.products = snapshot.products.filter(p => p.brand.toUpperCase() === brand.toUpperCase());
if (!snapshot.products.length) throw new Error(`No products for ${brand}`);
await mkdir('.data', { recursive: true });
let previous: Snapshot | null = null;
try { previous = JSON.parse(await readFile('.data/catalog.json', 'utf8')); } catch {}
validateImport(previous?.products || [], snapshot.products);
console.log(`Catalog source: ${source}`);
const oldImages = new Map(previous?.products.flatMap(p => p.images).map(i => [i.key, i]) ?? []);
const tasks = snapshot.products.flatMap(product => product.images.map(image => ({ product, image })));
let cursor = 0, completed = 0;
const failed = new Set<string>();
async function download() {
  while (cursor < tasks.length) {
    const { product, image } = tasks[cursor++];
    const original = path.join('.data', image.key);
    const target = path.join('apps/storefront/public', image.src);
    try {
      const old = oldImages.get(image.key);
      let data: Buffer;
      const cached = old?.sourceUrl === image.sourceUrl && !!await stat(original).catch(() => null);
      const headers: Record<string,string> = {};
      if (cached && old?.etag) headers['If-None-Match'] = old.etag;
      if (cached && old?.lastModified) headers['If-Modified-Since'] = old.lastModified;
      const response = await fetch(image.sourceUrl, { headers, signal: AbortSignal.timeout(45000) });
      if (response.status === 304 && cached) {
        data = await readFile(original);
        image.etag = old?.etag;
        image.lastModified = old?.lastModified;
      } else {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        data = Buffer.from(await response.arrayBuffer());
        if (data.byteLength > 12 * 1024 * 1024) throw new Error('Photo exceeds 12 MB');
        await sharp(data).metadata();
        await mkdir(path.dirname(original), { recursive: true });
        await writeFile(original + '.tmp', data);
        await rename(original + '.tmp', original);
        image.etag = response.headers.get('etag') || undefined;
        image.lastModified = response.headers.get('last-modified') || undefined;
      }
      image.hash = await hashText(data.toString('base64'));
      const metadata = await sharp(data).metadata();
      image.contentType = metadata.format === 'png' ? 'image/png' : metadata.format === 'webp' ? 'image/webp' : 'image/jpeg';
      await mkdir(path.dirname(target), { recursive: true });
      if (!await stat(target).catch(() => null) || old?.hash !== image.hash) {
        await sharp(data).rotate().resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(target + '.tmp');
        await rename(target + '.tmp', target);
      }
    } catch (error) {
      failed.add(image.key);
      product.warnings.push(`Не завантажено фото ${image.filename}`);
      console.warn(`${product.id}: ${image.sourceUrl}: ${String(error)}`);
    }
    completed++;
    if (completed % 30 === 0) console.log(`Photos: ${completed}/${tasks.length}`);
  }
}
await Promise.all(Array.from({ length: 6 }, download));
for (const product of snapshot.products) product.images = product.images.filter(i => !failed.has(i.key));
await writeFile('.data/catalog.json.tmp', JSON.stringify(snapshot, null, 2));
await rename('.data/catalog.json.tmp', '.data/catalog.json');
await mkdir('apps/storefront/src/generated', { recursive: true });
await writeFile('apps/storefront/src/generated/catalog.json', JSON.stringify(snapshot));
console.log(`Prepared ${snapshot.products.length} ${brand} products, ${tasks.length - failed.size} local photos. Source: ${snapshot.sourceDate}`);
if (failed.size) console.warn(`${failed.size} images unavailable; see product warnings.`);
