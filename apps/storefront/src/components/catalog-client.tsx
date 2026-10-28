'use client';
import { useMemo, useState } from 'react';
import type { Product } from '@dream/catalog';
import type { Locale } from '@/config/brand';
import { t } from '@/lib/i18n';
import { Search, X, SlidersHorizontal, Flower } from './icons';
import { ProductCard } from './product-card';
export function CatalogClient({ products, locale }: { products: Product[]; locale: Locale }) {
  const d = t(locale), [query, setQuery] = useState(''), [stock, setStock] = useState('all'), [age, setAge] = useState('all'), [sort, setSort] = useState('original'), [limit, setLimit] = useState(20);
  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase().trim();
    const result = products.filter(p => (!q || [p.name, p.sku, p.ean].some(v => v.toLocaleLowerCase().includes(q))) && (stock === 'all' || p.available === (stock === 'yes')) && (age === 'all' || p.age.min != null && Number(age) >= p.age.min && (p.age.max == null || Number(age) <= p.age.max)));
    if (sort !== 'original') result.sort((a,b) => a.name.localeCompare(b.name, 'uk') * (sort === 'asc' ? 1 : -1));
    return result;
  }, [products, query, stock, age, sort]);
  const changed = query || stock !== 'all' || age !== 'all';
  const n=filtered.length;
  const countWord=locale==='en'?(n===1?'toy':'toys'):(n%100>=11&&n%100<=14?'іграшок':n%10===1?'іграшка':n%10>=2&&n%10<=4?'іграшки':'іграшок');
  function reset() { setQuery(''); setStock('all'); setAge('all'); setLimit(20); }
  return <>
    <div className="catalog-toolbar"><div className="search-field"><Search size={20}/><input aria-label={d.search} placeholder={d.search} value={query} onChange={e => { setQuery(e.target.value); setLimit(20); }}/>{query && <button aria-label="Clear search" className="icon-button" onClick={() => setQuery('')}><X size={18}/></button>}</div>
      <label className="select-field"><span>{d.stock}</span><select value={stock} onChange={e => { setStock(e.target.value); setLimit(20); }}><option value="all">{d.anyStock}</option><option value="yes">{d.available}</option><option value="no">{d.unavailable}</option></select></label>
      <label className="select-field"><span>{d.age}</span><select value={age} onChange={e => { setAge(e.target.value); setLimit(20); }}><option value="all">{d.anyAge}</option>{[3,6,12,18].map(n => <option key={n} value={n}>{n}{locale === 'uk' ? ' років' : ' years'}</option>)}</select></label>
    </div>
    <div className="catalog-results-bar"><span aria-live="polite">{filtered.length} {countWord}</span>{changed && <button className="text-button" onClick={reset}>{d.reset}<X size={14}/></button>}<label className="sort-control"><SlidersHorizontal size={15}/><span className="sr-only">{d.sort}</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="original">{d.originalOrder}</option><option value="asc">{d.nameAsc}</option><option value="desc">{d.nameDesc}</option></select></label></div>
    {locale === 'en' && <p className="translation-note">{d.sourceFallback}</p>}
    {filtered.length ? <><div className="product-grid catalog-grid">{filtered.slice(0,limit).map((p,i) => <ProductCard key={p.id} product={p} locale={locale} index={i}/>)}</div>{limit < filtered.length && <div className="load-more"><button className="button button-outline" onClick={() => setLimit(limit + 20)}>{locale === 'uk' ? 'Ще більше друзів' : 'More friends'} <span>+{Math.min(20, filtered.length-limit)}</span></button></div>}</> : <div className="empty-state"><Flower/><h2>{d.noResults}</h2><p>{d.noResultsDescription}</p><button className="button button-dark" onClick={reset}>{d.reset}</button></div>}
  </>;
}
