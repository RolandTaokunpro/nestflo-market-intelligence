import { useState } from 'react';
import { subscribeComingSoon } from '../api/client';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await subscribeComingSoon(trimmed);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16 sm:py-20 text-center">
      <span className="inline-block bg-gray-200 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full mb-4">
        Coming Soon
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-4 tracking-tight">
        Target vs Comparables for New Landlords
      </h1>
      <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-md mx-auto">
        Nestflo Market Intelligence finds you motivated landlords and compares the
        landlord's listing with similar listings in nearby locations — helping new
        landlords benchmark and position their property effectively.
      </p>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
          Thanks! We'll notify <strong>{email}</strong> when this product launches.
        </div>
      ) : (
        <form onSubmit={handleSubscribe} className="max-w-sm mx-auto">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 p-3 border border-navy/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30"
              aria-label="Email for launch notification"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-navy text-white text-sm font-semibold px-5 py-3 rounded-lg hover:bg-navy-light transition disabled:opacity-50"
            >
              {loading ? '…' : 'Notify Me'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </form>
      )}
    </div>
  );
}
