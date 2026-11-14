import { findHabitat } from './habitat.mjs';

export const kPaPerAtm = 101.325;
export const scenarioProfiles = [
  { id: 'station', name: 'Spacecraft / Space Station', oxygen: 21, atm: 1, gravityG: 0 },
  { id: 'moon', name: 'Moon Base', oxygen: 34, atm: 0.57, gravityG: 0.16 },
  { id: 'rover', name: 'Pressurized Rover', oxygen: 34, atm: 0.57, gravityG: 0.16 },
  {
    id: 'mars',
    name: 'Mars Base',
    oxygen: 34,
    atm: 0.57,
    gravityG: 0.38,
    note: 'Assumed, same air as the Moon',
  },
  { id: 'custom', name: 'Custom', oxygen: 21, atm: 1, gravityG: 0 },
];

export function readScenario(query) {
  const preset = query.get('preset');
  const profile = scenarioProfiles.find(({ id }) => id === preset) || scenarioProfiles[4];
  function number(name, fallback, min, max) {
    const raw = query.get(name);
    const value = Number(raw);
    return raw?.trim() && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  }
  const oxygen = number('oxygen', profile.oxygen, 0, 100);
  const atm = number('pressure', profile.atm, 0.01, 10);
  const gravityG = number('gravity', profile.gravityG, 0, 5);
  return {
    ...profile,
    name: profile.id === 'custom' ? 'Custom habitat' : profile.name,
    oxygen,
    atm,
    pressure: atm * kPaPerAtm,
    gravityG,
    gravity:
      gravityG === 0
        ? 'Microgravity'
        : gravityG === 0.16
          ? 'Lunar gravity'
          : gravityG === 0.38
            ? 'Martian gravity'
            : gravityG + ' g',
    nominal: profile.id === 'station' && oxygen === 21 && atm === 1 && gravityG === 0,
  };
}

export function questionScenario(question) {
  const oxygen = question.match(/(\d+(?:\.\d+)?)\s*%\s*(?:oxygen|o(?:2|₂))/i);
  const pressure = question.match(/(\d+(?:\.\d+)?)\s*atm\b/i);
  const habitat = /\bmoon|lunar/i.test(question)
    ? 'moon'
    : /\bmars|martian/i.test(question)
      ? 'mars'
      : null;
  if (!habitat && !(oxygen && pressure)) return null;
  const query = new URLSearchParams({ preset: habitat || 'custom' });
  if (oxygen) query.set('oxygen', oxygen[1]);
  if (pressure) query.set('pressure', pressure[1]);
  return readScenario(query);
}

export function legacyScenario(id) {
  const habitat = findHabitat(id);
  if (!habitat) return null;
  return {
    ...habitat,
    atm: habitat.pressure / kPaPerAtm,
    gravityG:
      habitat.gravity === 'Lunar gravity' ? 0.16 : habitat.gravity === 'Martian gravity' ? 0.38 : 0,
  };
}
