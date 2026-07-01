import { useState } from 'react';
import { isBusinessEmail } from '../constants';
import SuccessModal from '../components/SuccessModal';

// Backend URL — points to your Mac mini via cloudflare tunnel
export default function TargetVsComparable() {
  const [url, setUrl] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors: Record<string, string> = {};
  if (touched.url) {
    if (!url.trim()) errors.url = 'Please enter a SpareRoom listing URL.';
    else if (!url.includes('spareroom.co.uk') || !url.includes('flatshare')) errors.url = 'Not a valid SpareRoom listing URL.';
    else if (!url.match(/flatshare_id=(\d+)/)) errors.url = 'Could not extract Ad ID from URL.';
  }
  if (touched.firstName && !firstName.trim()) errors.firstName = 'First name is required.';
  if (touched.lastName && !lastName.trim()) errors.lastName = 'Last name is required.';
  if (touched.companyName && !companyName.trim()) errors.companyName = 'Company name is required.';
  if (touched.email) {
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email.';
    else if (!isBusinessEmail(email)) errors.email = 'Please use a business email address (not @gmail.com, @yahoo.com, etc.).';
  }

  const isValid = url.trim() && url.includes('spareroom.co.uk') && url.match(/flatshare_id=(\d+)/) &&
    firstName.trim() && lastName.trim() && companyName.trim() && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && isBusinessEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ url: true, firstName: true, lastName: true, companyName: true, email: true });
    if (!isValid) return;

    setSubmitting(true);
    setFeedback(null);

    const minLoadPromise = new Promise(r => setTimeout(r, 900));

    try {
      const params = new URLSearchParams();
      params.append('url', url.trim());
      params.append('first_name', firstName.trim());
      params.append('last_name', lastName.trim());
      params.append('email', email.trim());
      params.append('company_name', companyName.trim());
      const resp = await fetch('/api/target-vs-comparable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await resp.json();
      await minLoadPromise;
      if (data.success) {
        const msg = `Thank you, ${firstName.trim()} ${lastName.trim()}. Your order has been forwarded. Your report will be emailed to ${email.trim()} after review — typically within 1 business day.`;
        setSuccessMessage(msg);
        setShowSuccessModal(true);
      } else {
        setFeedback({
          type: 'error',
          message: data.errors?.join(' ') || 'Submission failed.',
        });
      }
    } catch {
      await minLoadPromise;
      setFeedback({ type: 'error', message: 'Connection error. Ensure the server is running.' });
    }
    setSubmitting(false);
  };

  const mark = (field: string) => () => setTouched(prev => ({ ...prev, [field]: true }));

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
        Target vs Comparables
      </h1>
      <p className="text-base sm:text-lg text-brand-lavender font-medium mb-2">
        The report that settles the argument before it starts.
      </p>
      <p className="text-sm text-brand-grey mb-8">
        Benchmark any SpareRoom listing against the local market. Paste the URL and get a data-backed comparison.
      </p>

      {/* Why get this report */}
      <div className="bg-navy-light rounded-xl border border-white/8 p-5 sm:p-6 mb-8">
        <h2 className="text-sm font-semibold text-orange uppercase tracking-wider mb-3">
          Why you need this
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-brand-cyan text-lg flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F4CB;</span>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Justify any rent change</p>
              <p className="text-xs text-brand-grey leading-relaxed">
                Whether increasing or decreasing, show tenants and landlords the
                market data behind your decision.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-brand-cyan text-lg flex-shrink-0 mt-0.5" aria-hidden="true">&#x1F3AF;</span>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Professional credibility</p>
              <p className="text-xs text-brand-grey leading-relaxed">
                Walk into any landlord meeting with a tribunal-ready benchmark.
                Not an opinion &mdash; evidence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {feedback && feedback.type !== 'success' && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-lg text-sm ${
            feedback.type === 'info'
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      <form onSubmit={handleSubmit} noValidate className="bg-navy-light rounded-xl border border-white/8 p-6 sm:p-8 space-y-5">
        {/* URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-semibold text-white mb-1.5">
            SpareRoom Listing URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onBlur={mark('url')}
            placeholder="https://www.spareroom.co.uk/flatshare/flatshare_detail.pl?flatshare_id=..."
            className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              touched.url && errors.url ? 'border-red-400' : 'border-white/15'
            }`}
            aria-describedby="url-error"
          />
          {touched.url && errors.url && (
            <p id="url-error" className="text-xs text-red-500 mt-1">{errors.url}</p>
          )}
        </div>

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-white mb-1.5">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onBlur={mark('firstName')}
              className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
                touched.firstName && errors.firstName ? 'border-red-400' : 'border-white/15'
              }`}
            />
            {touched.firstName && errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold text-white mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onBlur={mark('lastName')}
              className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
                touched.lastName && errors.lastName ? 'border-red-400' : 'border-white/15'
              }`}
            />
            {touched.lastName && errors.lastName && (
              <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
            )}
          </div>
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
            onChange={e => setCompanyName(e.target.value)}
            onBlur={mark('companyName')}
            placeholder="Your business or agency name"
            className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              touched.companyName && errors.companyName ? 'border-red-400' : 'border-white/15'
            }`}
          />
          {touched.companyName && errors.companyName && (
            <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>
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
            onChange={e => setEmail(e.target.value)}
            onBlur={mark('email')}
            placeholder="you@yourcompany.co.uk"
            className={`w-full p-3 border rounded-lg text-sm bg-navy text-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              touched.email && errors.email ? 'border-red-400' : 'border-white/15'
            }`}
          />
          {touched.email && errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
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
          {submitting ? 'Processing…' : 'Create Report'}
        </button>
        <p className="text-xs text-brand-grey text-center">
          By clicking <strong>Create</strong>, our analysis engine <span className="text-orange font-semibold">Echo</span> will process your request. You will receive your report after review — typically within 1 business day.
        </p>
      </form>

      <div className="mt-8 text-center">
        <a
          href="/sample-target-vs-comparable.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-brand-cyan transition border border-navy/10 rounded-lg px-4 py-2.5"
        >
          <span>📊</span> View Sample Report
        </a>
      </div>
    </div>
  );
}
