import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import MarketReports from './pages/MarketReports';
import TargetVsComparable from './pages/TargetVsComparable';
import ComingSoon from './pages/ComingSoon';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/market-reports" element={<MarketReports />} />
          <Route path="/target-vs-comparable" element={<TargetVsComparable />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
