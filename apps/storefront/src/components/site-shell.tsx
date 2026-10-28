'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Locale } from '@/config/brand';
import { t } from '@/lib/i18n';
import { ArrowUpRight, ChevronDown, Menu, X, Flower } from './icons';
export function Logo() { return <span className="wordmark" aria-label="Inkatoys">inka<span>toys</span><i>✳</i></span>; }
export function Header({ locale }: { locale: Locale }) {
  const d = t(locale), pathname = usePathname(), [open, setOpen] = useState(false);
  const [search,setSearch]=useState('');
  useEffect(()=>setSearch(window.location.search),[pathname]);
  const otherLocale = locale === 'uk' ? 'en' : 'uk';
  const otherPath = pathname.replace(/^\/(uk|en)(?=\/|$)/, `/${otherLocale}`)+search;
  const links = [[d.catalog, 'catalog'], [d.about, 'about'], [d.partners, 'partners']] as const;
  return <>
    <header className="header wrap">
      <Link href={`/${locale}/`} className="logo-link" aria-label="Inkatoys — home" onClick={() => setOpen(false)}><Logo /></Link>
      <nav className="desktop-nav" aria-label={locale === 'uk' ? 'Головна навігація' : 'Main navigation'}>{links.map(([label, slug]) => <Link key={slug} href={`/${locale}/${slug}/`} className={pathname.includes(`/${slug}`) ? 'active' : ''}>{label}</Link>)}</nav>
      <div className="header-actions"><Link className="locale-toggle" href={otherPath} hrefLang={otherLocale} aria-label={locale === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}><span>{locale.toUpperCase()}</span><ChevronDown size={12} aria-hidden="true"/></Link><Link className="button button-dark header-cta" href={`/${locale}/contact/`}>{d.partnerCta}<ArrowUpRight size={16}/></Link><button className="mobile-menu-button icon-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div>
    </header>
    {open && <nav id="mobile-menu" className="mobile-menu wrap" aria-label="Mobile">{links.map(([label, slug]) => <Link key={slug} href={`/${locale}/${slug}/`} onClick={() => setOpen(false)}>{label}<ArrowUpRight size={20}/></Link>)}<Link href={`/${locale}/contact/`} onClick={() => setOpen(false)}>{d.contact}<ArrowUpRight size={20}/></Link></nav>}
  </>;
}
export function Footer({ locale }: { locale: Locale }) {
  const d = t(locale);
  return <footer className="footer"><div className="wrap footer-main"><div><Link href={`/${locale}/`} aria-label="Inkatoys home"><Logo/></Link><p>{d.footerLine}</p><span className="footer-origin">{locale === 'uk' ? 'Бренд родини Dream Group Toys · Україна' : 'Part of Dream Group Toys · Ukraine'}</span></div><nav aria-label="Footer"><Link href={`/${locale}/catalog/`}>{d.catalog}</Link><Link href={`/${locale}/about/`}>{d.about}</Link><Link href={`/${locale}/partners/`}>{d.partners}</Link><Link href={`/${locale}/contact/`}>{d.contact}</Link></nav><Flower className="footer-flower"/></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Inkatoys · Dream Group Toys</span><Link href={`/${locale}/privacy/`}>{d.privacy}</Link></div></footer>;
}
