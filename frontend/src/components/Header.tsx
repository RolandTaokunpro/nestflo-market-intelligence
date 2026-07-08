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
      <div className="flex items-center gap-4">
        <a
          href="https://calendar.app.google/KSQx4rG9L6ytS4je7"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm bg-gradient-brand text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md"
        >
          Book a Demo
        </a>
        {location.pathname !== '/' && (
          <Link
            to="/"
            className="text-sm text-brand-grey hover:text-white transition-colors"
          >
            ← Home
          </Link>
        )}
      </div>
    </header>
  );
}
