import { Link } from 'react-router-dom';

interface ProductCardProps {
  title: string;
  description: string;
  to?: string;
  href?: string;
  badge?: string;
  disabled?: boolean;
  sampleLabel?: string;
  sampleHref?: string;
}

export default function ProductCard({
  title,
  description,
  to,
  href,
  badge,
  disabled,
  sampleLabel,
  sampleHref,
}: ProductCardProps) {
  const cardContent = (
    <div
      className={`bg-white rounded-xl shadow-sm border border-navy/6 p-6 sm:p-8 flex flex-col h-full transition-shadow hover:shadow-md ${
        disabled ? 'opacity-70 grayscale-[30%]' : ''
      }`}
    >
      {badge && (
        <span
          className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 w-fit ${
            disabled
              ? 'bg-gray-200 text-gray-500'
              : 'bg-orange/10 text-orange'
          }`}
        >
          {badge}
        </span>
      )}
      <h3 className="text-lg sm:text-xl font-bold text-navy mb-3">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">{description}</p>
      <div className="flex flex-wrap gap-3 mt-auto">
        {to && !disabled && (
          <Link
            to={to}
            className="inline-block bg-orange text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-dark transition-colors text-center"
            aria-label={`Get started with ${title}`}
          >
            Get Started
          </Link>
        )}
        {href && !disabled && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-navy-light transition-colors text-center"
          >
            Get Started
          </a>
        )}
        {sampleLabel && sampleHref && (
          <a
            href={sampleHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block border border-navy/15 text-navy text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-navy/5 transition-colors text-center"
            aria-label={`View sample ${title}`}
          >
            {sampleLabel}
          </a>
        )}
        {disabled && (
          <button
            disabled
            className="bg-gray-300 text-gray-500 text-sm font-semibold px-5 py-2.5 rounded-lg cursor-not-allowed"
          >
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );

  return cardContent;
}
