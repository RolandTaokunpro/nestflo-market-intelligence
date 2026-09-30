import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import MarketReports from './pages/MarketReports';
import TargetVsComparable from './pages/TargetVsComparable';
import ComingSoon from './pages/ComingSoon';
import GoldmineFinder from './pages/GoldmineFinder';
import MarketData from './pages/MarketData';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* D4: the Market Data landing page is the canonical entry point. */}
        <Route path="/" element={<Navigate to="/marketdata" replace />} />
        {/* Registered above the "*" catch-all so it never falls through to Home.
            Standalone page with its own branded header/footer (D2). */}
        <Route path="/marketdata" element={<MarketData />} />
        <Route element={<Layout />}>
          <Route path="/market-reports" element={<MarketReports />} />
          <Route path="/target-vs-comparable" element={<TargetVsComparable />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="*" element={<Home />} />
        </Route>
        <Route path="/goldmine-finder" element={<GoldmineFinder />} />
      </Routes>
    </BrowserRouter>
  );
}
