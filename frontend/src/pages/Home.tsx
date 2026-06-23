import ProductCard from '../components/ProductCard';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-4 tracking-tight">
          HMO Market Intelligence
        </h1>
        <p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto">
          Data-driven reports for landlords, investors, and agents navigating
          the UK HMO market.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <ProductCard
          title="HMO Market Reports"
          description="Get a data-driven snapshot of any UK HMO market. Compare room types, see P25/P50/P75 percentiles, and download a tribunal-ready evidence pack."
          to="/market-reports"
          badge="Product 1"
          sampleLabel="View Sample Report"
          sampleHref="https://drive.google.com/drive/u/0/folders/13jk7EpP0-CSl2Y2IgT94CyVusHP2QrKy"
        />
        <ProductCard
          title="HMO Target vs Comparables"
          description="Benchmark a specific SpareRoom listing against the local market. See if your rent is above, at, or below market with tribunal-ready comparables."
          to="/target-vs-comparable"
          badge="Product 2"
          sampleLabel="View Sample Report"
          sampleHref="https://drive.google.com/drive/u/0/folders/1cyZLP6iYsF_DHUT6EIcuH7H9R0N4Jq7E"
        />
        <ProductCard
          title="Target vs Comparables for New Landlords"
          description="Nestflo Market Intelligence finds you motivated landlords and compares the landlord's listing with similar listings in nearby locations — helping new landlords benchmark and position their property effectively."
          disabled
          badge="Coming Soon"
        />
      </div>
    </div>
  );
}
