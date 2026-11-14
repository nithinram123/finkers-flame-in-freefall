import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { habitatProfiles } from '../lib/habitat.mjs';

export default function CommandPalette({ dataset, onClose }) {
  const ref = useRef(null);
  const [query, setQuery] = useState('');
  const pages = [
    ['Choose a habitat', 'habitats'],
    ['Explore tests', 'explorer'],
    ['Browse investigations', 'investigations'],
    ['Ask the evidence', 'ask'],
    ['Compare investigations', 'compare'],
    ['Sources and methods', 'methods'],
  ];
  const items = [
    ...pages.map(([name, path]) => ({ name, path })),
    ...habitatProfiles.map((item) => ({ name: item.name, path: `results/${item.id}` })),
    ...(dataset?.investigations || []).map((item) => ({
      name: `${item.name} · ${item.accession}`,
      path: `investigation/${item.accession}`,
    })),
  ]
    .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 10);
  useEffect(() => {
    const element = ref.current;
    const before = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      before?.focus();
    };
  }, []);
  return (
    <dialog
      className="command-palette"
      aria-label="Quick navigation"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="command-body">
        <div className="command-input">
          <Search size={21} aria-hidden="true" />
          <input
            type="search"
            autoFocus
            aria-label="Search pages and investigations"
            placeholder="Search pages or PSI accessions…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                ref.current.querySelector('.command-results a')?.focus();
              }
              if (event.key === 'Enter' && items[0]) {
                window.location.hash = `/${items[0].path}`;
                onClose();
              }
            }}
          />
          <button className="icon-button" onClick={onClose} aria-label="Close quick navigation">
            <X size={20} />
          </button>
        </div>
        <div
          className="command-results"
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
            const links = Array.from(event.currentTarget.querySelectorAll('a'));
            const index = links.indexOf(document.activeElement);
            event.preventDefault();
            if (index === 0 && event.key === 'ArrowUp') ref.current.querySelector('input')?.focus();
            else links[index + (event.key === 'ArrowDown' ? 1 : -1)]?.focus();
          }}
        >
          {items.length ? (
            items.map(({ name, path }) => (
              <a key={path} href={`#/${path}`} onClick={onClose}>
                {name}
                <ArrowRight size={16} />
              </a>
            ))
          ) : (
            <p>No matching pages or investigations.</p>
          )}
        </div>
      </div>
    </dialog>
  );
}
