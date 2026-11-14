import { searchEvidence } from './evidence.mjs';
import { questionScenario, scenarioCoverage } from './scenario.mjs';

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
  const picks = [
    ...closest.filter(
      (row, index) => closest.findIndex((item) => item.accession === row.accession) === index,
    ),
    ...searchEvidence(dataset, question, 12),
    ...closest,
  ];
  const rows = [...new Map(picks.map((row) => [row.id, row])).values()].slice(0, 12).map((row) => ({
    ...row,
    file: lookup.get(row.tableId),
    investigation: names.get(row.accession),
  }));
  return { habitat, coverage, rows };
}

export function offlineAssessment({ habitat, coverage, rows }) {
  if (coverage)
    return coverage.exact.length
      ? `${coverage.exact.length} paired tests fall within the selected oxygen and pressure window. Check the original fuel, test setup and gravity before applying the results to ${habitat.name}.`
      : `The NASA snapshot has no paired test inside the selected window around ${habitat.oxygen}% oxygen and ${Number(habitat.atm.toFixed(3))} atm. ${coverage.nearby.length} tests are nearby. Cabin fire risk remains uncertain.`;
  if (!rows.length)
    return 'No matching records were found. Try an experiment name, fuel or PSI accession.';
  const first = rows[0];
  return `The closest keyword match is ${first.investigation} [${first.accession}]. Open the original row to check the fuel, conditions and recorded result before drawing a conclusion.`;
}
