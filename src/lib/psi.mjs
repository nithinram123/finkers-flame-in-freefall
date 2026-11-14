import { isTest } from './evidence.mjs';
import { isPaired } from './habitat.mjs';
import { kPaPerAtm } from './scenario.mjs';

const range = (values) => (values.length ? [Math.min(...values), Math.max(...values)] : null);
const numbers = (rows, key) => rows.map((row) => row[key]?.value).filter(Number.isFinite);
const areaFor = (item) => {
  if (item.areas.includes('Detection')) return 'detection';
  if (item.areas.includes('Suppression') && !item.areas.includes('Prevention'))
    return 'suppression';
  if (item.areas.includes('Prevention')) return 'prevention';
  return item.fuelType === 'Analysis' ? 'analysis' : 'fundamental';
};

export function buildPsi(dataset) {
  const tests = dataset.records.filter(isTest);
  return {
    investigations: dataset.investigations.map((item) => {
      const rows = tests.filter((row) => row.accession === item.accession);
      const ambient = rows.filter((row) => row.oxygenBasis === 'ambient');
      return {
        acc: item.accession,
        acronym: item.acronym || item.name,
        title: item.title,
        area: areaFor(item),
        tier: rows.some(isPaired)
          ? 'Paired cabin measurements'
          : rows.length
            ? 'Test records'
            : 'Investigation metadata',
        state: item.flightPlatform || null,
        o2: range(numbers(ambient, 'oxygen')),
        p: range(numbers(ambient, 'pressure').map((value) => value / kPaPerAtm)),
        flow: range(numbers(rows, 'airflow')),
        fuels: [...new Set(rows.map((row) => row.fuel).filter(Boolean))],
        tests: rows.length,
        objectives: item.objectives || item.summary,
        earth: item.earthBenefits || null,
        psi: item.psiPage,
        doi: item.doi || null,
        pubs: item.publications || [],
      };
    }),
    tests: tests.map((row) => ({
      id: row.id,
      acc: row.accession,
      o2: row.oxygenBasis === 'ambient' ? row.oxygen.value : null,
      p: row.pressure.value === null ? null : row.pressure.value / kPaPerAtm,
      out: row.outcome || null,
      fuel: row.fuel || null,
    })),
  };
}
