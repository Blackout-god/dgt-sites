import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'export', trailingSlash: true, images: { unoptimized: true },
  transpilePackages: ['@dream/catalog'],
  experimental: { globalNotFound: true },
  turbopack: { root: new URL('../..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') }
};
export default config;
