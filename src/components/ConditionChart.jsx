import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cabinPoint, fuelGroups, fuelLabel } from '../lib/habitat.mjs';

export const metrics = {
  oxygen: ['Initial oxygen', '%'],
  pressure: ['Initial pressure', 'kPa'],
  airflow: ['Airflow', 'cm/s'],
  burnTime: ['Burn duration', 's'],
};

function ticks(low, high, count) {
  return Array.from({ length: count }, (_, index) => low + ((high - low) * index) / (count - 1));
}
const format = (value) => Number(value.toPrecision(3)).toString();

function slicePath(x, y, radius, start, end) {
  const point = (angle) => `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
  return `M${x},${y}L${point(start)}A${radius},${radius} 0 ${end - start > Math.PI ? 1 : 0},1 ${point(end)}Z`;
}

export default function ConditionChart({
  records,
  x = 'oxygen',
  y = 'pressure',
  box,
  references,
  onInspect,
}) {
  const ref = useRef(null);
  const title = useId();
  const [width, setWidth] = useState(760);
  const [active, setActive] = useState(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, Math.round(entry.contentRect.width))),
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const groups = useMemo(() => fuelGroups(records), [records]);
  const showReference = references && x === 'oxygen' && y === 'pressure';
  const height = width < 480 ? 280 : 345;
  const plot = { left: 54, right: width - 18, top: 27, bottom: height - 46 };
  const transform = (value, key) => (key === 'pressure' ? Math.log10(value) : value);
  const invert = (value, key) => (key === 'pressure' ? 10 ** value : value);
  function domain(key, lowerBox, upperBox) {
    const values = records.map((row) => row[key].value);
    if (showReference) values.push(cabinPoint[key]);
    if (box) values.push(lowerBox, upperBox);
    if (!values.length) return [0, 1];
    const transformed = values.map((value) => transform(value, key));
    const low = Math.min(...transformed);
    const high = Math.max(...transformed);
    const minSpan = key === 'oxygen' ? 3 : key === 'pressure' ? 0.06 : 2;
    const pad = Math.max((high - low) * 0.1, minSpan / 2);
    return [key === 'pressure' ? low - pad : Math.max(0, low - pad), high + pad];
  }
  const xDomain = domain(x, box?.x1, box?.x2);
  const yDomain = domain(y, box?.y1, box?.y2);
  const scaleX = (value) =>
    plot.left +
    ((transform(value, x) - xDomain[0]) / (xDomain[1] - xDomain[0])) * (plot.right - plot.left);
  const scaleY = (value) =>
    plot.bottom -
    ((transform(value, y) - yDomain[0]) / (yDomain[1] - yDomain[0])) * (plot.bottom - plot.top);
  const groupIndex = new Map(groups.map(({ label, index }) => [label, index]));

  // Group adjacent markers by screen position. Each group keeps every original source row.
  const clusters = new Map();
  for (const row of records) {
    const px = scaleX(row[x].value);
    const py = scaleY(row[y].value);
    const id = [Math.round(px / 26), Math.round(py / 24)].join(':');
    const cluster = clusters.get(id) || { id, xTotal: 0, yTotal: 0, rows: [], counts: new Map() };
    const index = groupIndex.get(fuelLabel(row)) ?? 4;
    cluster.xTotal += px;
    cluster.yTotal += py;
    cluster.rows.push(row);
    cluster.counts.set(index, (cluster.counts.get(index) || 0) + 1);
    clusters.set(id, cluster);
  }
  const points = Array.from(clusters.values())
    .map((cluster) => ({
      ...cluster,
      px: cluster.xTotal / cluster.rows.length,
      py: cluster.yTotal / cluster.rows.length,
      group: cluster.counts.size === 1 ? cluster.counts.keys().next().value : 5,
    }))
    .sort((a, b) => b.rows.length - a.rows.length);
  const largest = points[0];
  const hovered = points.find(({ id }) => active === id);
  return (
    <div className="condition-chart" ref={ref}>
      {records.length ? (
        <>
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="group" aria-labelledby={title}>
            <title id={title}>
              {metrics[y][0]} by {metrics[x][0]}. Open a marker to inspect its evidence.
            </title>
            {ticks(...yDomain, 5).map((tick) => {
              const py = scaleY(invert(tick, y));
              return (
                <g key={tick}>
                  <path className="plot-grid" d={`M${plot.left},${py}H${plot.right}`} />
                  <text x={plot.left - 8} y={py + 4} textAnchor="end">
                    {format(invert(tick, y))}
                  </text>
                </g>
              );
            })}
            {ticks(...xDomain, width < 480 ? 4 : 6).map((tick) => (
              <text key={tick} x={scaleX(invert(tick, x))} y={plot.bottom + 18} textAnchor="middle">
                {format(invert(tick, x))}
              </text>
            ))}
            <path
              className="plot-axis"
              d={`M${plot.left},${plot.top}V${plot.bottom}H${plot.right}`}
            />
            <text x={plot.left} y={13}>
              {metrics[y][0]} ({metrics[y][1]}){y === 'pressure' ? ' · log scale' : ''}
            </text>
            <text x={(plot.left + plot.right) / 2} y={height - 7} textAnchor="middle">
              {metrics[x][0]} ({metrics[x][1]}){x === 'pressure' ? ' · log scale' : ''}
            </text>
            {showReference && (
              <g className="plot-reference">
                <path
                  d={`M${scaleX(21)},${plot.top}V${plot.bottom}M${plot.left},${scaleY(101.3)}H${plot.right}`}
                />
                <text x={Math.min(scaleX(21) + 5, width - 125)} y={plot.top + 11}>
                  Earth / nominal ISS
                </text>
              </g>
            )}
            {box && (
              <rect
                className="plot-box"
                x={scaleX(box.x1)}
                y={scaleY(box.y2)}
                width={scaleX(box.x2) - scaleX(box.x1)}
                height={scaleY(box.y1) - scaleY(box.y2)}
              >
                <title>Selected habitat comparison window</title>
              </rect>
            )}
            {[...points].reverse().map((point) => {
              const count = point.rows.length;
              const radius = Math.min(19, 5 + Math.sqrt(count - 1) * 1.9);
              let angle = -Math.PI / 2;
              const label = `${count} ${count === 1 ? 'record' : 'records'}, ${point.group === 5 ? 'mixed fuels' : groups.find(({ index }) => index === point.group)?.label}`;
              return (
                <g
                  key={point.id}
                  className={`plot-point fuel-tone-${point.group}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${label}`}
                  onMouseEnter={() => setActive(point.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(point.id)}
                  onBlur={() => setActive(null)}
                  onClick={() => onInspect(point.rows)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onInspect(point.rows);
                    }
                  }}
                >
                  <circle cx={point.px} cy={point.py} r={Math.max(radius, 12)} fill="transparent" />
                  <circle className="point-mark" cx={point.px} cy={point.py} r={radius} />
                  {point.group === 5 &&
                    [...point.counts]
                      .sort((a, b) => a[0] - b[0])
                      .map(([index, total]) => {
                        const start = angle;
                        angle += (2 * Math.PI * total) / count;
                        return (
                          <path
                            className={`fuel-slice fuel-tone-${index}`}
                            key={index}
                            d={slicePath(point.px, point.py, radius - 1, start, angle)}
                          />
                        );
                      })}
                  {count > 2 && (
                    <text
                      className="point-count"
                      x={point.px}
                      y={point.py + 3.5}
                      textAnchor="middle"
                    >
                      {count}
                    </text>
                  )}
                  <title>{label}</title>
                </g>
              );
            })}
            {largest?.rows.length > 1 && (
              <text
                className="plot-annotation"
                x={largest.px > width * 0.67 ? largest.px - 27 : largest.px + 27}
                y={Math.min(plot.bottom - 5, Math.max(plot.top + 26, largest.py - 13))}
                textAnchor={largest.px > width * 0.67 ? 'end' : 'start'}
              >
                {largest.rows.length} records here
              </text>
            )}
          </svg>
          <p className="chart-readout" aria-live="off">
            {hovered
              ? `${hovered.rows.length} source ${hovered.rows.length === 1 ? 'row' : 'rows'} · ${[...new Set(hovered.rows.map(fuelLabel))].slice(0, 2).join(', ')}`
              : `${metrics[y][0]} (${metrics[y][1]})${y === 'pressure' ? ' · log scale' : ''}. Select a marker to open its source.`}
          </p>
          <ul className="fuel-legend" aria-label="Fuel or material legend">
            {groups.map((group) => (
              <li key={group.label}>
                <i className={`fuel-tone-${group.index}`} />
                {group.label} <span>{group.count}</span>
              </li>
            ))}
            {points.some((point) => point.group === 5) && (
              <li>
                <i className="fuel-tone-5" />
                Mixed fuels in one cluster
              </li>
            )}
          </ul>
        </>
      ) : (
        <p className="chart-empty">No records have both selected measurements.</p>
      )}
    </div>
  );
}
