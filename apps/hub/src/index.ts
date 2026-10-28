import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { Zip, ZipPassThrough } from 'fflate';
import { validateImport, type Product, type Snapshot } from '@dream/catalog';

type Bindings = {
  DB: D1Database; MEDIA: R2Bucket; ALLOWED_ORIGINS: string; BRAND: string;
  LOCAL_DEVELOPMENT?: string; ADMIN_TOKEN?: string; PARTNER_API_KEY?: string;
};
const app = new Hono<{ Bindings: Bindings }>();
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  return cors({ origin: origin => c.env.ALLOWED_ORIGINS.split(',').includes(origin) ? origin : '', allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Content-Hash'], exposeHeaders: ['Content-Disposition'] })(c, next);
});
app.get('/health', async c => {
  await c.env.DB.prepare('SELECT 1').first();
  return c.json({ ok: true, mode: c.env.LOCAL_DEVELOPMENT === 'true' ? 'local' : 'production' });
});
app.use('/internal/*', async (c, next) => {
  // Local tooling only. Production administration must use Cloudflare Access.
  if (c.env.LOCAL_DEVELOPMENT !== 'true') return c.json({ error: 'Local import is disabled' }, 403);
  if (!c.env.ADMIN_TOKEN || c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});
app.put('/internal/media/*', bodyLimit({ maxSize: 12 * 1024 * 1024 }), async c => {
  const key = c.req.path.slice('/internal/media/'.length);
  if (!/^originals\/[\w-]+\/\d+\.(png|jpe?g|webp)$/.test(key)) return c.json({ error: 'Invalid media key' }, 400);
  const hash = c.req.header('X-Content-Hash');
  const existing = await c.env.MEDIA.head(key);
  if (hash && existing?.customMetadata?.hash === hash) return c.json({ ok: true, unchanged: true });
  await c.env.MEDIA.put(key, c.req.raw.body, { httpMetadata: { contentType: c.req.header('Content-Type') || 'application/octet-stream' }, customMetadata: { hash: hash || '' } });
  return c.json({ ok: true });
});
app.post('/internal/import', bodyLimit({ maxSize: 4 * 1024 * 1024 }), async c => {
  const runId = crypto.randomUUID(), startedAt = new Date().toISOString();
  try {
    const snapshot = await c.req.json<Snapshot>();
    if (!Array.isArray(snapshot.products) || snapshot.brand !== c.env.BRAND || snapshot.products.some(p => p.brand !== snapshot.brand || typeof p.id !== 'string' || !p.id || typeof p.sourceHash !== 'string' || !p.name || !Array.isArray(p.images))) throw new Error('Invalid catalog snapshot');
    const previous = await c.env.DB.prepare('SELECT id, brand FROM products WHERE visible=1 AND brand=?').bind(snapshot.brand).all<{ id: string; brand: string }>();
    validateImport(previous.results, snapshot.products);
    const statements: D1PreparedStatement[] = [];
    for (const product of snapshot.products) {
      statements.push(c.env.DB.prepare(`INSERT INTO products(id,brand,sku,ean,source_hash,data_json,visible,updated_at) VALUES(?,?,?,?,?,?,1,?)
        ON CONFLICT(id) DO UPDATE SET brand=excluded.brand,sku=excluded.sku,ean=excluded.ean,source_hash=excluded.source_hash,data_json=excluded.data_json,visible=1,updated_at=excluded.updated_at
        WHERE products.source_hash<>excluded.source_hash OR products.data_json<>excluded.data_json OR products.visible=0`).bind(product.id, product.brand, product.sku, product.ean, product.sourceHash, JSON.stringify(product), startedAt));
    }
    // One statement per previous missing ID avoids SQLite bind-variable limits.
    const nextIds = new Set(snapshot.products.map(p => p.id));
    for (const p of previous.results) if (!nextIds.has(p.id)) statements.push(c.env.DB.prepare('UPDATE products SET visible=0, updated_at=? WHERE id=?').bind(startedAt, p.id));
    statements.push(c.env.DB.prepare('INSERT INTO import_runs(id,started_at,finished_at,status,product_count,message) VALUES(?,?,?,?,?,?)').bind(runId, startedAt, new Date().toISOString(), 'success', snapshot.products.length, `Source: ${snapshot.sourceDate}`));
    await c.env.DB.batch(statements);
    return c.json({ ok: true, id: runId, products: snapshot.products.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    await c.env.DB.prepare('INSERT INTO import_runs(id,started_at,finished_at,status,message) VALUES(?,?,?,?,?)').bind(runId, startedAt, new Date().toISOString(), 'failed', message).run();
    return c.json({ error: message }, 400);
  }
});
app.get('/internal/status', async c => {
  const runs = await c.env.DB.prepare('SELECT * FROM import_runs ORDER BY started_at DESC LIMIT 10').all();
  const leads = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM leads').first();
  return c.json({ runs: runs.results, leads });
});
app.get('/internal/build', async c => {
  const rows=await c.env.DB.prepare('SELECT data_json FROM products WHERE brand=? AND visible=1 ORDER BY rowid').bind(c.env.BRAND).all<{data_json:string}>();
  const run=await c.env.DB.prepare("SELECT finished_at,message FROM import_runs WHERE status='success' ORDER BY started_at DESC LIMIT 1").first<{finished_at:string;message:string}>();
  return c.json({brand:c.env.BRAND,sourceDate:run?.message?.replace(/^Source: /,'')||'',importedAt:run?.finished_at||'',products:rows.results.map(r=>JSON.parse(r.data_json)),warnings:[]});
});
app.use('/api/v1/*', async (c, next) => {
  const key = c.req.header('X-API-Key') || c.req.header('Authorization')?.replace(/^Bearer /, '') || c.req.query('key');
  if (!c.env.PARTNER_API_KEY || key !== c.env.PARTNER_API_KEY) return c.json({ error: 'A valid partner key is required' }, 401);
  c.header('Cache-Control', 'no-store');
  await next();
});
function publicProduct(product: Product) {
  return { ...product, images: product.images.map(({ key, src, filename }) => ({ key, src, filename })), warnings: undefined, sourceHash: undefined };
}
app.get('/api/v1/products', async c => {
  const requestedBrand = c.req.query('brand') || c.env.BRAND;
  const page = Math.max(1, Math.floor(Number(c.req.query('page')) || 1));
  const since = c.req.query('updated_since');
  if (since && Number.isNaN(Date.parse(since))) return c.json({ error: 'Invalid updated_since' }, 400);
  if (c.req.query('lang') && c.req.query('lang') !== 'uk') return c.json({ error: 'Only source language uk is available in this pilot' }, 400);
  const conditions = 'brand=? AND visible=1' + (since ? ' AND updated_at>?' : '');
  const params = since ? [requestedBrand, new Date(since).toISOString()] : [requestedBrand];
  const rows = await c.env.DB.prepare(`SELECT data_json,updated_at FROM products WHERE ${conditions} ORDER BY id LIMIT 50 OFFSET ?`).bind(...params, (page - 1) * 50).all<{ data_json: string; updated_at: string }>();
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS count FROM products WHERE ${conditions}`).bind(...params).first<{ count: number }>();
  return c.json({ version: 1, lang: 'uk', page, page_size: 50, total: total?.count || 0, products: rows.results.map(row => ({ ...publicProduct(JSON.parse(row.data_json)), updated_at: row.updated_at })) });
});
app.get('/api/v1/products/:id', async c => {
  const row = await c.env.DB.prepare('SELECT data_json,updated_at FROM products WHERE id=? AND visible=1 AND brand=?').bind(c.req.param('id'), c.env.BRAND).first<{ data_json: string; updated_at: string }>();
  return row ? c.json({ ...publicProduct(JSON.parse(row.data_json)), updated_at: row.updated_at }) : c.json({ error: 'Not found' }, 404);
});
app.get('/media/*', async c => {
  const key = c.req.path.slice('/media/'.length);
  if (!/^originals\/[\w-]+\/\d+\.(png|jpe?g|webp)$/.test(key)) return c.notFound();
  const media = await c.env.MEDIA.get(key);
  if (!media) return c.notFound();
  const headers = new Headers({ 'Cache-Control': 'public, max-age=300', 'ETag': media.httpEtag, 'X-Content-Type-Options': 'nosniff' });
  media.writeHttpMetadata(headers);
  if (c.req.query('download') === '1') {
    const id = key.split('/')[1];
    const row = await c.env.DB.prepare('SELECT data_json FROM products WHERE id=? AND visible=1').bind(id).first<{ data_json: string }>();
    const filename = row ? (JSON.parse(row.data_json) as Product).images.find(i => i.key === key)?.filename : null;
    if (filename) headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  }
  return new Response(media.body, { headers });
});
app.get('/downloads/:id/photos.zip', async c => {
  const row = await c.env.DB.prepare('SELECT data_json FROM products WHERE id=? AND brand=? AND visible=1').bind(c.req.param('id'), c.env.BRAND).first<{ data_json: string }>();
  if (!row) return c.notFound();
  const product = JSON.parse(row.data_json) as Product;
  if (!product.images.length) return c.json({ error: 'No photos' }, 404);
  // Verify all objects before starting the streaming response.
  const objects = await Promise.all(product.images.map(i => c.env.MEDIA.get(i.key)));
  if (objects.some(o => !o)) return c.json({ error: 'Photo storage is incomplete' }, 503);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let ended = false;
      const zip = new Zip((error, chunk, final) => {
        if (ended) return;
        if (error) { ended = true; controller.error(error); return; }
        controller.enqueue(chunk);
        if (final) { ended = true; controller.close(); }
      });
      try {
        for (let i = 0; i < objects.length; i++) {
          const entry = new ZipPassThrough(product.images[i].filename);
          zip.add(entry);
          const reader = objects[i]!.body.getReader();
          for (;;) { const { done, value } = await reader.read(); if (done) break; entry.push(value); }
          entry.push(new Uint8Array(), true);
        }
        zip.end();
      } catch (error) { zip.terminate(); if (!ended) controller.error(error); }
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${product.ean || product.id}_photos.zip"`, 'Cache-Control': 'no-store' } });
});
app.post('/leads', bodyLimit({ maxSize: 20000 }), async c => {
  const origin = c.req.header('Origin');
  if (!origin || !c.env.ALLOWED_ORIGINS.split(',').includes(origin)) return c.json({ error: 'Origin not allowed' }, 403);
  if (c.env.LOCAL_DEVELOPMENT !== 'true') return c.json({ error: 'Production lead delivery is not configured' }, 503);
  let body: Record<string, unknown>;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const get = (key: string, max: number) => typeof body[key] === 'string' ? (body[key] as string).trim().slice(0, max) : '';
  const name = get('name', 150), email = get('email', 254), company = get('company', 200), country = get('country', 100), message = get('message', 4000), productId = get('productId', 80);
  if (get('website', 100)) return c.json({ ok: true }); // Honeypot.
  if (!name || !company || !country || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true) return c.json({ error: 'Please complete required fields and consent' }, 400);
  if (productId && !await c.env.DB.prepare('SELECT id FROM products WHERE id=? AND brand=? AND visible=1').bind(productId, c.env.BRAND).first()) return c.json({ error: 'Unknown product' }, 400);
  const window = Math.floor(Date.now() / 3600000);
  const ip = c.req.header('CF-Connecting-IP') || 'local';
  const key = `leads:${ip}:${window}`;
  const rate = await c.env.DB.prepare('INSERT INTO rate_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, window).first<{ count: number }>();
  if ((rate?.count || 0) > 10) return c.json({ error: 'Too many requests. Please try later.' }, 429);
  await c.env.DB.prepare('DELETE FROM rate_limits WHERE window_start<?').bind(window - 24).run();
  const id = crypto.randomUUID(), now = new Date().toISOString();
  await c.env.DB.prepare('INSERT INTO leads(id,brand,name,email,company,country,message,product_id,consent_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id, c.env.BRAND, name, email, company, country, message, productId || null, now, now).run();
  return c.json({ ok: true, id, delivery: 'local-storage' }, 201);
});
app.onError((error, c) => { console.error('Hub request failed:', error.message); return c.json({ error: 'Hub request failed' }, 500); });
export default app;
