import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-navy/8 px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="text-xl sm:text-2xl font-bold text-navy tracking-tight no-underline">
        Nestfl<span className="text-orange">o</span>
      </Link>
      <div className="flex items-center gap-3">
        {location.pathname !== '/' && (
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-navy transition-colors"
          >
            ← Products
          </Link>
        )}
        <span className="bg-navy text-white text-xs font-semibold px-3 py-1.5 rounded-full tracking-wide">
          HMO Market Intelligence
        </span>
      </div>
    </header>
  );
}
