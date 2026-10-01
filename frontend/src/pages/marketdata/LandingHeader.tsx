import LogoMark from './LogoMark';
import { DEMO_BOOKING_URL } from './marketData';

/** Standalone branded header per the mockup (D2: not the shared Layout header). */
export default function LandingHeader() {
  return (
    <header className="md-header">
      <div className="md-wrap md-nav">
        <a className="md-brand" href="/" aria-label="Back to Nestflo home">
          <LogoMark />
          <span>Nestflo</span>
        </a>
        <div className="md-nav-actions">
          <a className="md-home-link" href="/">
            ← Home
          </a>
          <a
            className="md-btn-demo"
            href={DEMO_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Book a Demo
          </a>
        </div>
      </div>
    </header>
  );
}
