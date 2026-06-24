import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  return (
    <header className="bg-navy border-b border-white/8 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
      <Link to="/" className="flex items-center no-underline">
        <picture>
          <source srcSet="/logo-dark.webp" type="image/webp" />
          <img
            src="/logo-dark.png"
            alt="Nestflo"
            className="h-14 sm:h-16 w-auto"
          />
        </picture>
      </Link>
      {location.pathname !== '/' && (
        <Link
          to="/"
          className="text-sm text-brand-grey hover:text-white transition-colors"
        >
          ← Home
        </Link>
      )}
    </header>
  );
}
