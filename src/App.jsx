import { Component, Suspense, lazy, useEffect, useState } from 'react';
import { ArrowUpRight, Flame } from 'lucide-react';
import Catalogue from './components/Catalogue.jsx';
import Detail from './components/Detail.jsx';
import Compare from './components/Compare.jsx';
import RecordDetail from './components/RecordDetail.jsx';
import RecordDrawer from './components/RecordDrawer.jsx';
import Ask from './components/Ask.jsx';
import Methods from './components/Methods.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { HabitatResults } from './components/Habitat.jsx';
import { findHabitat } from './lib/habitat.mjs';
import Home from './components/Home.jsx';
import Scenario from './components/Scenario.jsx';
import { locationRoute } from './lib/routes.mjs';
import { readScenario } from './lib/scenario.mjs';
import Navigation, { routeTitles } from './components/Navigation.jsx';
import Insights, { ResearchGaps } from './components/Insights.jsx';

const Explorer = lazy(() => import('./components/Explorer.jsx'));
const Neural = lazy(() => import('./components/Neural.jsx'));
const titles = {
  ...routeTitles,
  habitats: 'Method Overview',
  neural: 'Neural Evidence Lab',
};

function Loading() {
  return (
    <div className="loading-state" role="status">
      <h1>Loading NASA evidence…</h1>
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="empty" role="alert">
        <h1>The briefing could not open</h1>
        <button onClick={() => window.location.reload()}>Reload briefing</button>
      </div>
    ) : (
      this.props.children
    );
  }
}

