import { CURATED_REGIONS } from './marketData';
import { cityCardHref } from './marketDataLinks';

/**
 * Rents by City: curated region groups whose cards link to the archive pages
 * that ship with this repo. Cards without a page render as a non-navigating
 * "Coming soon" state instead of a dead link (AC-14).
 */
export default function RentsByCity() {
  return (
    <section className="md-section" data-testid="md-sec-rents" aria-labelledby="md-rents-title">
      <p className="md-sec-eyebrow">Rents by City</p>
      <h2 className="md-sec-title" id="md-rents-title">
        Pick a city, drill to a postcode
      </h2>
      <p className="md-sec-sub">Every district has its own data page.</p>

      {CURATED_REGIONS.map((region) => (
        <div className="md-region" key={region.id} data-testid={`md-region-${region.id}`}>
          <h3 className="md-rname">{region.label}</h3>
          <div className="md-cities">
            {region.cities.map((city) => {
              const href = cityCardHref(city.slug);
              return href ? (
                <a className="md-city" key={city.name} data-testid="md-city-card" href={href}>
                  <span>{city.name}</span>
                  <span className="md-n">{city.range}</span>
                </a>
              ) : (
                <span
                  className="md-city md-city-soon"
                  key={city.name}
                  data-testid="md-city-soon"
                  aria-disabled="true"
                >
                  <span>{city.name}</span>
                  <span className="md-n">{city.range}</span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
