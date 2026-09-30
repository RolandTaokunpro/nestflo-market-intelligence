/**
 * Page-level contract tests for /marketdata: route registration (AC-1, D4),
 * canonical brand application (AC-17), SEO head tags + JSON-LD (AC-20),
 * responsive CSS contract and heading structure (AC-18/AC-19).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import App from '../../src/App';
import MarketData from '../../src/pages/MarketData';
import { MD_SEO, applyMarketDataSeo } from '../../src/pages/marketdata/marketDataSeo';
import { MD_TOKENS } from '../../src/pages/marketdata/marketData';

const FRONTEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));

function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
  document.querySelectorAll('[data-md-seo]').forEach((el) => el.remove());
});

describe('AC-1 route renders the landing page', () => {
  it('renders the seven mockup sections in order at /marketdata', () => {
    renderAppAt('/marketdata');

    const nodes = Array.from(
      document.body.querySelectorAll('header, [data-testid^="md-sec-"], footer')
    );
    const order = nodes.map((node) => {
      if (node.tagName === 'HEADER') return 'header';
      if (node.tagName === 'FOOTER') return 'footer';
      return node.getAttribute('data-testid');
    });

    expect(order).toEqual([
      'header',
      'md-sec-hero',
      'md-sec-insight',
      'md-sec-snapshots',
      'md-sec-rents',
      'md-sec-steps',
      'footer',
    ]);
  });

  it('does not fall through to the Home page', () => {
    renderAppAt('/marketdata');
    expect(screen.queryByText(/without proof/i)).toBeNull();
    expect(screen.getByTestId('md-sec-insight')).toBeInTheDocument();
  });

  it('redirects / to /marketdata (D4: marketdata is the canonical entry)', () => {
    renderAppAt('/');

    expect(window.location.pathname).toBe('/marketdata');
    expect(screen.getByTestId('md-sec-hero')).toBeInTheDocument();
    expect(screen.getByTestId('md-sec-insight')).toBeInTheDocument();
    expect(screen.queryByText(/without proof/i)).toBeNull();
  });

  it('keeps the catch-all route rendering Home for unknown paths', () => {
    renderAppAt('/nope');
    expect(screen.getByText(/without proof/i)).toBeInTheDocument();
    expect(screen.queryByTestId('md-sec-hero')).toBeNull();
  });

  it('exposes exactly one h1 and one h2 per section, in order', () => {
    renderAt();
    const headings = Array.from(document.querySelectorAll('h1, h2'));
    expect(headings.map((h) => h.tagName)).toEqual(['H1', 'H2', 'H2', 'H2', 'H2']);
    expect(headings[0]).toHaveTextContent(/know what every room is worth/i);
  });
});

function renderAt() {
  return render(<MarketData />);
}

describe('AC-17 canonical brand application', () => {
  it('scopes the canonical tokens and gradient to the page root', () => {
    renderAt();
    const root = document.querySelector('.md-page') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.style.getPropertyValue('--md-navy')).toBe('#050913');
    expect(root.style.getPropertyValue('--md-navy-card')).toBe('#150343');
    expect(root.style.getPropertyValue('--md-orange')).toBe('#FF5943');
    expect(root.style.getPropertyValue('--md-gradient-signature')).toBe(
      'linear-gradient(135deg, #2D009E 0%, #B3304A 55%, #EF4F34 100%)'
    );
    expect(MD_TOKENS.navy).not.toBe('#050710');
  });

  it('loads Poppins from Google Fonts with preconnect hints', () => {
    renderAt();
    const stylesheet = document.querySelector<HTMLLinkElement>(
      'link[data-md-seo="poppins"][rel="stylesheet"]'
    );
    expect(stylesheet).toBeTruthy();
    expect(stylesheet?.href).toContain('fonts.googleapis.com');
    expect(stylesheet?.href).toContain('Poppins:wght@300;400;500;600;700;800');
    expect(document.querySelector('link[data-md-seo="preconnect-fonts"]')).toBeTruthy();
    expect(document.querySelector('link[data-md-seo="preconnect-gstatic"]')).toBeTruthy();
  });

  it('styles the landing page from its own scoped stylesheet, not the shared palette', () => {
    const css = readFileSync(`${FRONTEND_ROOT}src/pages/marketdata/marketdata.css`, 'utf8');
    expect(css).toContain('.md-page');
    expect(css).toContain('var(--md-navy');
    expect(css).toContain('Poppins');
    expect(css).not.toContain('#050710');
  });
});

describe('AC-18 responsive CSS contract (mobile-first)', () => {
  const css = readFileSync(`${FRONTEND_ROOT}src/pages/marketdata/marketdata.css`, 'utf8');

  it('starts single-column for the insight grid and steps, KPIs 2-across', () => {
    expect(css).toMatch(/\.md-insight\s*\{[^}]*grid-template-columns: 1fr/);
    expect(css).toMatch(/\.md-steps\s*\{[^}]*grid-template-columns: 1fr/);
    expect(css).toMatch(/\.md-kpi-row\s*\{[^}]*grid-template-columns: repeat\(2, 1fr\)/);
    expect(css).toMatch(/\.md-cities\s*\{[^}]*grid-template-columns: repeat\(auto-fill/);
  });

  it('expands to a 2-column insight with 4 KPIs across from 821px', () => {
    expect(css).toMatch(/@media \(min-width: 821px\)/);
    expect(css).toMatch(
      /@media \(min-width: 821px\)\s*\{[^@]*\.md-insight\s*\{\s*grid-template-columns: 1\.4fr 1fr/
    );
    expect(css).toMatch(
      /@media \(min-width: 821px\)\s*\{[^@]*\.md-kpi-row\s*\{\s*grid-template-columns: repeat\(4, 1fr\)/
    );
  });

  it('expands the three navigation steps from 701px', () => {
    expect(css).toMatch(/@media \(min-width: 701px\)/);
    expect(css).toMatch(
      /@media \(min-width: 701px\)\s*\{[^@]*\.md-steps\s*\{\s*grid-template-columns: repeat\(3, 1fr\)/
    );
  });
});

describe('AC-20 SEO head tags and JSON-LD', () => {
  it('sets a unique title, description and JSON-LD on mount, and restores on unmount', () => {
    const originalTitle = document.title;
    expect(document.querySelector('meta[name="description"]')).toBeNull();

    const restore = applyMarketDataSeo(document);

    expect(document.title).toBe('Market Data — Nestflo HMO Market Intelligence');
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    expect(description?.getAttribute('content')).toBe(MD_SEO.description);
    expect(MD_SEO.description).toContain('HMO');
    expect(MD_SEO.description).toContain('market data');

    const ld = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    expect(ld).toBeTruthy();
    const jsonLd = JSON.parse(ld!.textContent ?? '{}');
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Dataset');
    expect(jsonLd.name).toContain('HMO Market Intelligence');
    expect(jsonLd.spatialCoverage).toBe('United Kingdom');
    expect(jsonLd.temporalCoverage).toBe('2026-08');

    restore();

    expect(document.title).toBe(originalTitle);
    expect(document.querySelector('meta[name="description"]')).toBeNull();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('restores a pre-existing description instead of dropping it', () => {
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'original shell description';
    document.head.appendChild(meta);

    const restore = applyMarketDataSeo(document);
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(
      MD_SEO.description
    );

    restore();
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(
      'original shell description'
    );
    meta.remove();
    document.querySelectorAll('[data-md-seo]').forEach((el) => el.remove());
  });

  it('reuses an existing description meta tag rather than duplicating it', () => {
    const meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'shell';
    document.head.appendChild(meta);

    applyMarketDataSeo(document);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    meta.remove();
  });

  it('is applied when the page mounts through the router', () => {
    renderAppAt('/marketdata');
    expect(document.title).toBe('Market Data — Nestflo HMO Market Intelligence');
    expect(document.querySelector('script[type="application/ld+json"]')).toBeTruthy();
  });

  it('reapplies the head tags on a client-side remount', () => {
    renderAt();
    const first = document.querySelector('script[type="application/ld+json"]');
    cleanup();
    renderAt();
    const second = document.querySelector('script[type="application/ld+json"]');
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });
});
