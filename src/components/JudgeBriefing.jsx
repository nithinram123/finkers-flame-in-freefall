import { ArrowLeft, ArrowRight, ArrowUpRight, FlaskConical } from 'lucide-react';
import { cabinAir, cabinSummary, moon, station } from '../lib/research-brief.mjs';
import { PageTitle } from './ui.jsx';
import { explorerUrl } from './EvidenceWorkspace.jsx';

export default function JudgeBriefing({ dataset, query }) {
  const lunar = cabinSummary(dataset, moon);
  const orbital = cabinSummary(dataset, station);
  const source = lunar.example;
  const steps = [
    {
      label: 'Question',
      title: 'Has NASA tested fire in air like our cabin’s?',
      text: 'Start with a cabin’s oxygen and pressure. Find the closest experiments, check what burned and see which conditions still need testing.',
      action: ['Open the cabin dashboard', '/scenario'],
    },
    {
      label: 'Archive',
      title: 'Start with the original measurements.',
      text:
        dataset.stats.investigations +
        ' NASA investigations and ' +
        dataset.stats.tables +
        ' experimental tables feed the dashboard. ' +
        lunar.paired +
        ' nonduplicate tests report ambient oxygen and positive pressure together.',
      action: ['Inspect the data sources', '/data-sources'],
    },
    {
      label: 'Moon Base',
      title: lunar.close + ' close matches for the Moon Base preset.',
      text:
        'At ' +
        cabinAir(moon) +
        ', ' +
        lunar.wider +
        ' more tests fall inside the wider window. This tells a researcher where the data gets sparse when oxygen and pressure are considered together.',
      action: ['View the Moon Base chart', '/scenario?preset=moon#atmosphere-evidence'],
    },
    {
      label: 'Source row',
      title: 'Open one of the measurements behind the count.',
      text: source
        ? source.accession +
          ', CSV row ' +
          source.row +
          ', is a nearby observation. The original record shows the fuel and test measurements behind the dashboard’s comparison.'
        : 'The paired-test explorer lets you open original CSV records directly.',
      action: [
        'Open the original NASA row',
        source ? '/record/' + encodeURIComponent(source.id) : explorerUrl(moon),
      ],
    },
    {
      label: 'Station',
      title: orbital.close + ' close matches for the station reference.',
      text:
        'Run the same method at ' +
        cabinAir(station) +
        '. The count changes with the cabin air. Material, airflow and gravity still need separate evidence.',
      action: ['Compare both cabins and export the brief', '/scenario?preset=moon#research-brief'],
    },
    {
      label: 'Ask',
      title: 'Trace an answer to an experiment.',
      text: 'Try the FLEX methanol question. The search counts every matching row, retrieves examples and lets you inspect the source for each linked result.',
      action: [
        'Ask about FLEX methanol extinction',
        '/analyst?question=Which+FLEX+tests+report+methanol+extinction%3F',
      ],
    },
    {
      label: 'Next test',
      title: 'Turn the evidence gap into a test plan.',
      text: 'Export the comparison. Choose materials, airflow and gravity to test at cabin conditions. Use the investigation catalogue to find published prevention, detection and suppression studies.',
      action: ['Open the cabin evidence brief', '/scenario?preset=moon#research-brief'],
    },
  ];
  const requested = Number(query.get('step'));
  const index =
    Number.isInteger(requested) && requested >= 1 && requested <= steps.length ? requested - 1 : 0;
  const step = steps[index];

  return (
    <>
      <PageTitle
        title="Flame in Freefall"
        description="A seven-step walkthrough of the NASA combustion evidence."
      />
      <article className="judge-slide" aria-labelledby="step-title">
        <header>
          <FlaskConical size={21} aria-hidden="true" /> {step.label}
          <span>
            {index + 1} / {steps.length}
          </span>
        </header>
        <h2 id="step-title">{step.title}</h2>
        <p>{step.text}</p>
        <a className="button primary" href={step.action[1]}>
          {step.action[0]} <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </article>
      <nav className="brief-pagination" aria-label="Walkthrough navigation">
        {index > 0 && (
          <a className="button" href={'?step=' + index}>
            <ArrowLeft size={16} aria-hidden="true" /> Previous
          </a>
        )}
        <ol>
          {steps.map(({ label }, position) => (
            <li key={label}>
              <a
                href={'?step=' + (position + 1)}
                aria-label={'Step ' + (position + 1) + ' · ' + label}
                aria-current={index === position ? 'step' : undefined}
              >
                {position + 1}
              </a>
            </li>
          ))}
        </ol>
        {index < steps.length - 1 && (
          <a className="button" href={'?step=' + (index + 2)}>
            Next <ArrowRight size={16} aria-hidden="true" />
          </a>
        )}
      </nav>
    </>
  );
}
