import { useMemo, useState } from 'react';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { filterInvestigations, rangeLabel } from '../lib/evidence.mjs';
import { Badge, Empty, Field, PageTitle, SourceLink } from './ui.jsx';

export default function Catalogue({ dataset, selected, toggleCompare }) {
  const [filters, setFilters] = useState({ query: '', fuel: '', area: '', hardware: '' });
  const filtered = useMemo(
    () => filterInvestigations(dataset.investigations, filters),
    [dataset, filters],
  );
  const setFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));
  return (
    <>
      <PageTitle
        eyebrow="Combustion research library"
        title="Find the evidence."
        description="Explore what NASA tested, how each experiment worked, and which results you can compare."
      >
        <a className="button primary" href="#/explorer">
          Explore test data <ArrowRight size={16} />
        </a>
      </PageTitle>
      <div className="stats-strip" aria-label="Dataset coverage">
        <div>
          <strong>{dataset.stats.investigations}</strong>
          <span>Investigations</span>
        </div>
        <div>
          <strong>{dataset.stats.tables}</strong>
          <span>Source tables</span>
        </div>
        <div>
          <strong>{dataset.stats.testRecords.toLocaleString('en')}</strong>
          <span>Test records · deduplicated</span>
        </div>
        <div>
          <strong>3</strong>
          <span>Safety areas</span>
        </div>
      </div>
      <section className="library-tools" aria-label="Filter investigations">
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search investigations</span>
          <input
            value={filters.query}
            onChange={(event) => setFilter('query', event.target.value)}
            placeholder="Search material, investigation or PSI ID…"
          />
        </label>
        <div className="filter-row">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <Field label="Fuel">
            <select
              value={filters.fuel}
              onChange={(event) => setFilter('fuel', event.target.value)}
            >
              <option value="">All fuel types</option>
              {['Solid', 'Liquid', 'Gas', 'Dust / aerosol', 'Analysis'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Safety area">
            <select
              value={filters.area}
              onChange={(event) => setFilter('area', event.target.value)}
            >
              <option value="">All safety areas</option>
              {['Prevention', 'Detection', 'Suppression', 'Research'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Hardware">
            <select
              value={filters.hardware}
              onChange={(event) => setFilter('hardware', event.target.value)}
            >
              <option value="">All hardware</option>
              {[
                ...new Set(
                  dataset.investigations.map((investigation) => investigation.hardwareGroup),
                ),
              ]
                .sort()
                .map((value) => (
                  <option key={value}>{value}</option>
                ))}
            </select>
          </Field>
          {(filters.query || filters.fuel || filters.area || filters.hardware) && (
            <button
              className="text-button"
              onClick={() => setFilters({ query: '', fuel: '', area: '', hardware: '' })}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>
      <div className="section-heading">
        <h2>
          Investigations <span className="muted">{filtered.length}</span>
        </h2>
        <span className="muted">Select 2–3 investigations to compare</span>
      </div>
      <div className="investigation-grid">
        {filtered.map((investigation) => (
          <article className="investigation-card" key={investigation.accession}>
            <div className="card-top">
              <span className="source-id">{investigation.accession}</span>
              <Badge>{investigation.fuelType}</Badge>
            </div>
            <h3>
              <a href={`#/investigation/${investigation.accession}`}>{investigation.name}</a>
            </h3>
            <p className="card-summary">{investigation.summary}</p>
            <div className="card-tags">
              {investigation.areas.map((area) => (
                <Badge key={area} tone={area.toLowerCase()}>
                  {area}
                </Badge>
              ))}
              <span className="muted">{investigation.hardwareGroup}</span>
            </div>
            <dl className="card-measurements">
              <div>
                <dt>Ambient O₂ · initial</dt>
                <dd>{rangeLabel(investigation.oxygenRange, '%')}</dd>
              </div>
              <div>
                <dt>Available records</dt>
                <dd>
                  {investigation.recordCount.toLocaleString('en')}{' '}
                  <span className="muted">/ {investigation.testRecordCount} test</span>
                </dd>
              </div>
            </dl>
            <footer>
              <SourceLink investigation={investigation}>Source</SourceLink>
              <label className="compare-check">
                <input
                  type="checkbox"
                  checked={selected.includes(investigation.accession)}
                  disabled={selected.length >= 3 && !selected.includes(investigation.accession)}
                  onChange={() => toggleCompare(investigation.accession)}
                />
                Compare
              </label>
              <a
                className="open-link"
                href={`#/investigation/${investigation.accession}`}
                aria-label={`Open ${investigation.name}`}
              >
                <ArrowRight size={18} />
              </a>
            </footer>
          </article>
        ))}
      </div>
      {!filtered.length && <Empty />}
      {selected.length > 0 && (
        <div className="compare-tray">
          <span>{selected.length} selected</span>
          <a className="button primary" href="#/compare">
            Compare investigations <ArrowRight size={15} />
          </a>
        </div>
      )}
    </>
  );
}
