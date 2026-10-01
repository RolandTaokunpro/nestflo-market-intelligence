import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Shared site header (rendered by <Layout /> on every Layout-nested route).
 *
 * Responsive contract (SPEC.md t_71db9224, R2/D6):
 *   ≥ 768px (Tailwind `md`) — the three nav links render inline, one row.
 *   < 768px                 — they collapse into a hamburger disclosure.
 * Only default Tailwind breakpoints are used; no custom screens are introduced.
 */
const MD_QUERY = '(min-width: 768px)';

const NAV_ITEMS = [
  { label: 'Market Data', to: '/marketdata' },
  { label: 'HMO Market Reports', to: '/market-reports' },
  { label: 'Benchmark a Listing', to: '/target-vs-comparable' },
] as const;

/** External booking link — the same URL the Home CTAs use. */
const DEMO_HREF = 'https://calendly.com/roland-tao-kunpro/30min';

function linkClass(isActive: boolean): string {
  return [
    'text-sm font-medium whitespace-nowrap rounded-md px-2 py-1.5 lg:px-3 transition-colors',
    isActive ? 'text-white bg-white/10' : 'text-brand-grey hover:text-white',
  ].join(' ');
}

function DemoLink({ className = '' }: { className?: string }) {
  return (
    <a
      href={DEMO_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-sm bg-gradient-brand text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md ${className}`}
    >
      Book a Demo
    </a>
  );
}

export default function Header() {
  const location = useLocation();
  const isInlineNav = useMediaQuery(MD_QUERY);
  const [menuOpen, setMenuOpen] = useState(false);

  // A disclosure menu must not stay open across a navigation (D4).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (to: string) => location.pathname === to;

  return (
    <header className="relative bg-navy border-b border-white/8 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="flex items-center no-underline">
        <picture>
          <source srcSet="/logo-dark.webp" type="image/webp" />
          <img src="/logo-dark.png" alt="Nestflo" className="h-14 sm:h-16 w-auto" />
        </picture>
      </Link>

      <nav aria-label="Primary" className="flex items-center gap-2 lg:gap-6">
        {isInlineNav ? (
          <>
            <ul
              data-testid="header-nav-inline"
              className="flex flex-nowrap items-center gap-2 lg:gap-6 list-none m-0 p-0"
            >
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={isActive(item.to) ? 'page' : undefined}
                    className={linkClass(isActive(item.to))}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <DemoLink />
          </>
        ) : (
          <>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="header-mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex flex-col items-center justify-center gap-1.5 w-10 h-10 rounded-md border border-white/10 text-white"
            >
              <span aria-hidden="true" className="block w-5 h-0.5 bg-white" />
              <span aria-hidden="true" className="block w-5 h-0.5 bg-white" />
              <span aria-hidden="true" className="block w-5 h-0.5 bg-white" />
            </button>
            {menuOpen && (
              <ul
                id="header-mobile-menu"
                data-testid="header-mobile-menu"
                className="absolute left-0 right-0 top-full max-w-full flex flex-col items-stretch gap-1 list-none m-0 p-4 bg-navy border-b border-white/8 shadow-lg"
              >
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={isActive(item.to) ? 'page' : undefined}
                      className={`block ${linkClass(isActive(item.to))}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="pt-2">
                  <DemoLink className="inline-flex justify-center" />
                </li>
              </ul>
            )}
          </>
        )}
      </nav>
    </header>
  );
}
