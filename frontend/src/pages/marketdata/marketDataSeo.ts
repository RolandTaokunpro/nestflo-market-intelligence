/**
 * Client-rendered SEO head for the /marketdata landing page.
 *
 * The SPA catch-all serves one shared index.html for every client route, so the
 * per-page title, description and JSON-LD are applied at runtime. Crawlers that
 * do not execute JavaScript still see the generic shell — that gap is decision
 * D1 (SSR/prerender), deliberately out of scope here.
 *
 * The returned function restores the previous head state on unmount.
 */

export const MD_SEO = {
  title: 'Market Data — Nestflo HMO Market Intelligence',
  description:
    'National HMO market data for the UK: median room rents by room type, postcode district and city from the Nestflo HMO Market Intelligence archive — market data for landlords, letting agents and investors.',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Nestflo HMO Market Intelligence — national room rent data',
    description:
      'Monthly median HMO room rents for UK postcode districts, published by Nestflo.',
    spatialCoverage: 'United Kingdom',
    temporalCoverage: '2026-08',
    creator: { '@type': 'Organization', name: 'Nestflo' },
    isAccessibleForFree: true,
  },
} as const;

const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap';

function buildFontLinks(doc: Document): HTMLLinkElement[] {
  const preconnect = doc.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.googleapis.com';
  preconnect.setAttribute('data-md-seo', 'preconnect-fonts');

  const preconnectGstatic = doc.createElement('link');
  preconnectGstatic.rel = 'preconnect';
  preconnectGstatic.href = 'https://fonts.gstatic.com';
  preconnectGstatic.setAttribute('crossorigin', 'anonymous');
  preconnectGstatic.setAttribute('data-md-seo', 'preconnect-gstatic');

  const stylesheet = doc.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONT_STYLESHEET;
  stylesheet.setAttribute('data-md-seo', 'poppins');

  return [preconnect, preconnectGstatic, stylesheet];
}

export function applyMarketDataSeo(doc: Document = document): () => void {
  const previousTitle = doc.title;
  const existingDescription = doc.querySelector<HTMLMetaElement>('meta[name="description"]');
  const previousDescription = existingDescription
    ? existingDescription.getAttribute('content')
    : null;

  const description = existingDescription ?? doc.createElement('meta');
  if (!existingDescription) {
    description.name = 'description';
    doc.head.appendChild(description);
  }
  description.setAttribute('content', MD_SEO.description);
  doc.title = MD_SEO.title;

  const injected: HTMLElement[] = buildFontLinks(doc);
  const jsonLd = doc.createElement('script');
  jsonLd.type = 'application/ld+json';
  jsonLd.setAttribute('data-md-seo', 'json-ld');
  jsonLd.textContent = JSON.stringify(MD_SEO.jsonLd);
  injected.push(jsonLd);
  injected.forEach((element) => doc.head.appendChild(element));

  return () => {
    doc.title = previousTitle;
    if (previousDescription === null) {
      description.remove();
    } else {
      description.setAttribute('content', previousDescription);
    }
    injected.forEach((element) => element.remove());
  };
}
