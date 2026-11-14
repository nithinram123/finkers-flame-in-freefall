import { useState } from 'react';
import {
  BookOpen,
  ChartScatter,
  ChevronDown,
  FlaskConical,
  Home,
  Menu,
  MessageCircle,
  X,
} from 'lucide-react';

const primary = [
  ['Mission map', '/', 'habitats', Home],
  ['Habitat Risk', '/scenario', 'scenario', FlaskConical],
  ['Ask the AI', '/analyst', 'analyst', MessageCircle],
  ['Explore Experiments', '/explorer', 'explorer', ChartScatter],
];
export const morePages = [
  ['Neural Evidence Lab', '/neural', 'neural'],
  ['Experiment Analysis', '/investigations', 'investigations'],
  ['Compare', '/compare', 'compare'],
  ['Insights', '/insights', 'insights'],
  ['Research Gaps', '/research-gaps', 'research-gaps'],
  ['Data Sources', '/data-sources', 'data-sources'],
];

export default function Navigation({ active, claude }) {
  const [mobile, setMobile] = useState(false);
  const Icon = mobile ? X : Menu;
  const moreActive = morePages.some(([, , key]) => key === active);
  return (
    <div
      className="mission-navigation"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && mobile) {
          setMobile(false);
          event.currentTarget.querySelector('.mobile-nav-toggle')?.focus();
        }
      }}
    >
      <button
        className="mobile-nav-toggle"
        type="button"
        aria-expanded={mobile}
        aria-controls="mission-nav"
        onClick={() => setMobile(!mobile)}
      >
        <Icon size={18} aria-hidden="true" />
        {mobile ? 'Close menu' : 'Menu'}
      </button>
      <nav aria-label="Main navigation" id="mission-nav" className={mobile ? 'is-open' : ''}>
        {primary.map(([label, href, key, Symbol]) => (
          <a key={key} href={href} aria-current={key === active ? 'page' : undefined}>
            <Symbol size={17} aria-hidden="true" />
            {label}
          </a>
        ))}
        <details open={moreActive || undefined}>
          <summary>
            <BookOpen size={17} aria-hidden="true" />
            More
            <ChevronDown size={14} aria-hidden="true" />
          </summary>
          {morePages.map(([label, href, key]) => (
            <a key={key} href={href} aria-current={key === active ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </details>
        {claude && <small className="nav-ai">Claude configured</small>}
      </nav>
    </div>
  );
}
