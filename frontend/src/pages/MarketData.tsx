import { useEffect, type CSSProperties } from 'react';
import { MD_STYLE_VARS } from './marketdata/marketData';
import { applyMarketDataSeo } from './marketdata/marketDataSeo';
import LandingHeader from './marketdata/LandingHeader';
import Hero from './marketdata/Hero';
import NationalInsight from './marketdata/NationalInsight';
import MonthlySnapshots from './marketdata/MonthlySnapshots';
import RentsByCity from './marketdata/RentsByCity';
import NavigationSteps from './marketdata/NavigationSteps';
import LandingFooter from './marketdata/LandingFooter';
import './marketdata/marketdata.css';

/**
 * /marketdata — the HMO Market Intelligence entry page.
 *
 * Standalone full-bleed page with its own canonical-brand header/footer (D2),
 * rendering bundled August 2026 constants only: no live API or DB calls at
 * render time.
 */
export default function MarketData() {
  useEffect(() => applyMarketDataSeo(), []);

  return (
    <div className="md-page" style={MD_STYLE_VARS as CSSProperties}>
      <LandingHeader />
      <main className="md-main">
        <div className="md-wrap">
          <Hero />
          <NationalInsight />
          <MonthlySnapshots />
          <RentsByCity />
          <NavigationSteps />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
