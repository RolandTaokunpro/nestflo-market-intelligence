import { useState } from 'react';

// Backend URL — points to your Mac mini via cloudflare tunnel
const BACKEND_URL = 'https://issue-addressing-soviet-crops.trycloudflare.com';

export default function TargetVsComparable() {
  const [url, setUrl] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [success, setSuccess] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors: Record<string, string> = {};
  if (touched.url) {
    if (!url.trim()) errors.url = 'Please enter a SpareRoom listing URL.';
    else if (!url.includes('spareroom.co.uk') || !url.includes('flatshare')) errors.url = 'Not a valid SpareRoom listing URL.';
    else if (!url.match(/flatshare_id=(\d+)/)) errors.url = 'Could not extract Ad ID from URL.';
  }
  if (touched.firstName && !firstName.trim()) errors.firstName = 'First name is required.';
  if (touched.lastName && !lastName.trim()) errors.lastName = 'Last name is required.';
  if (touched.email) {
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email.';
  }

  const isValid = url.trim() && url.includes('spareroom.co.uk') && url.match(/flatshare_id=(\d+)/) &&
    firstName.trim() && lastName.trim() && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ url: true, firstName: true, lastName: true, email: true });
    if (!isValid) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const params = new URLSearchParams();
      params.append('url', url.trim());
      params.append('first_name', firstName.trim());
      params.append('last_name', lastName.trim());
      params.append('email', email.trim());
      const resp = await fetch(`${BACKEND_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await resp.json();
      if (data.success) {
        setSuccess(true);
        setFeedback({ type: 'success', message: 'Request received!' });
      } else {
        setFeedback({
          type: 'error',
          message: data.errors?.join(' ') || 'Submission failed.',
        });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Connection error. Ensure the server is running.' });
    }
    setSubmitting(false);
  };

  const mark = (field: string) => () => setTouched(prev => ({ ...prev, [field]: true }));

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">✓</div>
        <h2 className="text-xl font-bold text-navy mb-2">Request Received</h2>
        <p className="text-sm text-gray-500 mb-1">Thank you, <strong>{firstName} {lastName}</strong>.</p>
        <p className="text-sm text-gray-500 mb-6">Your report will arrive at <strong>{email}</strong> within one hour.</p>
        <div className="text-left max-w-xs mx-auto space-y-2 text-xs text-gray-400">
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-orange rounded-full flex-shrink-0" /> Validating SpareRoom listing</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-orange rounded-full flex-shrink-0" /> Crawling market comparables</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-orange rounded-full flex-shrink-0" /> Running analysis & QA checks</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-orange rounded-full flex-shrink-0" /> Sending to your email</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2 tracking-tight">
        HMO Target vs Comparables
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Is your SpareRoom listing priced right? Paste the URL and get a data-backed comparison.
      </p>

      {feedback && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-lg text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : feedback.type === 'info'
              ? 'bg-blue-50 border border-blue-200 text-blue-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl shadow-sm border border-navy/6 p-6 sm:p-8 space-y-5">
        {/* URL */}
        <div>
          <label htmlFor="url" className="block text-sm font-semibold text-navy mb-1.5">
            SpareRoom Listing URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onBlur={mark('url')}
            placeholder="https://www.spareroom.co.uk/flatshare/flatshare_detail.pl?flatshare_id=..."
            className={`w-full p-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              touched.url && errors.url ? 'border-red-400' : 'border-navy/15'
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
            <label htmlFor="firstName" className="block text-sm font-semibold text-navy mb-1.5">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onBlur={mark('firstName')}
              className={`w-full p-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
                touched.firstName && errors.firstName ? 'border-red-400' : 'border-navy/15'
              }`}
            />
            {touched.firstName && errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold text-navy mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onBlur={mark('lastName')}
              className={`w-full p-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
                touched.lastName && errors.lastName ? 'border-red-400' : 'border-navy/15'
              }`}
            />
            {touched.lastName && errors.lastName && (
              <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-navy mb-1.5">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onBlur={mark('email')}
            placeholder="you@example.com"
            className={`w-full p-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition ${
              touched.email && errors.email ? 'border-red-400' : 'border-navy/15'
            }`}
          />
          {touched.email && errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">Your report will be sent to this address.</p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-lg text-sm font-semibold bg-orange text-white hover:bg-orange-dark transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {submitting ? 'Processing…' : 'Create Report'}
        </button>
        <p className="text-xs text-gray-400 text-center">
          By clicking <strong>Create</strong>, our analysis engine <span className="text-orange font-semibold">Echo</span> will process your request. You will receive your report within one hour.
        </p>
      </form>

      <div className="mt-8 text-center">
        <a
          href="https://drive.google.com/drive/u/0/folders/1cyZLP6iYsF_DHUT6EIcuH7H9R0N4Jq7E"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-orange transition border border-navy/10 rounded-lg px-4 py-2.5"
        >
          <span>📊</span> View Sample Report
        </a>
      </div>
    </div>
  );
}
