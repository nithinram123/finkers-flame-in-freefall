import { isTest } from './evidence.mjs';

export const atmosphereSource = 'https://ntrs.nasa.gov/citations/20260003925';
export const habitatProfiles = [
  {
    id: 'iss',
    name: 'International Space Station',
    short: 'ISS',
    description: 'An orbiting laboratory',
    gravity: 'Microgravity',
    oxygen: 21,
    pressure: 101.3,
    nominal: true,
  },
  {
    id: 'spacecraft',
    name: 'Crewed spacecraft',
    short: 'Spacecraft',
    description: 'A cabin in flight',
    gravity: 'Microgravity',
    oxygen: 21,
    pressure: 101.3,
  },
  {
    id: 'lunar',
    name: 'Lunar habitat',
    short: 'Lunar habitat',
    description: 'A base on the Moon',
    gravity: 'Lunar gravity',
    oxygen: 30,
    pressure: 70.3,
    brief: true,
  },
  {
    id: 'rover',
    name: 'Pressurised rover',
    short: 'Rover',
    description: 'A cabin on the lunar surface',
    gravity: 'Lunar gravity',
    oxygen: 34,
    pressure: 56.5,
    exploration: true,
  },
  {
    id: 'mars',
    name: 'Mars habitat',
    short: 'Mars habitat',
    description: 'A base on the Martian surface',
    gravity: 'Martian gravity',
    oxygen: 26.5,
    pressure: 70.3,
    exploration: true,
  },
];
export const findHabitat = (id) => habitatProfiles.find((habitat) => habitat.id === id);
export const cabinPoint = { oxygen: 21, pressure: 101.3 };
export const isPaired = (row) =>
  isTest(row) &&
  row.oxygenBasis === 'ambient' &&
  Number.isFinite(row.oxygen.value) &&
  Number.isFinite(row.pressure.value) &&
  row.pressure.value > 0;
export function habitatWindow(habitat) {
  return {
    x1: habitat.oxygen - 2,
    x2: habitat.oxygen + 2,
    y1: habitat.pressure * 0.9,
    y2: habitat.pressure * 1.1,
  };
}
export function inWindow(row, window) {
  return (
    row.oxygen.value >= window.x1 &&
    row.oxygen.value <= window.x2 &&
    row.pressure.value >= window.y1 &&
    row.pressure.value <= window.y2
  );
}

export function rankInvestigations(dataset, habitat) {
  const window = habitatWindow(habitat);
  const paired = dataset.records.filter(isPaired);
  return dataset.investigations
    .map((investigation) => {
      const rows = paired.filter((row) => row.accession === investigation.accession);
      const matches = rows.filter((row) => inWindow(row, window));
      const nearest = rows.reduce(
        (best, row) => {
          const distance = Math.hypot(
            (row.oxygen.value - habitat.oxygen) / 2,
            Math.log(row.pressure.value / habitat.pressure) / Math.log(1.1),
          );
          return distance < best.distance ? { row, distance } : best;
        },
        { row: null, distance: Infinity },
      );
      return { investigation, matches, pairedCount: rows.length, ...nearest };
    })
    .sort(
      (a, b) =>
        Number(b.matches.length > 0) - Number(a.matches.length > 0) ||
        a.distance - b.distance ||
        b.matches.length - a.matches.length ||
        a.investigation.name.localeCompare(b.investigation.name),
    );
}

export function coverage(records) {
  return {
    total: records.length,
    oxygen: records.filter((row) => Number.isFinite(row.oxygen.value)).length,
    pressure: records.filter((row) => Number.isFinite(row.pressure.value)).length,
    outcome: records.filter((row) => row.outcome && row.outcome !== 'Not reported').length,
    ranges: records.filter((row) =>
      [row.oxygen, row.pressure, row.airflow, row.burnTime].some(
        ({ raw, value }) =>
          value === null && /\d\s*(?:%\s*)?(?:–|—|-|\bto\b|;|\band\b)\s*\d/i.test(raw || ''),
      ),
    ).length,
  };
}

export function fuelLabel(row) {
  return row.fuel?.trim() || 'Fuel unreported';
}

export function fuelGroups(rows) {
  const counts = new Map();
  for (const row of rows) {
    const name = fuelLabel(row);
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  const totals = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const groups = totals.slice(0, 4).map(([label, count], index) => ({ label, count, index }));
  if (totals.length > 4)
    groups.push({
      label: 'Other fuels or materials',
      count: totals.slice(4).reduce((n, [, count]) => n + count, 0),
      index: 4,
    });
  return groups;
}
