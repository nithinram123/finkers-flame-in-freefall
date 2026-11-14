import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartRecords, isTest } from '../lib/evidence.mjs';
import { Empty, Field, Notice, PageTitle } from './ui.jsx';
import Records from './Records.jsx';

const metrics = {
  oxygen: ['Initial oxygen', '%'],
  pressure: ['Initial pressure', 'kPa'],
  airflow: ['Airflow', 'cm/s'],
  burnTime: ['Burn duration', 's'],
};
const colors = ['#146477', '#a55c28', '#566e98', '#55675c', '#8b556b', '#6b6577'];

function PointTooltip({ active, payload, x, y }) {
  const record = payload?.[0]?.payload;
  if (!active || !record) return null;
  return (
    <div className="chart-tooltip">
      <strong>
        {record.accession} · {record.label}
      </strong>
      <span>{record.fuel || 'Fuel not reported'}</span>
      <span>
        {metrics[x][0]}: {record[x].raw} → {record.x} {metrics[x][1]}
      </span>
      <span>
        {metrics[y][0]}: {record[y].raw} → {record.y} {metrics[y][1]}
      </span>
      <span>
        {record.outcome} · source row {record.row}
      </span>
    </div>
  );
}

export default function Explorer({ dataset }) {
  const [accession, setAccession] = useState('PSI-69');
  const [x, setX] = useState('oxygen');
  const [y, setY] = useState('pressure');
  const [basis, setBasis] = useState('ambient');
  const plotted = useMemo(
    () =>
      chartRecords(dataset.records, { accession, basis, x, y }).map((record) => ({
        ...record,
        x: record[x].value,
        y: record[y].value,
      })),
    [dataset, accession, basis, x, y],
  );
  const eligible = dataset.records.filter(
    (record) => isTest(record) && (!accession || record.accession === accession),
  );
  const outcomes = [...new Set(plotted.map((record) => record.outcome))];
  return (
    <>
      <PageTitle
        eyebrow="Measured conditions"
        title="Explore the test data"
        description="Inspect source measurements. Open a point or table record to inspect the original values."
      />
      <div className="explorer-controls">
        <Field label="Investigation">
          <select value={accession} onChange={(event) => setAccession(event.target.value)}>
            <option value="">All investigations</option>
            {dataset.investigations
              .filter((item) => item.testRecordCount > 0)
              .map((item) => (
                <option value={item.accession} key={item.accession}>
                  {item.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Horizontal axis">
          <select value={x} onChange={(event) => setX(event.target.value)}>
            {Object.entries(metrics).map(([key, [name, unit]]) => (
              <option value={key} key={key}>
                {name} ({unit})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vertical axis">
          <select value={y} onChange={(event) => setY(event.target.value)}>
            {Object.entries(metrics).map(([key, [name, unit]]) => (
              <option value={key} key={key}>
                {name} ({unit})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Oxygen location">
          <select value={basis} onChange={(event) => setBasis(event.target.value)}>
            <option value="ambient">Ambient / chamber</option>
            <option value="burner oxidizer">Inverse burner stream</option>
          </select>
        </Field>
      </div>
      <Notice>
        {plotted.length} of {eligible.length} deduplicated test records have the selected scalar
        measurements{x === 'oxygen' || y === 'oxygen' ? ' and oxygen location' : ''}. Ranges,
        summaries and missing values are excluded.{' '}
        {basis === 'burner oxidizer' &&
          'Burner-stream oxygen cannot be interpreted as cabin oxygen.'}
      </Notice>
      <section className="chart-panel" aria-label={`${metrics[y][0]} against ${metrics[x][0]}`}>
        <div className="section-heading">
          <h2>
            {metrics[y][0]} vs. {metrics[x][0].toLowerCase()}
          </h2>
          <span className="muted">Colour: reported outcome</span>
        </div>
        {plotted.length ? (
          <>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 18, right: 24, bottom: 35, left: 18 }}>
                  <CartesianGrid vertical={false} stroke="#e8edef" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={metrics[x][0]}
                    unit={` ${metrics[x][1]}`}
                    tick={{ fontSize: 12 }}
                    label={{
                      value: `${metrics[x][0]} (${metrics[x][1]})`,
                      position: 'bottom',
                      offset: 16,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={metrics[y][0]}
                    unit={` ${metrics[y][1]}`}
                    tick={{ fontSize: 12 }}
                    width={85}
                  />
                  <Tooltip content={<PointTooltip x={x} y={y} />} />
                  {outcomes.map((outcome, index) => (
                    <Scatter
                      key={outcome}
                      name={outcome}
                      data={plotted.filter((record) => record.outcome === outcome)}
                      fill={colors[index % colors.length]}
                      fillOpacity={0.65}
                      onClick={(record) => {
                        if (record?.id) window.location.hash = `/record/${record.id}`;
                      }}
                      isAnimationActive={false}
                      cursor="pointer"
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              {outcomes.map((outcome, index) => (
                <span key={outcome}>
                  <i style={{ backgroundColor: colors[index % colors.length] }} />
                  {outcome} ({plotted.filter((record) => record.outcome === outcome).length})
                </span>
              ))}
            </div>
          </>
        ) : (
          <Empty title="No compatible measurements">
            Try another investigation or axis. Missing values remain unfilled.
          </Empty>
        )}
        <p className="chart-caption">
          Points represent source rows and can overlap. These observations do not estimate habitat
          fire probability. The table below provides a keyboard-accessible alternative.
        </p>
      </section>
      <Records
        records={plotted}
        tables={dataset.tables}
        title="Plotted source records"
        key={`${accession}-${x}-${y}-${basis}`}
      />
    </>
  );
}
