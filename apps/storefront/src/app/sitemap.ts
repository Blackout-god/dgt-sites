import type { MetadataRoute } from 'next';
import { brand } from '@/config/brand';
import { products } from '@/lib/catalog';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{if(!brand.siteUrl)return [];const paths=['','catalog/','about/','partners/','contact/','privacy/',...products.map(p=>`products/${p.id}/`)];return brand.locales.flatMap(locale=>paths.map(path=>({url:`${brand.siteUrl}/${locale}/${path}`,alternates:{languages:Object.fromEntries(brand.locales.map(l=>[l,`${brand.siteUrl}/${l}/${path}`]))}})));}
