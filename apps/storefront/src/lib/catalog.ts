import type { Snapshot, Product } from '@dream/catalog';
import data from '@/generated/catalog.json';
import { brand } from '@/config/brand';
export const snapshot = data as Snapshot;
export const products: Product[] = snapshot.products.filter(p => p.brand === brand.id && p.visible);
export function getProduct(id: string) { return products.find(p => p.id === id); }
export { shortName } from './product';
