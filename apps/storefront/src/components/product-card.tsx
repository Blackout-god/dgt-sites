import Link from 'next/link';
import type { Product } from '@dream/catalog';
import type { Locale } from '@/config/brand';
import { shortName } from '@/lib/product';
import { t } from '@/lib/i18n';
import { ArrowUpRight } from './icons';
export function ProductCard({ product, locale, index = 0 }: { product: Product; locale: Locale; index?: number }) {
  const d = t(locale);
  return <article className={`product-card tone-${index % 4}`}>
    <Link href={`/${locale}/products/${product.id}/`} className="product-photo" aria-label={product.name}>
      <span className={`stock-pill ${product.available ? '' : 'muted'}`}><i/>{product.available ? d.available : d.unavailable}</span>
      {product.images[0] ? <img src={product.images[0].src} alt={product.name} loading="lazy" width="520" height="520"/> : <div className="image-placeholder"><span>✳</span>{d.noPhoto}</div>}
      <span className="card-arrow"><ArrowUpRight size={22}/></span>
    </Link>
    <div className="product-card-info"><div><h3 lang="uk"><Link href={`/${locale}/products/${product.id}/`}>{shortName(product.name)}</Link></h3></div><span className="age-label">{product.age.min != null ? `${product.age.min}+` : '—'}</span></div>
  </article>;
}
