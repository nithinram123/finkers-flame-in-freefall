export function locationRoute(location) {
  const hash = location.hash.startsWith('#/') ? location.hash.slice(1) : '';
  const url = new URL(hash || location.pathname + location.search, location.origin);
  const [route = 'habitats', id] = url.pathname.split('/').filter(Boolean);
  const query = new URLSearchParams(location.search);
  if (hash) for (const [name, value] of url.searchParams) query.set(name, value);
  return { route, id, query };
}

export const analystUrl = (question, scenario) => {
  const query = new URLSearchParams({ question });
  if (scenario) {
    query.set('preset', scenario.id);
    query.set('oxygen', scenario.oxygen);
    query.set('pressure', scenario.pressure / 101.325);
    query.set('gravity', scenario.gravityG);
  }
  return '/analyst?' + query;
};
