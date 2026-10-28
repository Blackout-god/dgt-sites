// Brand identity and curated layout choices live here, separately from catalog data.
// A second brand gets its own config and its own Cloudflare Pages project.
export const brand = {
  id: 'INKATOYS', name: 'Inkatoys', group: 'Dream Group Toys',
  locales: ['uk', 'en'] as const,
  theme: { ink: '#203c32', accent: '#d2ed77', lilac: '#d9d0ed', paper: '#faf9f3' },
  featuredIds: ['95098', '95911', '96030', '94805', '94756', '95092', '94850', '96453'],
  heroIds: ['95098', '96030', '95911'],
  // Set after the client supplies a confirmed domain. Never publish localhost as canonical.
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  hubUrl: process.env.NEXT_PUBLIC_HUB_URL || (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '' : 'http://localhost:8787'),
};
export type Locale = typeof brand.locales[number];
export function isLocale(value: string): value is Locale { return brand.locales.includes(value as Locale); }
