import Link from 'next/link';
import { notFound } from 'next/navigation';
import { brand, isLocale } from '@/config/brand';
import { getProduct, shortName } from '@/lib/catalog';
import { t } from '@/lib/i18n';
import { pageMetadata } from '@/lib/seo';
import { ArrowUpRight, ArrowRight, Flower, Heart, Package } from '@/components/icons';
import { ProductCard } from '@/components/product-card';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}) {const {locale}=await params;return isLocale(locale)?pageMetadata(locale,'',locale==='uk'?'М’які іграшки з характером':'Soft toys. Big feelings.',t(locale).heroDescription):{};}
export default async function Home({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;if(!isLocale(locale))notFound();const d=t(locale);
  const heroes=brand.heroIds.map(getProduct).filter(p=>!!p), featured=brand.featuredIds.map(getProduct).filter(p=>!!p);
  return <main id="main"><section className="hero wrap"><div className="hero-copy"><h1>{d.heroLine1}<br/><span className="hero-underlined">{d.heroLine2}<svg viewBox="0 0 550 24" fill="none" aria-hidden="true"><path d="M5 17Q230-6 545 13M40 23Q270 3 510 21" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg></span></h1><p>{d.heroDescription}</p><div className="hero-actions"><Link href={`/${locale}/catalog/`} className="button button-dark">{d.explore}<ArrowUpRight size={19}/></Link><Link href={`/${locale}/partners/`} className="hero-secondary">{d.partners}<ArrowRight size={18}/></Link></div></div>
    <div className="hero-stage"><div className="hero-orbit"/><span className="hero-top-note">{locale==='uk'?'Обережно: викликають усмішку':'Warning: may cause smiles'}</span><Flower className="hero-flower"/><span className="hero-sparkle sparkle-one">✦</span><span className="hero-sparkle sparkle-two">✧</span><div className="hero-sticker">100%<br/><span>{locale==='uk'?'характеру':'personality'}</span></div><div className="hero-toys">{heroes.map((p,i)=><Link className={`hero-toy hero-toy-${i}`} key={p.id} href={`/${locale}/products/${p.id}/`} aria-label={p.name}><img src={p.images[0]?.src} alt={p.name} width="600" height="600" fetchPriority={i===0?'high':'auto'}/><span className="toy-caption" lang="uk">{shortName(p.name)}<ArrowUpRight size={13}/></span></Link>)}</div></div>
    </section>
    <div className="ticker" aria-hidden="true"><div className="ticker-track">{[0,1].map(group=><div className="ticker-group" key={group}>{Array.from({length:4},(_,i)=><span key={i}>{locale==='uk'?'ДРУЗІ ДЛЯ ВЕЛИКИХ І МАЛЕНЬКИХ':'LITTLE FRIENDS. BIG FEELINGS.'}<Flower/>{locale==='uk'?'ОБІЙМИ БЕЗ ПРИВОДУ':'A HUG FOR EVERY DAY'}<Flower/></span>)}</div>)}</div></div>
    <section className="featured-section wrap"><div className="section-heading"><div><h2>{d.featured}<span className="heading-doodle">✳</span></h2></div><Link href={`/${locale}/catalog/`} className="text-link">{d.all}<ArrowUpRight size={19}/></Link></div><div className="product-grid">{featured.map((p,i)=><ProductCard product={p} locale={locale} index={i} key={p.id}/>)}</div></section>
    <section className="brand-story wrap"><div className="story-art"><div className="story-art-circle"/>{getProduct('94805')?.images[0]&&<img src={getProduct('94805')!.images[0].src} alt="Ведмідь Міка" width="650" height="650" loading="lazy"/>}<span className="handwritten">{locale==='uk'?'Привіт, будемо дружити?':'Hey, let’s be friends!'}</span><Flower/></div><div className="story-copy"><h2>{d.aboutHeading}</h2><p>{d.aboutDescription}</p><Link className="text-link" href={`/${locale}/about/`}>{d.about}<ArrowUpRight size={19}/></Link></div></section>
    <section className="partner-section wrap"><div className="partner-callout"><div><span className="eyebrow">{d.partnerEyebrow}</span><h2>{d.partnerHeading}</h2><p>{d.partnerDescription}</p><Link className="button button-dark" href={`/${locale}/partners/`}>{d.partnerButton}<ArrowUpRight size={18}/></Link></div><div className="partner-steps">{d.partnerSteps.map((step,i)=><div key={step}><span>0{i+1}</span><p>{step}</p>{i===0?<Heart/>:i===1?<Package/>:<ArrowUpRight/>}</div>)}<span className="partner-handwritten">let’s make someone smile :)</span></div></div></section>
    
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'Organization',name:'Inkatoys',parentOrganization:{'@type':'Organization',name:'Dream Group Toys'},...(brand.siteUrl?{url:brand.siteUrl}:{})}).replace(/</g,'\\u003c')}}/>
  </main>;
}
