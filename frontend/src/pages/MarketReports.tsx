import { useState, useMemo, useCallback, useRef } from 'react';
import { CITIES, validatePostcode, getCityByPostcode, sortCities } from '../data/cities';

const MAX_POSTCODES = 3;
const SORTED_CITIES = sortCities(CITIES);

interface PostcodeEntry {
  id: number;
  value: string;
  touched: boolean;
}

export default function MarketReports() {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [entries, setEntries] = useState<PostcodeEntry[]>([
    { id: 1, value: '', touched: false },
  ]);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyNameTouched, setCompanyNameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const nextId = useRef(2);

  const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'me.com', 'protonmail.com', 'aol.com', 'mail.com', 'gmx.com', 'ymail.com'];
  const isBusinessEmail = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && !FREE_EMAIL_DOMAINS.includes(domain);
  };

  const city = useMemo(() => SORTED_CITIES.find(c => c.prefix === selectedCity), [selectedCity]);

  const selectedPostcodes = useMemo(() =>
    entries.filter(e => e.value.trim()).map(e => e.value.toUpperCase().trim()),
  [entries]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!selectedCity) errs.city = 'Please select a city.';
    entries.forEach((entry) => {
      if (!entry.value.trim()) return;
      const pc = entry.value.toUpperCase().trim();
      if (!validatePostcode(pc)) {
        errs[`pc-${entry.id}`] = `"${entry.value}" is not a valid UK postcode.`;
        return;
      }
      const pcCity = getCityByPostcode(pc);
      if (city && pcCity && pcCity.prefix !== city.prefix) {
        errs[`pc-${entry.id}`] = `${pc} belongs to ${pcCity.name}, not ${city.name}.`;
        return;
      }
      if (entries.findIndex(e => e.id === entry.id) !== entries.findIndex(e => e.value.toUpperCase().trim() === pc)) {
        errs[`pc-${entry.id}`] = `${pc} is already selected.`;
        return;
      }
    });
    if (emailTouched && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !isBusinessEmail(email)) {
      errs.email = 'Please use a business email address (not @gmail.com, @yahoo.com, etc.).';
    }
    return errs;
  }, [selectedCity, entries, city, email, emailTouched]);

  const hasAtLeastOneValid = selectedPostcodes.length >= 1 && Object.keys(errors).length === 0;
  const isValid = selectedCity && hasAtLeastOneValid && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && isBusinessEmail(email) && companyName.trim().length > 0;
  const canAddMore = entries.length < MAX_POSTCODES;

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    setFeedback(null);
    // Reset postcodes when city changes
    setEntries([{ id: 1, value: '', touched: false }]);
    nextId.current = 2;
  }, []);

  const handlePostcodeChange = useCallback((id: number, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, value, touched: true } : e));
    setFeedback(null);
  }, []);

  const addPostcode = useCallback(() => {
    if (entries.length >= MAX_POSTCODES) return;
    const id = nextId.current++;
    setEntries(prev => [...prev, { id, value: '', touched: false }]);
  }, [entries.length]);

  const removePostcode = useCallback((id: number) => {
    setEntries(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(e => e.id !== id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const params = new URLSearchParams();
      params.append('city', selectedCity);
      params.append('postcodes', selectedPostcodes.join(','));
      params.append('email', email.trim());
      params.append('company_name', companyName.trim());
      const resp = await fetch('/api/market-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await resp.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Request received! We'll process ${selectedPostcodes.join(', ')} for ${city?.name} and email your reports to ${email.trim()}.` });
        setEntries([{ id: 1, value: '', touched: false }]);
        setEmail('');
        setEmailTouched(false);
        setCompanyName('');
        setCompanyNameTouched(false);
        setSelectedCity('');
        nextId.current = 2;
      } else {
        setFeedback({ type: 'error', message: data.errors?.join(' ') || 'Submission failed. Please try again.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Connection error. Please ensure the server is running.' });
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
        HMO Market Reports
      </h1>
      <p className="text-base sm:text-lg text-brand-lavender font-medium mb-2">
        The market data you&rsquo;ll wish you had when a tenant disputes your rent.
      </p>
      <p className="text-sm text-brand-grey mb-8">
        Select a city and up to 3 postcodes to generate tribunal-ready HMO market evidence packs.
      </p>

      {/* Why get this report */}
      <div className="bg-navy-light rounded-xl border border-white/8 p-5 sm:p-6 mb-8">
        <h2 className="text-sm font-semibold text-orange uppercase tracking-wider mb-3">
          Why you need this
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-orange text-lg flex-shrink-0 mt-0.5">&#x1F6E1;</span>
            <div>
              <p className="text-sm font-semibold text-white mb-1">SpareRoom won&rsquo;t save this data</p>
              <p className="text-xs text-brand-grey leading-relaxed">
                SpareRoom deletes old listings. This report is your timestamped proof.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-orange text-lg flex-shrink-0 mt-0.5">&#x2696;&#xFE0F;</span>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Built to tribunal standard</p>
              <p className="text-xs text-brand-grey leading-relaxed">
                P25/P50/P75 percentiles with verified screenshots. Evidence a tribunal will accept.
              </p>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-lg text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="bg-navy-light rounded-xl border border-white/8 p-6 sm:p-8 space-y-6">
        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-semibold text-white mb-1.5">
            City
          </label>
          <select
            id="city"
            value={selectedCity}
            onChange={handleCityChange}
            className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              errors.city ? 'border-red-400' : 'border-white/15'
            }`}
            aria-describedby="city-error"
          >
            <option value="">Select a city…</option>
            <optgroup label="England">
              {SORTED_CITIES.filter(c => c.region === 'England').map(c => (
                <option key={c.prefix} value={c.prefix}>{c.name} ({c.prefix})</option>
              ))}
            </optgroup>
            <optgroup label="Scotland">
              {SORTED_CITIES.filter(c => c.region === 'Scotland').map(c => (
                <option key={c.prefix} value={c.prefix}>{c.name} ({c.prefix})</option>
              ))}
            </optgroup>
            <optgroup label="Wales">
              {SORTED_CITIES.filter(c => c.region === 'Wales').map(c => (
                <option key={c.prefix} value={c.prefix}>{c.name} ({c.prefix})</option>
              ))}
            </optgroup>
            <optgroup label="Northern Ireland">
              {SORTED_CITIES.filter(c => c.region === 'Northern Ireland').map(c => (
                <option key={c.prefix} value={c.prefix}>{c.name} ({c.prefix})</option>
              ))}
            </optgroup>
          </select>
          {errors.city && (
            <p id="city-error" className="text-xs text-red-500 mt-1">{errors.city}</p>
          )}
        </div>

        {/* Postcodes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-semibold text-white">
              Postcodes
            </label>
            <span className="text-xs text-brand-grey">
              {selectedPostcodes.length}/{MAX_POSTCODES} selected
            </span>
          </div>
          {!selectedCity && (
            <p className="text-xs text-brand-grey italic mb-2">Select a city first.</p>
          )}
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const errKey = `pc-${entry.id}`;
              return (
                <div key={entry.id} className="flex gap-2">
                  <input
                    type="text"
                    value={entry.value}
                    onChange={e => handlePostcodeChange(entry.id, e.target.value)}
                    placeholder={city ? `e.g. ${city.postcodes[0]}` : 'e.g. BS1'}
                    disabled={!selectedCity}
                    maxLength={7}
                    className={`flex-1 p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition uppercase ${
                      entry.touched && errors[errKey] ? 'border-red-400' : 'border-white/15'
                    } ${!selectedCity ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Postcode ${idx + 1}`}
                    aria-describedby={errors[errKey] ? `pc-err-${entry.id}` : undefined}
                    aria-invalid={!!(entry.touched && errors[errKey])}
                  />
                  {entries.length > 1 && selectedCity && (
                    <button
                      type="button"
                      onClick={() => removePostcode(entry.id)}
                      className="px-3 text-brand-grey hover:text-red-500 transition"
                      aria-label={`Remove postcode ${idx + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Max postcodes message */}
          {!canAddMore && selectedCity && (
            <p className="text-xs text-orange font-medium mt-2">
              You can select a maximum of {MAX_POSTCODES} postcodes.
            </p>
          )}
          {canAddMore && selectedCity && (
            <button
              type="button"
              onClick={addPostcode}
              className="text-xs text-brand-cyan font-medium mt-2 hover:text-orange transition"
            >
              + Add another postcode
            </button>
          )}
          {/* Inline errors for each postcode */}
          {entries.map(entry => {
            const errKey = `pc-${entry.id}`;
            return errors[errKey] ? (
              <p key={`err-${entry.id}`} id={`pc-err-${entry.id}`} className="text-xs text-red-500 mt-1">
                {errors[errKey]}
              </p>
            ) : null;
          })}
          {selectedCity && entries.length === 1 && entries[0].value.trim() && !errors[`pc-${entries[0].id}`] && (
            <p className="text-xs text-brand-grey mt-1">
              {city?.postcodes.filter(pc =>
                pc.startsWith(city.prefix)
              ).slice(0, 8).join(', ')}{(city?.postcodes.length ?? 0) > 8 ? '…' : ''}
            </p>
          )}
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-semibold text-white mb-1.5">
            Company Name
          </label>
          <input
            type="text"
            id="companyName"
            value={companyName}
            onChange={e => { setCompanyName(e.target.value); setCompanyNameTouched(true); }}
            placeholder="Your business or agency name"
            className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              companyNameTouched && !companyName.trim()
                ? 'border-red-400'
                : 'border-white/15'
            }`}
            aria-describedby="companyName-error"
          />
          {companyNameTouched && !companyName.trim() && (
            <p id="companyName-error" className="text-xs text-red-500 mt-1">Company name is required.</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-white mb-1.5">
            Business Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailTouched(true); }}
            placeholder="you@yourcompany.co.uk"
            className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              (emailTouched && email.trim() && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (errors.email && !errors.email.includes('valid email')))) || (emailTouched && errors.email)
                ? 'border-red-400'
                : 'border-white/15'
            }`}
            aria-describedby="email-error"
          />
          {emailTouched && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !errors.email && (
            <p id="email-error" className="text-xs text-red-500 mt-1">Please enter a valid email address.</p>
          )}
          {emailTouched && errors.email && (
            <p id="email-error" className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
          <p className="text-xs text-brand-grey mt-1">Business email required — no Gmail, Yahoo, or other free providers.</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || submitting}
          className={`w-full py-3 rounded-lg text-sm font-semibold transition ${
            isValid && !submitting
              ? 'bg-orange text-white hover:bg-orange-dark cursor-pointer'
              : 'bg-white/10 text-brand-grey cursor-not-allowed'
          }`}
        >
          {submitting ? 'Submitting…' : 'Generate Report'}
        </button>
      </form>

      {/* Sample report link */}
      <div className="mt-8 text-center">
        <a
          href="/sample-market-report.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-lavender hover:text-brand-cyan transition border border-white/10 rounded-lg px-4 py-2.5"
        >
          <span>📊</span> View Sample Report
        </a>
      </div>
    </div>
  );
}
