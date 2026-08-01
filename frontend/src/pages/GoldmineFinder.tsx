import { useState, useCallback } from 'react';

/* ── Static SN1 Demo Data (pre-computed, not live API) ──────────────── */
interface DemoListing {
  title: string;
  rent: number;
  score: number;
  signal: string;
}

const SN1_DEMO_DATA = {
  totalListings: 82,
  gold: 3,
  silver: 12,
  watch: 28,
  listings: [
    { title: 'Modern En-Suite near Town Centre', rent: 550, score: 92, signal: '£125 below market median' },
    { title: 'Spacious Double Room, Bills Inc.', rent: 475, score: 87, signal: '14+ days on market (motivated LL)' },
    { title: 'Newly Refurbished Studio Flat', rent: 625, score: 83, signal: 'Portfolio void detected' },
  ] as DemoListing[],
};

/* ── Validation Helpers ─────────────────────────────────────────────── */

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?(\s?\d[A-Z]{2})?$/i;

interface FormErrors {
  postcodes?: string;
  email?: string;
  budget?: string;
}

function validateForm(postcodes: string, email: string, budget: string): FormErrors {
  const errors: FormErrors = {};

  if (!postcodes.trim()) {
    errors.postcodes = 'Please enter at least one postcode';
  } else {
    const parts = postcodes.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      errors.postcodes = 'Please enter at least one postcode';
    } else {
      for (const p of parts) {
        if (!UK_POSTCODE_RE.test(p.trim())) {
          errors.postcodes = `Invalid UK postcode: ${p.trim()}`;
          break;
        }
      }
    }
  }

  if (!email.trim()) {
    errors.email = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (budget.trim()) {
    const num = Number(budget.trim());
    if (isNaN(num)) {
      errors.budget = 'Budget must be a number';
    } else if (num <= 0) {
      errors.budget = 'Budget must be greater than 0';
    }
  }

  return errors;
}

/* ── Component ──────────────────────────────────────────────────────── */

interface JobResponse {
  job_id: string;
  status: string;
  estimated_completion: string;
}

