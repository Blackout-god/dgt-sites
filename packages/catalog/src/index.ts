import { XMLParser, XMLValidator } from 'fast-xml-parser';
import he from 'he';

export type Attribute = { name: string; value: string; unit: string | null };
export type ProductImage = { key: string; src: string; sourceUrl: string; filename: string; contentType?: string; hash?: string; etag?: string; lastModified?: string };
export type Product = {
  id: string; brand: string; sku: string; code: string; ean: string;
  name: string; description: string; available: boolean; visible: boolean;
  category: string | null; series: string | null; age: { min: number | null; max: number | null };
  attributes: Attribute[]; images: ProductImage[]; warnings: string[]; sourceHash: string;
};
export type Snapshot = { brand: string; sourceDate: string; importedAt: string; products: Product[]; warnings: string[] };
const array = <T>(value: T | T[] | undefined): T[] => value == null ? [] : Array.isArray(value) ? value : [value];
export function cleanText(value: unknown): string {
  let text = String(value ?? '');
  for (let i = 0; i < 3; i++) { const decoded = he.decode(text); if (decoded === text) break; text = decoded; }
  return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(?:p|div|li)>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
}
export function validEAN(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const sum = [...value.slice(0, 12)].reduce((sum, digit, index) => sum + Number(digit) * (index % 2 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(value[12]);
}
export function parseAge(value: string): Product['age'] {
  const numbers = value.match(/\d+/g)?.map(Number) ?? [];
  if (!numbers.length) return { min: null, max: null };
  const open = /(?:від|от|from|\+)\s*\d*|\d+\s*\+|\d+\s*(?:років|years)?\s*(?:і|и)\s*(?:старше|більше)/i.test(value);
  return { min: Math.min(...numbers), max: open ? null : Math.max(...numbers) };
}
export function parseDimensions(value: string): number[] | null {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)$/i);
  return match ? match.slice(1).map(v => Number(v.replace(',', '.'))) : null;
}
export async function hashText(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export function validateImport(previous: { id: string; brand: string }[], incoming: { id: string; brand: string }[]) {
  if (!incoming.length) throw new Error('Порожній фід: публікацію скасовано');
  const ids = new Set<string>();
  for (const item of incoming) { if (ids.has(item.id)) throw new Error(`Duplicate offer id: ${item.id}`); ids.add(item.id); }
  for (const brand of new Set(previous.map(p => p.brand))) {
    const before = previous.filter(p => p.brand === brand);
    const retained = before.filter(p => incoming.some(n => n.id === p.id && n.brand === brand));
    if ((before.length - retained.length) / before.length > .3) throw new Error(`Зникло понад 30% товарів ${brand}: публікацію скасовано`);
  }
}
export async function parseFeed(xml: string): Promise<Snapshot> {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`Invalid XML: ${valid.err.msg}`);
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, trimValues: true, processEntities: false }).parse(xml);
  const catalog = parsed.yml_catalog;
  if (!catalog?.shop?.offers) throw new Error('Missing yml_catalog/shop/offers');
  const products: Product[] = [];
  const legacy: Record<string, string> = { item_dimensions: 'Розміри іграшки (В×Ш×Г)', box_dimensions: 'Розміри короба (В×Ш×Г)', box_type: 'Тип упаковки', box_volume: "Об’єм короба", items_in_box: 'Кількість в упаковці', item_weight: 'Вага іграшки', box_weight: 'Вага короба' };
  for (const offer of array<Record<string, any>>(catalog.shop.offers.offer)) {
    const id = String(offer['@_id'] ?? '').trim();
    if (!id || !cleanText(offer.name) || !cleanText(offer.vendor)) throw new Error('Offer requires id, name and vendor');
    const ean = cleanText(offer.barcode), warnings: string[] = [];
    if (!validEAN(ean)) warnings.push('EAN відсутній або некоректний');
    const attributes: Attribute[] = array<Record<string, any>>(offer.param).map(p => ({ name: cleanText(p['@_name']), value: cleanText(p['#text']), unit: cleanText(p['@_unit']) || null })).filter(p => p.name && p.value);
    for (const [key, name] of Object.entries(legacy)) {
      if (!offer[key]) continue;
      attributes.push({ name, value: cleanText(offer[key]), unit: null });
      if (/weight|dimensions|volume/.test(key)) warnings.push(`Не вказано одиниці: ${key}`);
    }
    const sku = cleanText(offer.item_number) || id;
    const images: ProductImage[] = array<string>(offer.picture).filter(Boolean).map((url, index) => {
      const sourceUrl = cleanText(url);
      const parsedUrl = new URL(sourceUrl);
      if (parsedUrl.protocol !== 'https:') throw new Error(`Image must use HTTPS: ${id}`);
      const ext = parsedUrl.pathname.match(/\.(png|jpe?g|webp)$/i)?.[1].toLowerCase() || 'jpg';
      return { key: `originals/${id}/${index + 1}.${ext}`, src: `/media/${id}/${index + 1}.webp`, sourceUrl, filename: `${validEAN(ean) ? ean : sku.replace(/[^a-zA-Z0-9_-]/g, '_')}_${index + 1}.${ext}` };
    });
    if (!images.length) warnings.push('Немає фото');
    const description = cleanText(offer.description);
    if (!description) warnings.push('Немає опису');
    const age = attributes.find(a => /вік|age/i.test(a.name))?.value ?? '';
    products.push({ id, brand: cleanText(offer.vendor), sku, code: cleanText(offer.code), ean, name: cleanText(offer.name), description,
      available: String(offer['@_available']) === 'true', visible: true, category: cleanText(offer.categoryId) || null,
      series: cleanText(offer.series) || attributes.find(a => /серія|series/i.test(a.name))?.value || null,
      age: parseAge(age), attributes, images, warnings, sourceHash: await hashText(JSON.stringify(offer)) });
  }
  validateImport([], products);
  return { brand: 'INKATOYS', sourceDate: String(catalog['@_date'] ?? ''), importedAt: new Date().toISOString(), products, warnings: ['Одиниці старих полів не підтверджені; значення збережено без перерахунку.', 'Переклади товарів ще не надані.'] };
}
