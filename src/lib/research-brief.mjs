import { kPaPerAtm, scenarioCoverage, readScenario } from './scenario.mjs';
import { coverageSummary } from './psi-summary.mjs';

export const station = readScenario(new URLSearchParams({ preset: 'station' }));
export const moon = readScenario(new URLSearchParams({ preset: 'moon' }));

export function cabinSummary(dataset, cabin, coverage = scenarioCoverage(dataset.records, cabin)) {
  const { exact, nearby } = coverage;
  const picked = exact.length ? exact : nearby;
  const distance = (row) =>
    Math.hypot(
      (row.oxygen.value - cabin.oxygen) / 2,
      (row.pressure.value - cabin.pressure) / (0.05 * kPaPerAtm),
    );
  const example = picked.reduce(
    (best, row) => (!best || distance(row) < distance(best) ? row : best),
    null,
  );
  const file = dataset.tables.find((table) => table.id === example?.tableId)?.file;
  return { ...coverageSummary(coverage), example, file, cabin };
}

export function cabinAir(cabin) {
  return cabin.oxygen + '% O₂ · ' + Number(cabin.atm.toFixed(3)) + ' atm';
}

export function briefMarkdown(dataset, primary, reference, origin, page) {
  const sections = [primary, reference].flatMap(
    ({ cabin, close, wider, outside, paired, example, file }) => [
      '## ' + cabin.name,
      '',
      cabinAir(cabin) + ' · ' + cabin.gravityG + ' g scenario',
      '',
      '- ' +
        close +
        ' close, ' +
        wider +
        ' wider only, ' +
        outside +
        ' outside the wider window, out of ' +
        paired +
        ' paired tests.',
      example
        ? '- Example ' +
          (close ? 'close' : 'wider-window') +
          ' observation: ' +
          example.accession +
          ' · ' +
          file +
          ' · CSV row ' +
          example.row +
          ' (' +
          origin +
          '/record/' +
          encodeURIComponent(example.id) +
          ').'
        : '- No paired record falls in either window.',
      '',
    ],
  );
  return [
    '# Finkers · Cabin evidence brief',
    '',
    'NASA PSI combustion snapshot prepared ' + dataset.preparedDate + '.',
    'Reproduce this comparison: ' + page,
    '',
    ...sections,
    '## Matching rules',
    '',
    'Close: ±2 oxygen percentage points and ±0.05 atm. Wider: ±6 points and ±0.15 atm, excluding close matches.',
    'Only nonduplicate test records with ambient oxygen and positive pressure enter the counts.',
    'Compare fuel, geometry, airflow and gravity before using these records to plan further testing.',
    'NASA PSI catalogue: https://psi.nasa.gov/physci/repo',
    '',
  ].join('\n');
}
