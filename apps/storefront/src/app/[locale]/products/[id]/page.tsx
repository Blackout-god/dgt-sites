import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brand, isLocale } from '@/config/brand';
import { products, getProduct, shortName } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { ProductDetail } from '@/components/product-detail';
import { ProductCard } from '@/components/product-card';
import { ArrowLeft } from '@/components/icons';
export const dynamicParams=false;
export function generateStaticParams(){return products.map(p=>({id:p.id}));}
export async function generateMetadata({params}:{params:Promise<{locale:string;id:string}>}){const {locale,id}=await params;const p=getProduct(id);return p&&isLocale(locale)?pageMetadata(locale,`products/${id}`,shortName(p.name),p.description.slice(0,160)):{};}
export default async function ProductPage({params}:{params:Promise<{locale:string;id:string}>}){const {locale,id}=await params;const product=getProduct(id);if(!isLocale(locale)||!product)notFound();const d=t(locale);const related=products.filter(p=>p.id!==id&&p.images.length).slice(0,4);const schema={'@context':'https://schema.org','@type':'Product',name:product.name,description:product.description||undefined,sku:product.sku,gtin13:/^\d{13}$/.test(product.ean)?product.ean:undefined,brand:{'@type':'Brand',name:brand.name},...(brand.siteUrl?{image:product.images.map(i=>`${brand.siteUrl}${i.src}`),url:`${brand.siteUrl}/${locale}/products/${id}/`}:{})};return <main id="main" className="wrap product-page"><Link className="breadcrumb" href={`/${locale}/catalog/`}><ArrowLeft size={16}/>{d.back}<span>/</span><span lang="uk">{shortName(product.name)}</span></Link><ProductDetail product={product} locale={locale}/><section className="related-section"><div className="section-heading"><h2>{d.related}</h2></div><div className="product-grid">{related.map((p,i)=><ProductCard product={p} locale={locale} index={i} key={p.id}/>)}</div></section><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/></main>;}
