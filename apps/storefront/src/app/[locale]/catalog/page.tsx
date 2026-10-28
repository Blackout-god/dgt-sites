import { notFound } from 'next/navigation';
import { isLocale } from '@/config/brand';
import { products } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { CatalogClient } from '@/components/catalog-client';
import { Flower } from '@/components/icons';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return isLocale(locale)?pageMetadata(locale,'catalog',t(locale).catalog,t(locale).catalogDescription):{};}
export default async function CatalogPage({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();const d=t(locale);return <main id="main" className="wrap catalog-page"><div className="catalog-heading"><div><span className="eyebrow">INKATOYS COLLECTION</span><h1>{d.catalogHeading}</h1><p>{d.catalogDescription}</p></div><Flower/></div><CatalogClient products={products} locale={locale}/></main>;}
