import type { Metadata } from 'next';
import { brand, type Locale } from '@/config/brand';
export function pageMetadata(locale: Locale, path: string, title: string, description: string): Metadata {
  const url = brand.siteUrl ? `${brand.siteUrl}/${locale}/${path}${path ? '/' : ''}` : undefined;
  return { title, description, alternates: url ? { canonical: url, languages: Object.fromEntries(brand.locales.map(l => [l, `${brand.siteUrl}/${l}/${path}${path ? '/' : ''}`])) } : undefined,
    openGraph: { title: `${title} · Inkatoys`, description, type: 'website', locale: locale === 'uk' ? 'uk_UA' : 'en_GB', ...(url ? { url } : {}) } };
}
