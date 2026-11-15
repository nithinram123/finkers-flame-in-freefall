import { isTest, searchEvidence } from './evidence.mjs';
import { questionScenario, scenarioCoverage } from './scenario.mjs';
import { coverageSummary } from './psi-summary.mjs';

const key = (text) => (text ?? '').toLowerCase().replace(/[–—]/g, '-');
const normalize = (value) => Number(value.toFixed(3));
const contains = (text, term) =>
  (' ' + key(text).replace(/[^a-z0-9-]+/g, ' ') + ' ').includes(' ' + key(term) + ' ');
const usableMeasurement = (row, field) =>
  Number.isFinite(row[field]?.value) &&
  (field !== 'oxygen' || row.oxygenBasis === 'ambient') &&
  (field !== 'pressure' || row.pressure.value > 0);

function queryScope(dataset, question) {
  const query = key(question).replace(/\bpsi\s*-?\s*(\d+)/g, 'psi-$1');
  const named = dataset.investigations.filter(
    ({ accession, acronym, name }) =>
      contains(query, accession) ||
      (accession === 'PSI-102'
        ? /\bSAME\b(?!-)/.test(question)
        : (acronym && contains(query, acronym.replace(/^ACME[ /]/, ''))) ||
          (name && contains(query, name))),
  );
  const explicit = [...new Set((query.match(/\bpsi-\d+\b/g) || []).map((id) => id.toUpperCase()))];
  const unknown = explicit.filter((id) => !named.some(({ accession }) => id === accession));
  const fuels = [...new Set(dataset.records.map(({ fuel }) => fuel))].filter(
    (fuel) => fuel?.length > 2 && /^[a-z0-9 -]+$/i.test(fuel) && contains(query, fuel),
  );
  const outcomes = [
    [/\b(extinction|extinguished|extinguish|went out)\b/, 'Extinction'],
    [/\b(disruption|disrupted)\b/, 'Disruption'],
    [/\b(completion|completed burn)\b/, 'Completion'],
  ]
    .filter(([pattern]) => pattern.test(query))
    .map(([, outcome]) => outcome);
  return { named, unknown, fuels, outcomes };
}

function measurementRange(rows, field) {
  const values = rows.filter((row) => usableMeasurement(row, field)).map((row) => row[field].value);
  return values.length
    ? {
        min: normalize(Math.min(...values)),
        max: normalize(Math.max(...values)),
        count: values.length,
      }
    : null;
}

function sampleScope(rows) {
  const sorted = [...rows].sort((a, b) => a.accession.localeCompare(b.accession) || a.row - b.row);
  const seen = new Set();
  const examples = sorted.filter(({ accession }) => {
    if (seen.has(accession)) return false;
    seen.add(accession);
    return true;
  });
  for (const field of ['oxygen', 'pressure']) {
    const values = sorted
      .filter((row) => usableMeasurement(row, field))
      .sort((a, b) => a[field].value - b[field].value);
    if (values.length) examples.push(values[0], values.at(-1));
  }
  return [...new Map([...examples, ...sorted].map((row) => [row.id, row])).values()];
}

