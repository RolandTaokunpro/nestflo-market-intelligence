import { useState } from 'react';
import { searchSuggestions } from './marketDataLinks';

const PLACEHOLDER = 'Search a city or postcode — e.g. Bristol, BS1, M12, N16';

/**
 * Hero copy plus the client-side city/postcode search. Suggestions are a pure
 * client-side lookup — no API call, no user input leaves the browser.
 */
export default function Hero() {
  const [query, setQuery] = useState('');
  const suggestions = searchSuggestions(query);
  const open = query.trim().length > 0;

  return (
    <section className="md-hero" data-testid="md-sec-hero" aria-labelledby="md-hero-title">
      <p className="md-eyebrow">HMO Market Intelligence</p>
      <h1 id="md-hero-title">
        Know what every room is worth,{' '}
        <span className="md-dim">in any district, any month.</span>
      </h1>
      <p className="md-sub">
        National monthly snapshots and a per-district rent archive — 1,730 postcode districts,
        117 towns and cities, London in 8 areas.
      </p>

      <div className="md-search">
        <svg
          className="md-search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="md-q"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="md-suggest"
          aria-autocomplete="list"
          aria-label="Search a city or postcode"
          placeholder={PLACEHOLDER}
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="md-hint">
          Type a city name or postcode — we&apos;ll take you straight to that district&apos;s data.
        </p>
        {open && (
          <ul className="md-suggest" id="md-suggest" role="listbox" aria-label="City and district suggestions">
            {suggestions.length === 0 ? (
              <li className="md-suggest-empty" role="presentation">
                No matching city or district.
              </li>
            ) : (
              suggestions.map((suggestion) => (
                <li
                  className="md-suggest-item"
                  key={suggestion.href}
                  role="option"
                  aria-selected={false}
                >
                  <a href={suggestion.href}>
                    <span className="md-lbl">
                      {suggestion.label}
                      <small>{suggestion.sub}</small>
                    </span>
                    <span className="md-go">{suggestion.kind} →</span>
                  </a>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
