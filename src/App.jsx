import { Component, Suspense, lazy, useEffect, useState } from 'react';
import { BookOpen, ChartScatter, Columns3, Database, Flame, Info, Search } from 'lucide-react';
import Catalogue from './components/Catalogue.jsx';
import Detail from './components/Detail.jsx';
import Compare from './components/Compare.jsx';
import RecordDetail from './components/RecordDetail.jsx';
import Ask from './components/Ask.jsx';
import Methods from './components/Methods.jsx';
const Explorer = lazy(() => import('./components/Explorer.jsx'));
const navigation = [
  ['investigations', 'Investigations', BookOpen],
  ['explorer', 'Test explorer', ChartScatter],
  ['compare', 'Compare', Columns3],
  ['ask', 'Ask the evidence', Search],
  ['methods', 'Sources & methods', Database],
];

function Loading() {
  return (
    <div className="loading-state" role="status">
      <h1>Loading research evidence…</h1>
      <div className="skeleton" />
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
    if (this.state.error)
      return (
        <div className="empty" role="alert">
          <h1>The explorer could not open</h1>
          <p>Reload the page to try again.</p>
          <button onClick={() => window.location.reload()}>Reload explorer</button>
        </div>
      );
    return this.props.children;
  }
}

function useRoute() {
  const [route, setRoute] = useState(() => window.location.hash.slice(2) || 'investigations');
  useEffect(() => {
    const update = () => {
      setRoute(window.location.hash.slice(2) || 'investigations');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route.split('/');
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [route, id] = useRoute();
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
    document.title = `${navigation.find(([key]) => key === route)?.[1] || id || 'Investigation'} · Flame in Freefall`;
  }, [route, id]);
  function toggleCompare(accession) {
    setSelected((previous) =>
      previous.includes(accession)
        ? previous.filter((value) => value !== accession)
        : previous.length < 3
          ? [...previous, accession]
          : previous,
    );
  }
  const activeRoute = ['investigation', 'record'].includes(route) ? 'investigations' : route;
  let page;
  if (dataset) {
    const props = { dataset, selected, toggleCompare };
    switch (route) {
      case 'investigation':
        page = <Detail {...props} accession={id} key={id} />;
        break;
      case 'record':
        page = <RecordDetail dataset={dataset} id={id} />;
        break;
      case 'explorer':
        page = <Explorer dataset={dataset} />;
        break;
      case 'compare':
        page = <Compare {...props} />;
        break;
      case 'ask':
        page = <Ask dataset={dataset} />;
        break;
      case 'methods':
        page = <Methods dataset={dataset} />;
        break;
      default:
        page = <Catalogue {...props} />;
    }
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
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="#/investigations">
            <Flame size={29} strokeWidth={1.7} />
            <span>
              Flame in
              <br />
              <strong>Freefall</strong>
            </span>
          </a>
          <div className="workspace-label">Combustion evidence explorer</div>
          <nav aria-label="Main navigation">
            {navigation.map(([key, label, Icon]) => (
              <a
                key={key}
                className={activeRoute === key ? 'active' : ''}
                href={`#/${key}`}
                aria-current={activeRoute === key ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={1.7} />
                {label}
                {key === 'compare' && selected.length > 0 && (
                  <span className="nav-count">{selected.length}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="sidebar-foot">
            <Info size={16} />
            <p>
              NASA PSI source data
              <br />
              <span>Independent Space Apps project</span>
            </p>
            <a href="#/methods">Data & SI disclosure →</a>
          </div>
        </aside>
        <div className="main-frame">
          <header className="topbar">
            <span>
              Research workspace <span className="topbar-divider">/</span>{' '}
              {navigation.find(([key]) => key === activeRoute)?.[1] || 'Library'}
            </span>
            <a href="#/methods">
              <span className="status-dot" />
              Source-linked snapshot
            </a>
          </header>
          <main id="main-content" tabIndex="-1" className="main-sheet">
            {error ? (
              <div className="empty" role="alert">
                <h1>Research data could not load</h1>
                <p>{error}. Reload to retry.</p>
                <button onClick={() => window.location.reload()}>Retry</button>
              </div>
            ) : !dataset ? (
              <Loading />
            ) : (
              <Suspense fallback={<Loading />}>{page}</Suspense>
            )}
            <footer className="page-footer">
              <span>Flame in Freefall · NASA PSI evidence</span>
              <a href="#/methods">Sources, limitations & SI use</a>
            </footer>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
