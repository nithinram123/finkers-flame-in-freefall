import { buildPsi } from '../lib/psi.mjs';
import { useEffect } from 'react';
import PsiSources from './PsiSources.jsx';
import { Notice, PageTitle } from './ui.jsx';

export default function Methods({ dataset, claudeStatus }) {
  useEffect(() => {
    if (window.location.hash === '#apis') document.getElementById('apis')?.scrollIntoView();
  }, []);

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
        <section id="apis" aria-labelledby="apis-title">
          <h2 id="apis-title">Data and APIs</h2>
          <dl className="method-api-list">
            <div>
              <dt>NASA Physical Sciences Informatics (PSI)</dt>
              <dd>
                The explorer reads a bundled snapshot of NASA combustion metadata and CSVs. The
                project’s refresh script uses PSI’s <code>/geode-py/ws</code> search, investigation
                and study-download endpoints. The public dashboard serves the snapshot from{' '}
                <a href="/data/combustion.json">/data/combustion.json</a>.
                <a href="https://science.nasa.gov/physical-sciences-informatics-psi/history-of-physical-science-informatics/">
                  {' '}
                  NASA PSI reference
                </a>
                <details>
                  <summary>NASA endpoints used by the refresh script</summary>
                  <ul>
                    <li>
                      <code>GET /repo/search</code> searches for Combustion Science investigations.
                    </li>
                    <li>
                      <code>GET /repo/investigations/{'{accession}'}</code> retrieves metadata and
                      table references.
                    </li>
                    <li>
                      <code>GET /studies/{'{accession}'}/download</code> resolves the download link
                      for an original CSV.
                    </li>
                  </ul>
                </details>
              </dd>
            </div>
            <div>
              <dt>Dashboard coverage</dt>
              <dd>
                <a href="/api/evidence">GET /api/evidence</a> reports investigations, test records,
                and records with measured ambient oxygen and pressure. A cabin query such as{' '}
                <a href="/api/evidence?preset=moon">preset=moon</a> also returns the close,
                wider-only and outside-window counts from the same NASA snapshot.
              </dd>
            </div>
            <div>
              <dt>Live investigation check</dt>
              <dd>
                <a href="/api/evidence?accession=PSI-69">GET /api/evidence?accession=PSI-69</a>{' '}
                checks NASA’s current FLEX metadata and compares its listed filenames with the
                bundled tables. The Sources tab also compares a selected original CSV with NASA’s
                current file, cell by cell. Charts and research briefs use the dated CSV snapshot.
              </dd>
            </div>
            <div>
              <dt>Ask the Evidence</dt>
              <dd>
                <code>GET /api/ask</code> reports whether Claude is configured.
                <code> POST /api/ask</code> searches the NASA snapshot and returns original row
                citations. When Claude is configured, the service also passes the question,
                scenario, computed totals and retrieved rows to Anthropic’s{' '}
                <a href="https://platform.claude.com/docs/en/api/messages">Messages API</a>.
                Citation IDs are checked against retrieved rows. The browser can use its copy of the
                NASA snapshot if the search API is unavailable.
                <strong className="method-api-status">
                  {claudeStatus === true
                    ? 'This deployment: Claude configured'
                    : claudeStatus === false
                      ? 'This deployment: Server evidence search'
                      : 'This deployment: Checking connection'}
                </strong>
              </dd>
            </div>
          </dl>
        </section>
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
          retrieved source rows to Claude when the server is configured. A citation identifies the
          records Claude referenced. Check the raw rows when a claim matters.
        </p>
        <h2>Tools & attribution</h2>
        <p>
          NASA Physical Sciences Informatics (PSI) provides research metadata and experimental
          tables. React, Vite, Lucide and csv-parse support this application. The interface uses
          Inter and follows the project's briefing design. This is an independent Space Apps
          project.
        </p>
      </section>
      <PsiSources investigations={buildPsi(dataset).investigations} />
    </>
  );
}
