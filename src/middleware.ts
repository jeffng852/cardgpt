import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import type { NextRequest } from 'next/server';

// Detect locale based on IP geolocation (Vercel deployment headers)
function getLocaleFromRequest(request: NextRequest): string | undefined {
  // Check for existing locale cookie/preference (manual selection takes priority)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale as any)) {
    return cookieLocale;
  }

  // Check if user has already visited (has locale in URL path)
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = routing.locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (pathnameLocale) {
    return pathnameLocale;
  }

  // Detect country from Vercel geo headers
  // https://vercel.com/docs/edge-network/headers#x-vercel-ip-country
  const country = request.headers.get('x-vercel-ip-country');

  // HK, CN, TW = Chinese (zh-HK)
  if (country === 'HK' || country === 'CN' || country === 'TW') {
    return 'zh-HK';
  }

  // Accept-Language header as fallback
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map(lang => {
      const [code] = lang.trim().split(';');
      return code.toLowerCase();
    });

    // Check for Chinese variants
    if (languages.some(lang =>
      lang.startsWith('zh-hk') ||
      lang.startsWith('zh-tw') ||
      lang.startsWith('zh-cn') ||
      lang.startsWith('zh')
    )) {
      return 'zh-HK';
    }
  }

  // Default to English for rest of world
  return 'en';
}

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Only apply locale detection on root path (first visit)
  if (request.nextUrl.pathname === '/') {
    const detectedLocale = getLocaleFromRequest(request);
    if (detectedLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${detectedLocale}`;
      return Response.redirect(url);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
