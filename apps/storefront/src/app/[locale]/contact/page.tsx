import { notFound } from 'next/navigation';
import { isLocale } from '@/config/brand';
import { products } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { LeadForm } from '@/components/lead-form';
import { Flower } from '@/components/icons';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return isLocale(locale)?pageMetadata(locale,'contact',t(locale).contact,t(locale).contactDescription):{};}
export default async function Contact({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();const d=t(locale);return <main id="main" className="wrap contact-page"><div className="contact-copy"><span className="eyebrow">LET’S SAY HELLO</span><h1>{d.contactHeading}</h1><p>{d.contactDescription}</p><Flower/><span className="handwritten">your next good thing starts here.</span></div><LeadForm locale={locale} productOptions={products.map(({id,name,sku})=>({id,name,sku}))}/></main>;}