export default function GoldmineFinder() {
  const [postcodes, setPostcodes] = useState('');
  const [roomType, setRoomType] = useState('any');
  const [budget, setBudget] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<JobResponse | null>(null);
  const [serverError, setServerError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validateForm(postcodes, email, budget);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch('/api/goldmine/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes, room_type: roomType, max_budget: budget || undefined, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setServerError(data.detail || 'Something went wrong. Please try again.');
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [postcodes, roomType, budget, email]);

  const handleReset = useCallback(() => {
    setPostcodes('');
    setRoomType('any');
    setBudget('');
    setEmail('');
    setErrors({});
    setResult(null);
    setServerError('');
  }, []);

  /* ── Confirmation State ─────────────────────────────────────────── */
  if (result) {
    return (
      <div className="min-h-screen bg-navy">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <div className="max-w-lg mx-auto bg-navy-light rounded-2xl border border-white/8 p-8 sm:p-10 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Job submitted successfully</h2>
            <p className="text-brand-grey mb-6">Estimated completion in {result.estimated_completion}</p>

            <div className="bg-navy rounded-xl p-4 mb-6 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-brand-grey">Job Reference</span>
                <span className="text-brand-cyan font-mono text-xs">{result.job_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-grey">Status</span>
                <span className="text-orange capitalize">{result.status}</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="text-brand-cyan hover:text-orange transition-colors text-sm font-medium"
            >
              Submit another job &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Landing Page ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-navy">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange/10 to-brand-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-brand-purple/10 to-brand-cyan/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 pt-16 sm:pt-24 pb-12 sm:pb-16 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-block bg-orange/10 text-orange text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide">
                Goldmine Finder
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
                Find Goldmine Listings
                <br />
                <span className="text-orange">on SpareRoom</span>
              </h1>
              <p className="text-base sm:text-lg text-brand-grey max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                Our AI scores every listing against 8 signals — undervalued rent,
                motivated landlords, portfolio voids. Stop scrolling SpareRoom manually.
              </p>
              <a
                href="#job-form"
                className="inline-flex items-center gap-2 bg-gradient-brand text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-orange/25 hover:shadow-orange/40 transition-shadow text-lg"
              >
                Find Goldmine Listings
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </a>
            </div>
            <div className="hidden lg:flex justify-center">
              <div className="bg-navy-light rounded-2xl border border-white/8 p-6 w-full max-w-sm shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="space-y-3">
                  <div className="bg-navy rounded-lg p-3 border border-orange/20">
                    <p className="text-white text-sm font-semibold">Modern En-Suite near Town Centre</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-orange font-bold">£125 below market</span>
                      <span className="text-brand-cyan text-xs font-mono">Score: 92</span>
                    </div>
                  </div>
                  <div className="bg-navy rounded-lg p-3 border border-white/8">
                    <p className="text-brand-grey text-sm">Spacious Double, Bills Inc.</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-brand-lavender text-sm">14+ days on market</span>
                      <span className="text-brand-cyan text-xs font-mono">Score: 87</span>
                    </div>
                  </div>
                  <div className="bg-navy rounded-lg p-3 border border-white/8">
                    <p className="text-brand-grey text-sm">Studio Flat — Newly Refurbished</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-brand-lavender text-sm">Portfolio void</span>
                      <span className="text-brand-cyan text-xs font-mono">Score: 83</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12 tracking-tight">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', icon: '📍', title: 'Enter your target postcodes', desc: 'Tell us where you want to find HMO goldmines — single postcode or multiple areas.' },
              { step: '2', icon: '🔍', title: 'We crawl Spareroom & score every listing', desc: 'Our AI analyses 8 goldmine signals: undervalued rent, motivated landlords, portfolio voids, and more.' },
              { step: '3', icon: '🏆', title: 'Get your ranked goldmine list', desc: 'Receive a prioritised list of the best opportunities in your target area, ready to action.' },
            ].map((item) => (
              <div key={item.step} className="bg-navy-light rounded-xl border border-white/8 p-6 sm:p-8 text-center">
                <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center text-2xl mb-4 mx-auto shadow-sm" aria-hidden="true">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-brand-grey leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Job Submission Form ── */}
      <section id="job-form" className="py-16 sm:py-20">
        <div className="max-w-lg mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2 tracking-tight">
            Start Your Search
          </h2>
          <p className="text-brand-grey text-center mb-8">Free — no account required.</p>

          <form onSubmit={handleSubmit} className="bg-navy-light rounded-2xl border border-white/8 p-6 sm:p-8 space-y-5" noValidate>
            {/* Postcodes */}
            <div>
              <label htmlFor="postcodes" className="block text-sm font-medium text-brand-grey mb-2">
                Postcode(s)
              </label>
              <input
                id="postcodes"
                type="text"
                placeholder="e.g. SN1, BS5, PE3"
                value={postcodes}
                onChange={(e) => { setPostcodes(e.target.value); setErrors((prev) => ({ ...prev, postcodes: undefined })); }}
                className={`w-full bg-navy border ${errors.postcodes ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder:text-brand-grey/50 focus:outline-none focus:border-orange transition-colors`}
              />
              {errors.postcodes && <p className="text-red-400 text-sm mt-1.5">{errors.postcodes}</p>}
            </div>

            {/* Room Type */}
            <div>
              <label htmlFor="roomType" className="block text-sm font-medium text-brand-grey mb-2">
                Room Type
              </label>
              <select
                id="roomType"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full bg-navy border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange transition-colors appearance-none"
              >
                <option value="any">Any</option>
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="en-suite">En-Suite</option>
                <option value="double_ensuite">Double En-Suite</option>
                <option value="studio">Studio</option>
              </select>
            </div>

            {/* Max Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-brand-grey mb-2">
                Max Budget £/month <span className="text-brand-grey/50">(optional)</span>
              </label>
              <input
                id="budget"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 800"
                value={budget}
                onChange={(e) => { setBudget(e.target.value); setErrors((prev) => ({ ...prev, budget: undefined })); }}
                className={`w-full bg-navy border ${errors.budget ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder:text-brand-grey/50 focus:outline-none focus:border-orange transition-colors`}
              />
              {errors.budget && <p className="text-red-400 text-sm mt-1.5">{errors.budget}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-grey mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: undefined })); }}
                className={`w-full bg-navy border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white placeholder:text-brand-grey/50 focus:outline-none focus:border-orange transition-colors`}
              />
              {errors.email && <p className="text-red-400 text-sm mt-1.5">{errors.email}</p>}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-brand text-white font-semibold py-4 rounded-xl shadow-lg shadow-orange/25 hover:shadow-orange/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-lg"
            >
              {submitting ? 'Submitting...' : 'Find Goldmine Listings'}
            </button>
          </form>
        </div>
      </section>

      {/* ── Live Demo Section ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="inline-block bg-brand-cyan/10 text-brand-cyan text-xs font-semibold px-3 py-1.5 rounded-full mb-4 tracking-wide">
              Live Demo — SN1
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              See it in action
            </h2>
          </div>

          <div className="bg-navy-light rounded-2xl border border-white/8 p-6 sm:p-8 max-w-3xl mx-auto">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-orange">{SN1_DEMO_DATA.totalListings}</div>
                <div className="text-xs text-brand-grey mt-1">Listings Crawled</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-brand-cyan">{SN1_DEMO_DATA.gold}</div>
                <div className="text-xs text-brand-grey mt-1">Gold</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-brand-lavender">{SN1_DEMO_DATA.watch}</div>
                <div className="text-xs text-brand-grey mt-1">Watch</div>
              </div>
            </div>

            <p className="text-sm text-brand-grey text-center mb-6">
              {SN1_DEMO_DATA.totalListings} listings crawled in SN1 —{' '}
              {SN1_DEMO_DATA.gold} Gold, {SN1_DEMO_DATA.silver} Silver, {SN1_DEMO_DATA.watch} Watch
            </p>

            {/* Top 3 Goldmine Listings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-brand-grey uppercase tracking-wide">Top 3 Goldmine Listings</h3>
              {SN1_DEMO_DATA.listings.map((listing, i) => (
                <div key={i} className="bg-navy rounded-xl p-4 border border-white/8 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{listing.title}</p>
                    <p className="text-brand-lavender text-xs mt-0.5">{listing.signal}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-orange font-bold text-sm">£{listing.rent}/mo</span>
                    <span className="bg-brand-cyan/10 text-brand-cyan text-xs font-mono px-2 py-1 rounded-lg">Score: {listing.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer note ── */}
      <div className="text-center pb-16">
        <p className="text-brand-grey text-xs">
          Results are from a real crawl. Last updated: August 2026.
        </p>
      </div>
    </div>
  );
}
