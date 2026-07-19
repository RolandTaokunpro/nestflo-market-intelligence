import { useState } from 'react';
import { Link } from 'react-router-dom';
import ContactModal from '../components/ContactModal';

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
      <div className="text-xs sm:text-sm text-brand-grey mt-1">{label}</div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-navy-light rounded-xl border border-white/8 p-6 sm:p-8 text-center sm:text-left">
      <div className="w-12 h-12 bg-gradient-brand rounded-xl flex items-center justify-center text-2xl mb-4 mx-auto sm:mx-0 shadow-sm" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-brand-grey leading-relaxed">{description}</p>
    </div>
  );
}

export default function Home() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div>
      {/* ── 1. Hero Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-orange/10 to-brand-blue/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-br from-brand-purple/10 to-brand-cyan/10 rounded-full blur-3xl translate-y-1/2 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 pt-16 sm:pt-24 pb-16 sm:pb-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-block bg-orange/10 text-orange text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide">
                HMO Market Intelligence
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
                Don&rsquo;t get caught
                <br />
                <span className="text-orange">without proof</span>
              </h1>
              <p className="text-base sm:text-lg text-brand-lavender max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                SpareRoom doesn&rsquo;t archive historical rental data or
                screenshots. Nestflo does. Curate tribunal-ready postcode
                reports and listing benchmarks now &mdash; so when a tenant
                challenges a rent increase, you&rsquo;re already prepared.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  to="/market-reports"
                  className="inline-block bg-gradient-brand text-white text-sm font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-center shadow-lg shadow-orange/25"
                >
                  Get a Market Report &rarr;
                </Link>
                <Link
                  to="/target-vs-comparable"
                  className="inline-block bg-white/10 text-white text-sm font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors text-center border border-white/10"
                >
                  Benchmark a Listing
                </Link>
                <a
                  href="https://calendar.app.google/KSQx4rG9L6ytS4je7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-navy text-sm font-semibold px-8 py-4 rounded-xl hover:bg-brand-grey/90 transition-colors text-center border border-white/20"
                >
                  Book a Demo &rarr;
                </a>
              </div>
              <p className="text-sm font-medium text-brand-cyan mt-4">
                Free report, delivered by email. No credit card.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mt-2">
                <a
                  href="/sample-market-report.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-grey hover:text-brand-cyan transition-colors underline underline-offset-2"
                >
                  &#x1F4C4; View a sample Market Report
                </a>
                <a
                  href="/sample-target-vs-comparable.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-grey hover:text-brand-cyan transition-colors underline underline-offset-2"
                >
                  &#x1F4C4; View a sample Target vs Comparable
                </a>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="hidden lg:block">
              <div className="bg-navy-light rounded-2xl border border-white/10 p-6 max-w-sm mx-auto rotate-1 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Market Report &middot; SN1
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  Market: <span className="text-orange">&#x1F525; Hot</span>
                </div>
                <div className="text-xs text-brand-grey mb-4">82 listings found</div>

                <table className="w-full text-xs mb-4">
                  <thead>
                    <tr className="text-brand-grey border-b border-white/8">
                      <th className="text-left py-1.5 font-medium">Room Type</th>
                      <th className="text-right py-1.5 font-medium">Count</th>
                      <th className="text-right py-1.5 font-medium">P50</th>
                      <th className="text-right py-1.5 font-medium">P75</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { type: 'Double', count: 26, p50: '£673', p75: '£756' },
                      { type: 'En-Suite', count: 41, p50: '£700', p75: '£799' },
                      { type: 'Studio', count: 9, p50: '£875', p75: '£950' },
                      { type: 'Single', count: 6, p50: '£600', p75: '—' },
                    ].map((row) => (
                      <tr key={row.type} className="border-b border-white/4">
                        <td className="py-1.5 font-medium text-white">{row.type}</td>
                        <td className="py-1.5 text-right text-brand-grey">{row.count}</td>
                        <td className="py-1.5 text-right font-mono font-semibold text-white">
                          {row.p50}
                        </td>
                        <td className="py-1.5 text-right font-mono text-brand-grey">
                          {row.p75}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center gap-2 text-xs text-brand-grey">
                  <span className="text-green-500 font-semibold">&#x2713; 20 comparables</span>
                  <span>&middot;</span>
                  <span className="text-green-500 font-semibold">&#x2713; 5 room types</span>
                  <span>&middot;</span>
                  <span>Verified</span>
                </div>
              </div>

              <div className="bg-navy-light rounded-2xl border border-white/10 p-5 max-w-xs ml-auto -mt-8 -rotate-2 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 bg-orange rounded-full" />
                  <span className="text-xs font-semibold text-white">
                    Target vs Market &middot; SN2
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-brand-grey">Target Rent</div>
                    <div className="text-xl font-bold text-white">£575</div>
                  </div>
                  <div className="text-brand-grey/50 text-lg">vs</div>
                  <div>
                    <div className="text-xs text-brand-grey">Market P50</div>
                    <div className="text-xl font-bold text-orange">£625</div>
                  </div>
                </div>
                <div className="mt-3 bg-orange/10 text-orange text-xs font-semibold px-3 py-1.5 rounded-lg inline-block">
                  -8.0% BELOW MARKET
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Social Proof ── */}
      <section className="bg-navy-light border-y border-white/8">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <p className="text-center text-sm text-brand-grey mb-6 tracking-wide uppercase">
            Your evidence, on demand
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat value="3000+" label="UK Postcodes Covered" />
            <Stat value="P25/P50/P75" label="ONS Standard Percentiles" />
            <Stat value="3-5" label="Comparables per Room Type" />
            <Stat value="Minutes" label="Not Days — Per Report" />
          </div>
        </div>
      </section>

      {/* ── 3. Core Benefits ── */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-xs font-semibold text-orange uppercase tracking-widest">
            Why Nestflo
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4 tracking-tight">
            Evidence, not guesswork
          </h2>
          <p className="text-sm sm:text-base text-brand-lavender max-w-lg mx-auto">
            When a tenant challenges a rent increase, what proof do you have?
            Three ways Nestflo makes sure you&rsquo;re never caught without it.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <BenefitCard
            icon="&#x1F4CA;"
            title="Price with Confidence"
            description="Archive postcode-level market data with P25, P50, and P75 percentiles. When a tenant questions a rent increase six months later, you have the screenshots and data SpareRoom no longer shows."
          />
          <BenefitCard
            icon="&#x2696;&#xFE0F;"
            title="Tribunal-Ready Evidence"
            description="Every report includes verified screenshots, a full methodology statement, and a validation checklist. Built to the standard that landlords need when rent disputes reach tribunal."
          />
          <BenefitCard
            icon="&#x26A1;"
            title="Minutes, Not Days"
            description="SpareRoom doesn&rsquo;t archive listings. Screenshotting them yourself takes hours. Echo captures, analyses, and packages everything into a timestamped, tribunal-ready report while you get on with your day."
          />
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-navy-light border-y border-white/8">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold text-orange uppercase tracking-widest">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4 tracking-tight">
              Free to start. Simple to scale.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Product 1 — Free */}
            <div className="bg-navy-card rounded-xl p-6 sm:p-8 border border-white/8 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-2">
                HMO Market Reports
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-orange">Free</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-start gap-2 text-sm text-brand-grey">
                  <span className="text-orange font-bold flex-shrink-0">&rarr;</span>
                  Up to 3 district postcodes
                </li>
                <li className="flex items-start gap-2 text-sm text-brand-grey">
                  <span className="text-orange font-bold flex-shrink-0">&rarr;</span>
                  One batch every calendar month
                </li>
                <li className="flex items-start gap-2 text-sm text-brand-grey">
                  <span className="text-orange font-bold flex-shrink-0">&rarr;</span>
                  Business email required
                </li>
              </ul>
              <Link
                to="/market-reports"
                className="inline-block w-full bg-orange text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-dark transition-colors text-center"
              >
                Get Report
              </Link>
            </div>

            {/* Product 2 — Free */}
            <div className="bg-navy-card rounded-xl p-6 sm:p-8 border border-white/8 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-2">
                Target vs Comparables
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-brand-cyan">Free</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-start gap-2 text-sm text-brand-grey">
                  <span className="text-brand-cyan font-bold flex-shrink-0">&rarr;</span>
                  Up to 1 report
                </li>
                <li className="flex items-start gap-2 text-sm text-brand-grey">
                  <span className="text-brand-cyan font-bold flex-shrink-0">&rarr;</span>
                  One report every calendar month
                </li>
                <li className="flex items-start gap-2 text-sm text-brand-grey">
                  <span className="text-brand-cyan font-bold flex-shrink-0">&rarr;</span>
                  Business email required
                </li>
              </ul>
              <Link
                to="/target-vs-comparable"
                className="inline-block w-full bg-brand-blue text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity text-center"
              >
                Get Report
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-gradient-to-br from-navy-card to-brand-purple/20 rounded-xl p-6 sm:p-8 border border-white/10 text-white relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange/30 to-brand-cyan/30 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <span className="inline-block bg-orange text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 relative">
                Enterprise
              </span>
              <h3 className="text-lg font-bold text-white mb-2 relative">
                Both Products
              </h3>
              <div className="flex items-baseline gap-1 mb-4 relative">
                <span className="text-3xl font-bold text-white">£200</span>
                <span className="text-sm text-brand-grey">/month</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1 relative">
                <li className="flex items-start gap-2 text-sm text-brand-lavender">
                  <span className="text-brand-cyan font-bold flex-shrink-0">&rarr;</span>
                  Includes 20 HMO Market Reports
                </li>
                <li className="flex items-start gap-2 text-sm text-brand-lavender">
                  <span className="text-brand-cyan font-bold flex-shrink-0">&rarr;</span>
                  Includes 20 Target vs Comparables
                </li>
              </ul>
              <button
                onClick={() => setContactOpen(true)}
                className="inline-block w-full bg-gradient-brand text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity text-center relative cursor-pointer"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Final CTA ── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 text-center relative">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Build your evidence before the next rent review
          </h2>
          <p className="text-sm sm:text-base text-brand-lavender max-w-md mx-auto mb-8">
            Start archiving postcode reports or benchmark a listing now.
            Free, no account, delivered by email.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/market-reports"
              className="inline-block bg-gradient-brand text-white text-sm font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-center shadow-lg shadow-orange/25"
            >
              Get a Market Report &rarr;
            </Link>
            <Link
              to="/target-vs-comparable"
              className="inline-block bg-white/10 text-white text-sm font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-colors text-center border border-white/10"
            >
              Benchmark a Listing
            </Link>
            <a
              href="https://calendar.app.google/KSQx4rG9L6ytS4je7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-navy text-sm font-semibold px-8 py-4 rounded-xl hover:bg-brand-grey/90 transition-colors text-center border border-white/20"
            >
              Book a Demo &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ── Products quick-reference ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Product 1 */}
          <div className="bg-navy-light rounded-xl border border-white/8 p-6 sm:p-8 flex flex-col">
            <span className="inline-block bg-orange/10 text-orange text-xs font-semibold px-3 py-1 rounded-full mb-3">
              Product 1
            </span>
            <h3 className="text-lg font-bold text-white mb-2">
              HMO Market Reports
            </h3>
            <p className="text-sm text-brand-grey leading-relaxed mb-4 flex-1">
              Your insurance against rent disputes. Archive postcode-level
              market data with verified screenshots and P25/P50/P75 percentiles
              &mdash; the historical evidence SpareRoom doesn&rsquo;t keep.
              Build your archive now, defend any challenge later.
            </p>
            <Link
              to="/market-reports"
              className="inline-block bg-orange text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-dark transition-colors text-center"
            >
              Get Report
            </Link>
            <a
              href="/sample-market-report.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-grey hover:text-brand-cyan transition-colors text-center mt-3 underline underline-offset-2"
            >
              &#x1F4C4; View sample report
            </a>
          </div>

          {/* Product 2 */}
          <div className="bg-navy-light rounded-xl border border-white/8 p-6 sm:p-8 flex flex-col">
            <span className="inline-block bg-brand-cyan/10 text-brand-cyan text-xs font-semibold px-3 py-1 rounded-full mb-3">
              Product 2
            </span>
            <h3 className="text-lg font-bold text-white mb-2">
              Target vs Comparables
            </h3>
            <p className="text-sm text-brand-grey leading-relaxed mb-4 flex-1">
              Show landlords your professionalism with data-backed rent
              recommendations. Or justify a rent increase to tenants with
              tribunal-ready comparables. One report, two conversations
              &mdash; both backed by live market evidence.
            </p>
            <Link
              to="/target-vs-comparable"
              className="inline-block bg-brand-blue text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity text-center"
            >
              Get Report
            </Link>
            <a
              href="/sample-target-vs-comparable.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-grey hover:text-brand-cyan transition-colors text-center mt-3 underline underline-offset-2"
            >
              &#x1F4C4; View sample report
            </a>
          </div>
        </div>
      </section>

      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
