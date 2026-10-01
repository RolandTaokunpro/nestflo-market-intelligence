import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query and re-render when it changes.
 *
 * The site header chooses between its inline nav and its hamburger nav from
 * `(min-width: 768px)` — Tailwind's `md` breakpoint — instead of hiding two
 * copies with `hidden md:flex`, so the breakpoint behaviour is exercisable in
 * jsdom (which performs no CSS layout and therefore cannot prove visibility).
 *
 * Environments without `matchMedia` (SSR, older test runners) resolve to `false`,
 * keeping the component renderable outside a browser.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
