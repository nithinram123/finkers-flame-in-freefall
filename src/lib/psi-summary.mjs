import { isPaired } from './habitat.mjs';
import { scenarioCoverage } from './scenario.mjs';

export function snapshotSummary(dataset, cabin) {
  const coverage = cabin ? scenarioCoverage(dataset.records, cabin) : null;
  return {
    preparedDate: dataset.preparedDate,
    source: 'NASA Physical Sciences Informatics',
    sourceType: 'bundled snapshot',
    sourceUrl: 'https://psi.nasa.gov/physci/repo/search?q=combustion',
    investigations: dataset.stats.investigations,
    tables: dataset.stats.tables,
    testRecords: dataset.stats.testRecords,
    pairedRecords: coverage?.paired.length ?? dataset.records.filter(isPaired).length,
    coverage: coverage ? coverageSummary(coverage) : null,
  };
}

export function coverageSummary(coverage) {
  return {
    close: coverage.exact.length,
    wider: coverage.nearby.length - coverage.exact.length,
    outside: coverage.paired.length - coverage.nearby.length,
    paired: coverage.paired.length,
  };
}
