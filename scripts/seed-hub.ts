import { readFile } from 'node:fs/promises';
import { type Snapshot } from '@dream/catalog';
const vars = await readFile('apps/hub/.dev.vars', 'utf8');
const token = vars.match(/^ADMIN_TOKEN="(.+)"$/m)?.[1];
if (!token) throw new Error('Run npm run setup:local first');
const base = process.env.HUB_INTERNAL_URL || 'http://127.0.0.1:8787';
const snapshot: Snapshot = JSON.parse(await readFile('.data/catalog.json', 'utf8'));
const images = snapshot.products.flatMap(p => p.images);
let index = 0, done = 0;
async function upload() {
  while (index < images.length) {
    const image = images[index++];
    const body = await readFile(`.data/${image.key}`);
    const response = await fetch(`${base}/internal/media/${image.key}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': image.contentType || 'image/jpeg', 'X-Content-Hash': image.hash || '' }, body });
    if (!response.ok) throw new Error(`Media upload ${image.key}: ${response.status} ${await response.text()}`);
    done++;
    if (done % 60 === 0) console.log(`R2: ${done}/${images.length}`);
  }
}
await Promise.all(Array.from({ length: 4 }, upload));
const response = await fetch(`${base}/internal/import`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(snapshot) });
if (!response.ok) throw new Error(`Import: ${response.status} ${await response.text()}`);
console.log('Hub import:', await response.text());
