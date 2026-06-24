export default function Footer() {
  return (
    <footer className="border-t border-navy/6 bg-navy text-brand-grey">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand + Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <picture>
              <source srcSet="/logo-dark.webp" type="image/webp" />
              <img
                src="/logo-dark.png"
                alt="Nestflo"
                className="h-10 w-auto mb-4"
              />
            </picture>
            <p className="text-xs leading-relaxed mb-4 max-w-xs">
              HMO Market Intelligence for HMO landlords, letting agents and
              developers. Proudly built in Bristol, UK.
            </p>
            <div className="text-xs space-y-1">
              <p>
                <a
                  href="mailto:hello@nestflo.ai"
                  className="hover:text-white transition-colors"
                >
                  hello@nestflo.ai
                </a>
              </p>
              <p>
                <a href="tel:03301338626" className="hover:text-white transition-colors">
                  0330 133 8626
                </a>
              </p>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Products
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="/market-reports" className="hover:text-white transition-colors">
                  HMO Market Reports
                </a>
              </li>
              <li>
                <a href="/target-vs-comparable" className="hover:text-white transition-colors">
                  Target vs Comparables
                </a>
              </li>
              <li>
                <a
                  href="https://spareroom-automations.listsync.co.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  SpareRoom Automations
                </a>
              </li>
              <li>
                <a
                  href="https://nestflo.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Nestflo.ai
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">
              Company
            </h4>
            <address className="text-xs not-italic leading-relaxed mb-3">
              NESTFLO LIMITED<br />
              Unit 103, Filwood Green Business Park<br />
              1 Filwood Park Lane<br />
              Bristol, England<br />
              BS4 1ET<br />
              United Kingdom
            </address>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://nestflo.ai/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a
                  href="https://nestflo.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://nestflo.ai/cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-8 pt-6 text-xs text-center sm:text-left">
          &copy; {new Date().getFullYear()} NESTFLO LIMITED. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
