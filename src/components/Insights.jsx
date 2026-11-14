import { PageTitle } from './ui.jsx';
import { isTest } from '../lib/evidence.mjs';
import { isPaired } from '../lib/habitat.mjs';

export function ResearchGaps({ dataset }) {
  const paired = dataset.records.filter(isPaired);
  const withoutPairs = dataset.investigations.filter(
    (item) => !paired.some((row) => row.accession === item.accession),
  );
  return (
    <>
      <PageTitle
        title="What hasn’t been tested?"
        description="See where the supplied NASA PSI snapshot leaves questions open."
      />
      <p>
        {withoutPairs.length} of {dataset.investigations.length} investigations lack a test row with
        both ambient oxygen and pressure.
      </p>
      <p>
        The supplied test rows do not establish combustion outcomes at lunar or Martian surface
        gravity.
      </p>
      <ul>
        {withoutPairs.map((item) => (
          <li key={item.accession}>
            <a href={'/investigation/' + item.accession}>
              {item.name} · {item.accession}
            </a>
          </li>
        ))}
      </ul>
      <a href="/scenario">Compare a specific habitat</a>
    </>
  );
}

function rankedCounts(labels) {
  const counts = new Map();
  for (const label of labels) counts.set(label, (counts.get(label) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function Distribution({ title, description, items, takeaway }) {
  const max = Math.max(1, ...items.map(([, count]) => count));
  return (
    <section className="insight-chart">
      <h2>{title}</h2>
      <p>{description}</p>
      <ul>
        {items.map(([label, count]) => (
          <li key={label}>
            <div>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
            <meter min={0} max={max} value={count} aria-label={label} />
          </li>
        ))}
      </ul>
      <p>{takeaway}</p>
    </section>
  );
}

export default function Insights({ dataset }) {
  const records = dataset.records.filter(isTest);
  const outcomes = rankedCounts(records.map((row) => row.outcome || 'Not reported'));
  const without = outcomes.find(([key]) => key === 'Not reported')?.[1] || 0;
  const paired = records.filter(isPaired);
  return (
    <>
      <PageTitle
        title="What does the NASA data cover?"
        description="Count the records and check where comparisons are possible."
      />
      <Distribution
        title="Which outcomes did NASA record?"
        description="Bars count deduplicated test rows by their recorded outcome."
        items={outcomes}
        takeaway={without + ' test records have no explicit outcome in the snapshot.'}
      />
      <Distribution
        title="Which investigations report paired cabin measurements?"
        description="Each bar counts investigations with or without a test row reporting both ambient oxygen and pressure."
        items={rankedCounts(
          dataset.investigations.map((item) =>
            paired.some((row) => row.accession === item.accession)
              ? 'Paired measurements'
              : 'No paired measurements',
          ),
        )}
        takeaway={paired.length + ' rows can be plotted against a cabin atmosphere.'}
      />
      <section className="insight-chart">
        <h2>Which gravity regimes are covered?</h2>
        <p>
          The supplied rows do not identify a measured gravity value consistently. The dataset
          supports no direct lunar or Martian surface-gravity comparison.
        </p>
        <a href="/research-gaps">Review the evidence gaps</a>
      </section>
    </>
  );
}