function useRoute() {
  const read = () => {
    const route = locationRoute(window.location);
    if (route.route === 'scenarios') {
      window.history.replaceState(
        null,
        '',
        '/scenario' + (route.query.size ? '?' + route.query : ''),
      );
      return { ...route, route: 'scenario' };
    }
    return route;
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const routeKey = () =>
      window.location.pathname +
      window.location.search +
      (window.location.hash.startsWith('#/') ? window.location.hash : '');
    let current = routeKey();
    const update = () => {
      if (routeKey() === current) return;
      setRoute(read());
      current = routeKey();
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return route;
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('flame-comparison') || '[]');
      return Array.isArray(saved) ? saved.filter((id) => /^PSI-\d+$/.test(id)).slice(0, 3) : [];
    } catch {
      return [];
    }
  });
  const [inspect, setInspect] = useState(null);
  const [palette, setPalette] = useState(false);
  const [claude, setClaude] = useState(null);
  useEffect(() => {
    try {
      sessionStorage.setItem('flame-comparison', JSON.stringify(selected));
    } catch {
      /* Comparison remains available for the current page. */
    }
  }, [selected]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ask', { signal: controller.signal })
      .then((response) => response.json())
      .then((status) => setClaude(status.enabled === true))
      .catch(() => {
        if (!controller.signal.aborted) setClaude(false);
      });
    return () => controller.abort();
  }, []);
  const [lastHabitat, setLastHabitat] = useState(() => {
    try {
      return sessionStorage.getItem('flame-habitat');
    } catch {
      return null;
    }
  });
  const { route, id, query } = useRoute();
  const habitat = findHabitat(id) || (route === 'ask' ? findHabitat(lastHabitat) : null);
  const active =
    {
      results: 'scenario',
      ask: 'analyst',
      investigation: 'investigations',
      record: 'investigations',
      overview: 'habitats',
      home: 'habitats',
      methods: 'data-sources',
    }[route] || route;
  const isHome = active === 'habitats' || route === 'habitat';

  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/combustion.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Data request failed');
        return response.json();
      })
      .then((data) => {
        if (data.schemaVersion !== 1) throw new Error('Unsupported dataset');
        setDataset(data);
      })
      .catch((cause) => {
        if (cause.name !== 'AbortError') setError(cause.message);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const key = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !inspect) {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [inspect]);

  useEffect(() => {
    document.title = `${titles[active] || 'Flame in Freefall'} · Flame in Freefall`;
    if (route !== 'results' || !habitat) return;
    setLastHabitat(habitat.id);
    try {
      sessionStorage.setItem('flame-habitat', habitat.id);
    } catch {
      /* Session remains usable. */
    }
  }, [active, route, habitat]);

  function toggleCompare(accession) {
    setSelected((previous) =>
      previous.includes(accession)
        ? previous.filter((value) => value !== accession)
        : previous.length < 3
          ? [...previous, accession]
          : previous,
    );
  }
  const props = { dataset, selected, toggleCompare, onInspect: setInspect };
  let page = isHome ? (
    <Home dataset={dataset} dataError={error} />
  ) : (
    <div className="empty">
      <h1>Page not found</h1>
      <a href="/">Return home</a>
    </div>
  );
  if (dataset)
    switch (route) {
      case 'scenario': {
        const scenario = readScenario(query);
        const run = query.has('oxygen') || (query.has('preset') && scenario.id !== 'custom');
        page = <Scenario key={query.toString()} scenario={scenario} run={run} {...props} />;
        break;
      }
      case 'analyst':
        page = (
          <Ask
            key={query.toString()}
            {...props}
            claudeStatus={claude}
            habitat={query.has('preset') ? readScenario(query) : null}
            initialQuestion={query.get('question') || ''}
          />
        );
        break;
      case 'results':
        if (habitat) page = <HabitatResults key={habitat.id} {...props} habitat={habitat} />;
        break;
      case 'investigations':
        page = <Catalogue {...props} />;
        break;
      case 'investigation':
        page = <Detail {...props} accession={id} key={id} />;
        break;
      case 'record':
        page = <RecordDetail dataset={dataset} id={id} />;
        break;
      case 'explorer':
        page = <Explorer key={id || 'all'} {...props} initialAccession={id} />;
        break;
      case 'neural':
        page = <Neural {...props} key={query.toString()} query={query} />;
        break;
      case 'compare':
        page = <Compare {...props} />;
        break;
      case 'ask':
        page = (
          <Ask key={habitat?.id || 'general'} {...props} habitat={habitat} claudeStatus={claude} />
        );
        break;
      case 'insights':
        page = <Insights dataset={dataset} />;
        break;
      case 'research-gaps':
        page = <ResearchGaps dataset={dataset} />;
        break;
      case 'data-sources':
      case 'methods':
        page = <Methods dataset={dataset} claudeStatus={claude} />;
        break;
    }

  return (
    <ErrorBoundary>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header sky-header">
        <div className="site-header-inner">
          <a className="briefing-brand" href="/">
            <Flame size={25} strokeWidth={1.75} aria-hidden="true" />
            <span>Flame in Freefall</span>
          </a>
          <Navigation active={active} openSearch={() => setPalette(true)} key={route} />
        </div>
      </header>
      <main
        className={isHome ? 'sky-landing' : 'briefing-page sky-research'}
        id="main-content"
        tabIndex={-1}
      >
        {query.get('demo') === '1' && (
          <nav className="demo-steps" aria-label="Five-minute demo">
            <strong>5-MIN DEMO</strong>
            <a href="/?demo=1">1. Pick a habitat</a>
            <a href="/scenario?preset=moon&demo=1">2. See the risks</a>
            <a href="/analyst?demo=1">3. Ask the AI</a>
          </nav>
        )}
        {error && !isHome ? (
          <div className="empty" role="alert">
            <h1>Research data could not load</h1>
            <p>{error}.</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : !dataset && !isHome ? (
          <Loading />
        ) : (
          <Suspense fallback={<Loading />}>{page}</Suspense>
        )}
        <footer className="page-footer">
          <span>
            Data:{' '}
            <a href="https://psi.nasa.gov/" target="_blank" rel="noreferrer">
              NASA Physical Sciences Informatics
            </a>{' '}
            and the published sources on the <a href="/data-sources">Data Sources</a> page.
          </span>
          <div>
            <a
              href="https://github.com/nithinram123/flame-in-freefall"
              target="_blank"
              rel="noreferrer"
            >
              GitHub repository <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </footer>
      </main>
      {inspect?.length > 0 && (
        <RecordDrawer dataset={dataset} records={inspect} onClose={() => setInspect(null)} />
      )}
      {palette && <CommandPalette dataset={dataset} onClose={() => setPalette(false)} />}
    </ErrorBoundary>
  );
}
