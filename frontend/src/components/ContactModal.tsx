import { useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const FREE_EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
    'icloud.com', 'me.com', 'protonmail.com', 'aol.com', 'mail.com',
    'gmx.com', 'ymail.com',
  ];
  const isBusinessEmail = (e: string) => {
    const domain = e.split('@')[1]?.toLowerCase();
    return domain && !FREE_EMAIL_DOMAINS.includes(domain);
  };

  const isValid =
    name.trim() && company.trim() && email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    isBusinessEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');

    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          message: message.trim(),
        }),
      });
      if (resp.ok) {
        setSent(true);
      } else {
        setError('Something went wrong. Please try again or email hello@nestflo.ai.');
      }
    } catch {
      setError('Connection error. Please try again or email hello@nestflo.ai.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-navy-light rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-grey hover:text-white transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {sent ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
              ✓
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Thank you</h3>
            <p className="text-sm text-brand-grey">
              We&rsquo;ll be in touch within one business day.
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-1">Enterprise Plan</h3>
            <p className="text-sm text-brand-grey mb-6">
              Tell us about your needs and we&rsquo;ll get back to you within one business day.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-semibold text-white mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="contact-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full p-3 border border-white/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="contact-company" className="block text-xs font-semibold text-white mb-1">
                  Company
                </label>
                <input
                  type="text"
                  id="contact-company"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Your business or agency name"
                  className="w-full p-3 border border-white/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-semibold text-white mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  id="contact-email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourcompany.co.uk"
                  className="w-full p-3 border border-white/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-white mb-1">
                  Message <span className="text-brand-grey font-normal">(optional)</span>
                </label>
                <textarea
                  id="contact-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us about your reporting needs…"
                  rows={3}
                  className="w-full p-3 border border-white/15 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange/30 transition resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={!isValid || submitting}
                className={`w-full py-3 rounded-lg text-sm font-semibold transition ${
                  isValid && !submitting
                    ? 'bg-orange text-white hover:bg-orange-dark cursor-pointer'
                    : 'bg-white/10 text-brand-grey cursor-not-allowed'
                }`}
              >
                {submitting ? 'Sending…' : 'Submit Enquiry'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
