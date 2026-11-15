import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { presetLinks } from './missionDestinations.mjs';

const tabs = [
  {
    name: 'Habitats',
    routes: ['scenario'],
    links: [
      ['Compare cabin conditions', '/scenario', 'scenario'],
      ['Moon Base', presetLinks.moon],
      ['Space Station', presetLinks.station],
      ['Pressurized Rover', presetLinks.rover],
      ['Mars Base', presetLinks.mars],
    ],
  },
  {
    name: 'Experiments',
    routes: ['explorer', 'investigations', 'compare'],
    links: [
      ['Explore test records', '/explorer', 'explorer'],
      ['Browse investigations', '/investigations', 'investigations'],
      ['Compare investigations', '/compare', 'compare'],
    ],
  },
  {
    name: 'Research',
    routes: ['analyst', 'insights', 'research-gaps', 'data-sources'],
    links: [
      ['Ask the evidence', '/analyst', 'analyst'],
      ['Insights', '/insights', 'insights'],
      ['Research gaps', '/research-gaps', 'research-gaps'],
      ['Data sources & APIs', '/data-sources', 'data-sources'],
    ],
  },
];
export const routeTitles = Object.fromEntries(
  tabs.flatMap(({ links }) =>
    links.filter(([, , route]) => route).map(([title, , route]) => [route, title]),
  ),
);

export default function Navigation({ active, openSearch }) {
  const [open, setOpen] = useState(null);
  const nav = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (!nav.current?.contains(event.target)) setOpen(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('focusin', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('focusin', close);
    };
  }, [open]);
  return (
    <nav
      className="sky-nav"
      aria-label="Main navigation"
      ref={nav}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.preventDefault();
        nav.current.querySelector('[aria-expanded="true"]')?.focus();
        setOpen(null);
      }}
    >
      <a
        className="sky-tab sky-home-tab"
        href="/"
        aria-current={active === 'habitats' ? 'page' : undefined}
      >
        Home
      </a>
      {tabs.map(({ name, links, routes }) => {
        const id = 'nav-' + name.toLowerCase();
        return (
          <div className="sky-tab-group" key={name}>
            <button
              type="button"
              className="sky-tab"
              aria-expanded={open === name}
              aria-controls={id}
              data-active={routes.includes(active) || undefined}
              onClick={() => setOpen(open === name ? null : name)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown') return;
                event.preventDefault();
                setOpen(name);
                requestAnimationFrame(() =>
                  document.getElementById(id)?.querySelector('a')?.focus(),
                );
              }}
            >
              {name} <ChevronDown size={14} aria-hidden="true" />
            </button>
            <div className="sky-dropdown" id={id} hidden={open !== name}>
              {links.map(([label, href, route]) => (
                <a key={href} href={href} aria-current={route === active ? 'page' : undefined}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        );
      })}
      <button
        className="sky-tab sky-search"
        type="button"
        aria-label="Open quick navigation"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => {
          setOpen(null);
          openSearch();
        }}
      >
        <Search size={19} aria-hidden="true" />
      </button>
    </nav>
  );
}
