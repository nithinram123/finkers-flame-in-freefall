import { PsiTag } from './PsiSources.jsx';
import { useState } from 'react';
import { rangeLabel } from '../lib/evidence.mjs';
import { Badge, Empty, Notice, PageTitle, SourceLink } from './ui.jsx';
import Records from './Records.jsx';

export default function Detail({ dataset, accession, selected, toggleCompare, onInspect }) {
  const [tab, setTab] = useState('Overview');
  const investigation = dataset.investigations.find((item) => item.accession === accession);
  if (!investigation)
    return (
      <Empty title="Investigation not found">
        <a href="#/investigations">Return to the library</a>
      </Empty>
    );
  const records = dataset.records.filter((record) => record.accession === accession);
  const tables = dataset.tables.filter((table) => table.accession === accession);
  return (
    <>
      <a className="back-link" href="#/investigations">
        ← All investigations
      </a>
      <PageTitle
        eyebrow={`${accession} / ${investigation.projectType}`}
        title={investigation.name}
        description={investigation.title}
      >
        <SourceLink investigation={investigation} />
        <button
          disabled={selected.length >= 3 && !selected.includes(accession)}
          onClick={() => toggleCompare(accession)}
        >
          {selected.includes(accession) ? 'Remove from comparison' : 'Add to comparison'}
        </button>
      </PageTitle>
      <div className="card-tags">
        <Badge>{investigation.fuelType}</Badge>
        {investigation.areas.map((area) => (
          <Badge key={area} tone={area.toLowerCase()}>
            {area}
          </Badge>
        ))}
        <span>{investigation.hardwareGroup}</span>
      </div>
      <nav className="tabs" aria-label="Investigation sections">
        {['Overview', 'Test records', 'Sources'].map((item) => (
          <button
            key={item}
            className={tab === item ? 'active' : ''}
            aria-current={tab === item ? 'page' : undefined}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === 'Overview' && (
        <>
          <section className="plain-summary">
            <span className="eyebrow">Plain-English overview · SI-assisted</span>
            <h2>What this investigation tested</h2>
            <p>{investigation.summary}</p>
            <p className="muted">
              This overview describes the study design. Outcomes below come from the supplied table;
              objectives and hypotheses are not findings.
            </p>
          </section>
          <dl className="conditions-strip">
            <div>
              <dt>Initial ambient oxygen</dt>
              <dd>{rangeLabel(investigation.oxygenRange, '%')}</dd>
            </div>
            <div>
              <dt>Initial pressure</dt>
              <dd>{rangeLabel(investigation.pressureRange, 'kPa')}</dd>
            </div>
            <div>
              <dt>Measured airflow</dt>
              <dd>{rangeLabel(investigation.airflowRange, 'cm/s')}</dd>
            </div>
            <div>
              <dt>Test records</dt>
              <dd>{investigation.testRecordCount}</dd>
            </div>
          </dl>
          {records.some((record) => record.oxygenBasis === 'burner oxidizer') && (
            <Notice>
              Inverse-flame oxygen values describe the burner oxidizer stream. The ambient oxygen
              range above includes only normal-flame records.
            </Notice>
          )}
          <div className="detail-columns">
            <section>
              <h2>Objectives</h2>
              <p className="source-prose">
                {investigation.objectives || 'No objectives in the supplied metadata.'}
              </p>
              <h2>Method & conditions</h2>
              <p className="source-prose">
                {investigation.approach || 'No method in the supplied metadata.'}
              </p>
            </section>
            <aside className="evidence-aside">
              <h2>What the table reports</h2>
              {Object.entries(investigation.outcomes).length ? (
                <ul className="outcome-list">
                  {Object.entries(investigation.outcomes).map(([outcome, count]) => (
                    <li key={outcome}>
                      <span>{outcome}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Individual test outcomes are unavailable in this snapshot.</p>
              )}
              <p className="muted">
                Counts exclude exact duplicate rows. A missing outcome does not imply successful
                burning.
              </p>
              <h2>Measurements & instruments</h2>
              {investigation.sensorEvidence.length ? (
                investigation.sensorEvidence.map((evidence, index) => <p key={index}>{evidence}</p>)
              ) : (
                <p>See the NASA method and source documentation for instrument details.</p>
              )}
              <h2>Earth applications</h2>
              <p>{investigation.earthBenefits || 'No Earth-benefit statement in this metadata.'}</p>
            </aside>
          </div>
        </>
      )}
      {tab === 'Test records' && (
        <>
          <Notice>
            All nonempty source rows are available here, including summaries, notes and flagged
            duplicates. Open a row to inspect its original column values.
          </Notice>
          <Records
            records={records}
            tables={dataset.tables}
            key={accession}
            onInspect={onInspect}
          />
        </>
      )}
      {tab === 'Sources' && (
        <section className="source-prose">
          <h2>NASA source record</h2>
          <p>
            <SourceLink investigation={investigation} />
          </p>
          {investigation.doi && (
            <p>
              <a href={`https://doi.org/${investigation.doi}`} target="_blank" rel="noreferrer">
                Dataset DOI: {investigation.doi}
              </a>
            </p>
          )}
          <h2>Original experimental tables</h2>
          {tables.length ? (
            <ul>
              {tables.map((table) => (
                <li key={table.id}>
                  <a href={`/data/${encodeURIComponent(table.file)}`} download>
                    {table.file}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No CSV table supplied.</p>
          )}
          <h2>Selected publications</h2>
          <ul>
            {investigation.publications.slice(0, 12).map((publication, index) => (
              <li key={index}>
                {publication.doi ? (
                  <a href={`https://doi.org/${publication.doi}`} target="_blank" rel="noreferrer">
                    {publication.title}
                  </a>
                ) : (
                  publication.title
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
