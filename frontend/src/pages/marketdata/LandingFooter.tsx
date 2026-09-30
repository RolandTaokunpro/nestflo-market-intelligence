import { Link } from 'react-router-dom';
import LogoMark from './LogoMark';

/**
 * Standalone branded footer per the mockup. SPA routes use <Link>; the archive
 * and legal targets are external/full-page, matching the shared SPA footer.
 */
export default function LandingFooter() {
  return (
    <footer className="md-footer">
      <div className="md-wrap md-fwrap">
        <div className="md-fcol md-fbrand">
          <div className="md-brand">
            <LogoMark />
            <span>Nestflo</span>
          </div>
          <p className="md-ftext">
            HMO Market Intelligence for HMO landlords, letting agents and developers.
            <br />
            Proudly built in Bristol, UK.
          </p>
          <p className="md-ftext">
            <a href="mailto:hello@nestflo.ai">hello@nestflo.ai</a> ·{' '}
            <a href="tel:03301338626">0330 133 8626</a>
          </p>
        </div>

        <div className="md-fcol">
          <h4>Products</h4>
          <Link to="/market-reports">HMO Market Reports</Link>
          <Link to="/target-vs-comparable">Target vs Comparables</Link>
          <Link to="/marketdata">Market Data</Link>
          <a href="/rents/">District Rents Archive</a>
        </div>

        <div className="md-fcol">
          <h4>Company</h4>
          <a href="https://nestflo.ai/terms" target="_blank" rel="noopener noreferrer">
            Terms &amp; Conditions
          </a>
          <a href="https://nestflo.ai/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          <a href="https://nestflo.ai/cookies" target="_blank" rel="noopener noreferrer">
            Cookie Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
