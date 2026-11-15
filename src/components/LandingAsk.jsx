import { MessageSquare } from 'lucide-react';
import Ask from './Ask.jsx';

export default function LandingAsk({ dataset, dataError, generationProvider, onInspect }) {
  return (
    <section
      className="landing-ask-console"
      id="ask-the-evidence"
      aria-labelledby="landing-ask-title"
    >
      <h2 id="landing-ask-title">
        <MessageSquare size={18} aria-hidden="true" /> Ask the evidence
      </h2>
      {dataset ? (
        <Ask
          dataset={dataset}
          generationProvider={generationProvider}
          onInspect={onInspect}
          embedded
        />
      ) : (
        <p role="status">
          {dataError
            ? 'NASA evidence could not load. Refresh to try again.'
            : 'Loading NASA evidence…'}
        </p>
      )}
    </section>
  );
}
