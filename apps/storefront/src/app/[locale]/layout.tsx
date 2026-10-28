import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { brand, isLocale } from '@/config/brand';
import { Header, Footer } from '@/components/site-shell';
import '../globals.css';
export const dynamicParams = false;
export function generateStaticParams() { return brand.locales.map(locale => ({ locale })); }
export const metadata: Metadata = { title: { default: 'Inkatoys — м’які іграшки з характером', template: '%s · Inkatoys' }, description: 'М’які іграшки Inkatoys від Dream Group Toys. Каталог для партнерів.', robots: { index: !!brand.siteUrl, follow: !!brand.siteUrl }, icons: { icon: '/favicon.svg' } };
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{locale:string}> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  const theme = { '--ink': brand.theme.ink, '--accent': brand.theme.accent, '--lilac': brand.theme.lilac, '--paper': brand.theme.paper } as React.CSSProperties;
  return <html lang={locale} data-scroll-behavior="smooth"><body style={theme}><a className="skip-link" href="#main">{locale==='uk'?'До вмісту':'Skip to content'}</a><Header locale={locale}/>{children}<Footer locale={locale}/></body></html>;
}
