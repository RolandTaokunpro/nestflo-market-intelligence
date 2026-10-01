import { cityPath, districtPath, reportPath } from './marketDataLinks';
import { AUGUST_2026 } from './marketData';

const STEPS = [
  {
    level: 'Level 1',
    title: 'Month & year',
    description: 'National snapshot, one page per month.',
    path: reportPath(AUGUST_2026.key),
  },
  {
    level: 'Level 2',
    title: 'City',
    description: 'Every district in the city, latest month stamped.',
    path: cityPath('bristol'),
  },
  {
    level: 'Level 3',
    title: 'Postcode district',
    description: 'The data page: medians by room type, comparables, history.',
    path: districtPath('bristol', 'BS1'),
  },
];

/** Three-level navigation explainer with real example paths (AC-15). */
export default function NavigationSteps() {
  return (
    <section className="md-section" data-testid="md-sec-steps" aria-labelledby="md-steps-title">
      <p className="md-sec-eyebrow">Navigation</p>
      <h2 className="md-sec-title" id="md-steps-title">
        Three levels, always the same shape
      </h2>
      <p className="md-sec-sub">Month → city → postcode district.</p>
      <div className="md-steps">
        {STEPS.map((step, index) => (
          <div className="md-step" key={step.level} data-testid={`md-step-${index + 1}`}>
            <div className="md-step-num">{step.level}</div>
            <div className="md-step-title">{step.title}</div>
            <p className="md-step-desc">{step.description}</p>
            <a className="md-path" href={step.path}>
              {step.path}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
