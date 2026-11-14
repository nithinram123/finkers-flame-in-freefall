import { Notice, PageTitle } from './ui.jsx';

export default function Methods({ dataset }) {
  return (
    <>
      <PageTitle
        eyebrow="Sources & methods"
        title="Follow every number."
        description="A reproducible data pipeline connects NASA source tables to this explorer."
      />
      <div className="pipeline">
        <span>NASA PSI snapshot</span>
        <span aria-hidden="true">→</span>
        <span>Typed normalization</span>
        <span aria-hidden="true">→</span>
        <span>Source-linked explorer</span>
      </div>
      <section className="methods-content">
        <h2>What is included</h2>
        <p>
          The supplied archive contains {dataset.stats.investigations} investigations and{' '}
          {dataset.stats.tables} CSVs. Its {dataset.stats.sourceRows.toLocaleString('en')} data rows
          include {dataset.stats.blankRows} blank rows. The dashboard retains{' '}
          {dataset.stats.records.toLocaleString('en')} nonempty records and identifies{' '}
          {dataset.stats.testRecords.toLocaleString('en')} nonduplicate test records. These
          classifications do not establish the count of distinct physical experiments.
        </p>
        <h2>How values are cleaned</h2>
        <p>
          Recognized scalar measurements become numbers. Oxygen mole fractions become percentages,
          atmospheres and mmHg become kPa, and airflow remains cm/s. Ranges, lists and unresolved
          notes stay textual. Fan-display settings are not treated as airflow. Missing values remain
          empty; material names are not inferred from neighbouring rows.
        </p>
        <h2>What counts as evidence</h2>
        <p>
          Daily summaries, parameter summaries, samples, notes, calibrations and references are
          identified separately. The {dataset.stats.duplicates} exact duplicate source rows remain
          flagged and are excluded from charts and test-record counts. Objectives explain intended
          research; they are not experimental conclusions.
        </p>
        <h2>Scientific limits</h2>
        <p>
          Initial oxygen, initial pressure and measurement location are explicit. In inverse flames,
          oxygen delivered through the burner is not ambient cabin oxygen. Differences in fuel,
          geometry, apparatus, gravity and methods prevent a simple pooled interpretation. This
          explorer does not validate materials or predict habitat fire risk.
        </p>
        <Notice>
          The supplied brief reports no partial-gravity combustion data in this PSI collection.
          Microgravity observations require further analysis before application to Moon or Mars
          surface conditions.
        </Notice>
        <h2>Snapshot & reproducibility</h2>
        <p>
          {dataset.source}. Prepared {dataset.preparedDate}. Original fetch date unknown. The source
          manifest records SHA-256 checksums, row counts and classifications. Large videos and
          sensor files remain in the NASA repository.
        </p>
        <p>
          <a href="/data/source-manifest.json" target="_blank" rel="noreferrer">
            View source manifest
          </a>{' '}
          ·{' '}
          <a href="/data/combustion.json" download>
            Download normalized dataset
          </a>
        </p>
        <h2>Use of Super Intelligence</h2>
        <p>
          {dataset.siDisclosure} OpenAI Codex assisted implementation, normalization, documentation
          and plain-English descriptions. Source measurements and outcomes come from NASA. Ask sends
          retrieved source rows to Claude when the server is configured. Each displayed claim must
          cite a retrieved row. Local evidence search remains available when Claude is unavailable.
        </p>
        <h2>Tools & attribution</h2>
        <p>
          NASA Physical Sciences Informatics (PSI) provides research metadata and experimental
          tables. React, Vite, Lucide and csv-parse support this application. The interface uses
          Inter and follows the project's briefing design. This is an independent Space Apps
          project.
        </p>
      </section>
    </>
  );
}