export function analystEvidence(dataset, question, scenario) {
  const habitat = scenario || questionScenario(question);
  const coverage = habitat ? scenarioCoverage(dataset.records, habitat) : null;
  const nearby = coverage?.nearby || [];
  const closest = nearby.slice().sort((a, b) => {
    const distance = (row) =>
      Math.hypot(
        (row.oxygen.value - habitat.oxygen) / 6,
        (row.pressure.value - habitat.pressure) / 15.2,
      );
    return distance(a) - distance(b);
  });
  const lookup = new Map(dataset.tables.map((table) => [table.id, table.file]));
  const names = new Map(dataset.investigations.map((item) => [item.accession, item.name]));
  const scope = queryScope(dataset, question);
  const accessions = new Set([...scope.named.map(({ accession }) => accession), ...scope.unknown]);
  const scoped = accessions.size || scope.fuels.length || scope.outcomes.length;
  const pool = scoped
    ? (coverage ? coverage.nearby : dataset.records).filter(
        (row) =>
          isTest(row) &&
          (!accessions.size || accessions.has(row.accession)) &&
          (!scope.fuels.length || scope.fuels.includes(row.fuel)) &&
          (!scope.outcomes.length ||
            scope.outcomes.some((outcome) => key(outcome) === key(row.outcome))),
      )
    : null;
  const tally = pool
    ? {
        count: pool.length,
        oxygen: measurementRange(pool, 'oxygen'),
        pressure: measurementRange(pool, 'pressure'),
        nonpositivePressure: pool.filter(
          ({ pressure }) => Number.isFinite(pressure?.value) && pressure.value <= 0,
        ).length,
      }
    : null;
  const picks = [
    ...closest.filter(
      (row, index) => closest.findIndex((item) => item.accession === row.accession) === index,
    ),
    ...(!coverage && !pool ? searchEvidence(dataset, question, 12) : []),
    ...closest,
  ];
  const relevant = pool
    ? sampleScope(pool)
    : [...new Map(picks.map((row) => [row.id, row])).values()];
  // A named fuel, investigation or outcome constrains retrieval. Do not fill
  // remaining slots with rows that fail the question's stated criteria.
  const rows = relevant.slice(0, 12).map((row) => ({
    ...row,
    file: lookup.get(row.tableId),
    investigation: names.get(row.accession),
  }));
  const archive =
    !scoped &&
    !habitat &&
    /\b(how many|number of|count of)\b/i.test(question) &&
    /\b(archive|snapshot|dataset|collection|overall|in total)\b/i.test(question) &&
    !/\b(oxygen|pressure|burn times?|reported|outcomes?)\b/i.test(question)
      ? /\binvestigations?\b/i.test(question)
        ? { count: dataset.stats.investigations, label: 'investigations' }
        : /\b(tests?|test records?)\b/i.test(question)
          ? { count: dataset.stats.testRecords, label: 'classified test records' }
          : null
      : null;
  return { habitat, coverage, rows: archive ? [] : rows, tally, scope, archive };
}

export function evidenceReadout({ coverage, tally, scope, archive }) {
  return {
    coverage: coverage ? coverageSummary(coverage) : null,
    matches: tally?.count ?? null,
    filters: [
      ...scope.named.map(({ accession, name }) => name + ' [' + accession + ']'),
      ...scope.unknown,
      ...scope.fuels,
      ...scope.outcomes,
    ],
    archive,
  };
}

function rangeText(range, unit) {
  return range.min === range.max ? `${range.min}${unit}` : `${range.min}–${range.max}${unit}`;
}

export function offlineAssessment({ habitat, coverage, rows, scope, tally, archive }) {
  if (archive)
    return `The NASA PSI snapshot contains ${archive.count.toLocaleString('en')} ${archive.label}.`;
  const parts = [];
  if (coverage) {
    const { close, wider } = coverageSummary(coverage);
    parts.push(
      `In the NASA snapshot, ${close} tests match the close oxygen and pressure window for ${habitat.name} (${habitat.oxygen}% oxygen, ${normalize(habitat.atm)} atm). ${wider} additional tests fall in the wider window. These counts do not establish cabin fire risk.`,
    );
  }
  if (tally) {
    const labels = [
      ...scope.named.map(({ accession }) => accession),
      ...scope.unknown,
      ...scope.fuels,
      ...scope.outcomes,
    ];
    parts.push(
      `The snapshot contains ${tally.count} test records matching ${labels.join(' · ')}${coverage ? ' within the wider cabin window' : ''}.`,
    );
    if (tally.oxygen) parts.push(`Reported ambient oxygen: ${rangeText(tally.oxygen, '%')}.`);
    if (tally.pressure)
      parts.push(`Reported initial pressure: ${rangeText(tally.pressure, ' kPa')}.`);
    if (tally.nonpositivePressure)
      parts.push(
        `Excluded ${tally.nonpositivePressure} nonpositive pressure reading${tally.nonpositivePressure === 1 ? '' : 's'} from the pressure range.`,
      );
  }
  if (parts.length) return parts.join(' ');
  if (!rows.length)
    return 'No matching records were found. Try an experiment name, fuel or PSI accession.';
  const first = rows[0];
  return `The search returned related records, including ${first.investigation} [${first.accession}, CSV row ${first.row}]. Use the source rows to check what they measured. The retrieved records alone do not support a general fire safety conclusion.`;
}
