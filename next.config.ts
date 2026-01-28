import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Externalize pdf-parse for server-side usage (it uses native Node.js APIs)
  serverExternalPackages: ['pdf-parse'],
};

export default withNextIntl(nextConfig);
