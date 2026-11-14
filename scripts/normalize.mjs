import { buildPsi } from '../src/lib/psi.mjs';
// SI-assisted normalization. NASA source files are preserved unchanged in data/tables.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function scalar(raw, factor = 1) {
  if (raw == null) return null;
  const s = String(raw).trim();
  // Sets, ranges, qualified notes and unlabelled instrument settings are not scalar measurements.
  const m = s.match(
    /^(?:~\s*)?(-?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:%|cm\/s|mmHg|atm|bar|s|sec|cm|mm)?$/i,
  );
  return m ? Math.round(Number(m[1]) * factor * 1e6) / 1e6 : null;
}
const config = {
  'PSI-159': [
    'Gas',
    'Prevention',
    'ACME / CIR',
    'Study cool gaseous flames in normal and inverse configurations. Inverse tests report oxygen in the burner stream.',
  ],
  'PSI-10': [
    'Gas',
    'Prevention',
    'ACME / CIR',
    'Study how fuel composition, pressure and dilution affect gas flames, soot and extinction.',
  ],
  'PSI-20': [
    'Gas',
    'Prevention',
    'ACME / CIR',
    'Use a gas burner to investigate material-flammability behavior. The supplied rows summarize test days.',
  ],
  'PSI-21': [
    'Gas',
    'Prevention',
    'ACME / CIR',
    'Study the stability and extinction of coflow gas flames. Rows summarize multiple ignitions.',
  ],
  'PSI-22': [
    'Gas',
    'Prevention',
    'ACME / CIR',
    'Study how electric fields change flames. This is not a direct lunar-gravity experiment.',
  ],
  'PSI-23': [
    'Gas',
    'Prevention',
    'ACME / CIR',
    'Study flame structure and soot under varied fuel and oxidizer dilution. Rows summarize test days.',
  ],
  'PSI-25': [
    'Solid',
    'Prevention',
    'MSG',
    'Study ignition, flame spread and extinction of solid materials under low-speed airflow.',
  ],
  'PSI-26': [
    'Solid',
    'Prevention',
    'MSG',
    'Study how material shape and airflow affect burning, and investigate inert-gas suppression.',
  ],
  'PSI-39': [
    'Liquid',
    'Suppression',
    'MDCA / CIR',
    'Study cool-flame behavior in liquid-fuel droplets under controlled gas composition.',
  ],
  'PSI-47': [
    'Dust / aerosol',
    'Detection',
    'ISS aerosol instruments',
    'Evaluate aerosol instruments with dust. Dust measurements support detection research but are not smoke-fire outcomes.',
  ],
  'PSI-68': [
    'Liquid',
    'Suppression',
    'MDCA / CIR',
    'Study droplet combustion, fuel mixtures and extinction. The supplied CSV describes parameter ranges, not individual tests.',
  ],
  'PSI-69': [
    'Liquid',
    'Suppression',
    'MDCA / CIR',
    'Measure droplet burning and extinction while varying oxygen, pressure and diluent gases.',
  ],
  'PSI-98': [
    'Solid',
    'Prevention',
    'Saffire / Cygnus',
    'Study large-scale fabric burning in an uncrewed cargo spacecraft.',
  ],
  'PSI-99': [
    'Solid',
    'Prevention',
    'Saffire / Cygnus',
    'Compare burning and flame spread across solid materials and flow directions.',
  ],
  'PSI-100': [
    'Solid',
    'Prevention',
    'Saffire / Cygnus',
    'Study large fabric samples in concurrent and opposed airflow.',
  ],
  'PSI-101': [
    'Solid',
    'Detection',
    'SAME',
    'Study smoke particle growth and transport with revised materials and diagnostics.',
  ],
  'PSI-102': [
    'Solid',
    'Detection',
    'SAME',
    'Study smoke from heated spacecraft materials and its response in particle and smoke detectors.',
  ],
  'PSI-106': [
    'Gas',
    'Prevention',
    'MSG',
    'Study gas-flame structure and liftoff. The CSV lists test sessions, including calibration activity.',
  ],
  'PSI-107': [
    'Gas',
    'Prevention',
    'MSG',
    'Study soot formation in gas flames at different fuel and airflow rates.',
  ],
};
function pick(r, keys) {
  for (const k of keys) if (r[k]?.trim()) return [r[k], k];
  return ['', null];
}
function measurement(r, keys, factor = 1) {
  const [raw, column] = pick(r, keys);
  return {
    value: scalar(raw, factor),
    raw,
    column,
    approximate: /~|approx/i.test(raw + ' ' + column),
  };
}
export function classify(accession, r) {
  if (!Object.values(r).some((v) => v.trim())) return 'blank';
  if (/^Note\s/i.test(Object.values(r)[0]) || /pre-test flow/i.test(r.Material || ''))
    return 'note / calibration';
  if (accession === 'PSI-142') return 'publication reference';
  if (accession === 'PSI-68') return 'parameter summary';
  if (['PSI-20', 'PSI-21', 'PSI-23', 'PSI-106'].includes(accession)) return 'session summary';
  if (accession === 'PSI-22') return r['Test Day'] ? 'session summary' : 'continuation / note';
  if (['PSI-101', 'PSI-102', 'PSI-47'].includes(accession)) return 'sample / session';
  if (['PSI-10', 'PSI-159'].includes(accession) && !r.Test) return 'continuation / note';
  if (accession === 'PSI-26' && !r['As Run Test #']) return 'continuation / note';
  return 'test record';
}
function main() {
  const investigations = JSON.parse(
    fs.readFileSync(path.join(root, 'data/investigations.json'), 'utf8'),
  );
  const tables = [];
  const records = [];
  const manifest = [];
  let blankRows = 0;
  let sourceRows = 0;
  for (const file of fs
    .readdirSync(path.join(root, 'data/tables'))
    .filter((x) => x.endsWith('.csv'))
    .sort()) {
    const bytes = fs.readFileSync(path.join(root, 'data/tables', file));
    const parsed = parse(bytes, { bom: true, skip_empty_lines: false, relax_column_count: false });
    const originalHeaders = parsed.shift();
    const headers = originalHeaders.map((x) => x.trim());
    const accession = file.match(/^PSI-\d+/)[0];
    const tableId = `table-${tables.length}`;
    const counts = {};
    const seen = new Map();
    let duplicates = 0;
    tables.push({ id: tableId, accession, file, headers: originalHeaders });
    parsed.forEach((values, index) => {
      sourceRows++;
      const r = Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]));
      const kind = classify(accession, r);
      counts[kind] = (counts[kind] || 0) + 1;
      if (kind === 'blank') {
        blankRows++;
        return;
      }
      const id = `${tableId}-r${index + 2}`;
      const fingerprint = JSON.stringify(values);
      const duplicateOf = seen.get(fingerprint) || null;
      if (duplicateOf) duplicates++;
      else seen.set(fingerprint, id);
      const inverse = /inverse/i.test(file);
      let oxygen = measurement(r, [
        'Calibrated  initial O2 % by vol',
        'Percent O2',
        'Percent O2 (Note 1)',
        'Oxygen Conc (percent)',
      ]);
      if (!oxygen.column)
        oxygen = measurement(
          r,
          [
            'XO2 (init)',
            'XO2 before test',
            'XO2',
            'Oxygen',
            'Oxygen Mole Fraction',
            'O initial ambient composition; mole fraction',
          ],
          100,
        );
      let pressure = measurement(r, ['Ambient pressure; mmHg'], 0.133322368);
      if (!pressure.column)
        pressure = measurement(r, ['pinit (atm)', 'Ambient Pressure (atm)', 'Pressure'], 101.325);
      if (!pressure.column) pressure = measurement(r, ['approx p (bar)'], 100);
      const airflow = measurement(r, [
        'Air Flow (cm/s)',
        'Air Flow',
        'Air Rate (cm/s)',
        'Inlet velocity (cm/s)',
        'Flow Velocity (cm/s)',
      ]);
      const burnTime = measurement(r, ['burn time (sec)', 'Burn time; s', 'Burn Time (s)']);
      const end = pick(r, ['Test end', 'Self-ext or flow term', 'Self -ext or flow term'])[0];
      const ignition = r['Hot ignition'];
      let outcome = 'Not reported';
      if (ignition === 'No') outcome = 'No ignition';
      else if (/^(Extinction|SE)$/i.test(end)) outcome = 'Extinction';
      else if (/^FT$/i.test(end)) outcome = 'Flow terminated';
      else if (/burn.?out|complete/i.test(end)) outcome = 'Burnout';
      else if (end && end !== '-') outcome = end;
      const label =
        pick(r, [
          'Test',
          'FLEX Identifier',
          'As Run Test #',
          'Test #',
          'SAME Test #',
          'Flex Number',
          'Sample Number',
          'Sample #',
          'Session Name',
          'Test Day',
          'Test Date',
          'Data ID',
        ])[0] || `row ${index + 2}`;
      records.push({
        id,
        accession,
        tableId,
        row: index + 2,
        label,
        kind,
        duplicateOf,
        values,
        fuel:
          pick(r, [
            'Fuel',
            'Fuel Sample Material',
            'Material',
            'Sample Type',
            'Sample Material',
            'Sample (Fuel Type)',
            'Fuel Type',
            'Fuel Bottle',
          ])[0] || null,
        oxygen,
        oxygenBasis: inverse ? 'burner oxidizer' : 'ambient',
        pressure,
        airflow,
        burnTime,
        outcome,
        flags: [
          ...(duplicateOf ? ['Exact duplicate source row; excluded from chart and score'] : []),
          ...(inverse ? ['Oxygen is the burner stream, not ambient cabin oxygen'] : []),
          ...(kind !== 'test record' ? ['Not an individual combustion test'] : []),
        ],
      });
    });
    manifest.push({
      file,
      accession,
      bytes: bytes.length,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      rows: parsed.length,
      counts,
      duplicates,
    });
  }
  for (const inv of investigations) {
    // The archive now uses the plural route. Keep the input snapshot unchanged.
    inv.psiPage = inv.psiPage?.replace('/repo/data/investigation/', '/repo/data/investigations/');
    const c = config[inv.accession] || [
      'Analysis',
      'Research',
      'Ground study',
      inv.objectives.split(/\n/)[0],
    ];
    [inv.fuelType, inv.safetyArea, inv.hardwareGroup, inv.summary] = c;
    inv.name = inv.acronym || inv.title;
    inv.areas = [inv.safetyArea, ...(inv.accession === 'PSI-26' ? ['Suppression'] : [])];
    const rr = records.filter((r) => r.accession === inv.accession);
    const tests = rr.filter((r) => r.kind === 'test record' && !r.duplicateOf);
    inv.recordCount = rr.length;
    inv.testRecordCount = tests.length;
    const range = (field, rows = tests) => {
      const a = rows.map((r) => r[field].value).filter((v) => v !== null);
      return a.length ? { min: Math.min(...a), max: Math.max(...a), count: a.length } : null;
    };
    inv.oxygenRange = range(
      'oxygen',
      tests.filter((r) => r.oxygenBasis === 'ambient'),
    );
    inv.pressureRange = range('pressure');
    inv.airflowRange = range('airflow');
    inv.outcomes = Object.fromEntries(
      [...new Set(tests.map((r) => r.outcome))].map((o) => [
        o,
        tests.filter((r) => r.outcome === o).length,
      ]),
    );
    inv.sensorEvidence = (
      inv.approach.match(
        /[^.\n]*\b(camera|thermocouple|radiometer|detector|instrument|photograph|pyrometr|microscope)[^.\n]*[.]?/gi,
      ) || []
    ).slice(0, 4);
  }
  const dataset = {
    schemaVersion: 1,
    source: 'User-supplied NASA PSI snapshot; source retrieval date not provided',
    preparedDate: '2026-11-14',
    siDisclosure:
      'Normalization code and explanatory summaries are SI-assisted. Original NASA values are preserved. Interpretations require scientific review.',
    stats: {
      investigations: investigations.length,
      tables: tables.length,
      sourceRows,
      blankRows,
      records: records.length,
      testRecords: records.filter((r) => r.kind === 'test record' && !r.duplicateOf).length,
      duplicates: records.filter((r) => r.duplicateOf).length,
    },
    investigations,
    tables,
    records,
  };
  fs.mkdirSync(path.join(root, 'public/data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'public/data/combustion.json'), JSON.stringify(dataset));
  fs.writeFileSync(path.join(root, 'public/data/psi.json'), JSON.stringify(buildPsi(dataset)));
  fs.writeFileSync(
    path.join(root, 'public/data/source-manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  for (const t of tables)
    fs.copyFileSync(path.join(root, 'data/tables', t.file), path.join(root, 'public/data', t.file));
  const report = [
    '# Source audit',
    '',
    `Prepared 14 November 2026. Snapshot supplied by the user; original fetch date unknown.`,
    '',
    `- ${dataset.stats.investigations} investigations; ${tables.length} CSV tables.`,
    `- ${sourceRows} source rows, including ${blankRows} blank rows.`,
    `- ${records.length} nonempty records; ${dataset.stats.testRecords} nonduplicate rows classified as test records. This is not a claim of distinct physical experiments.`,
    `- ${dataset.stats.duplicates} exact duplicate rows retained and flagged.`,
    '',
    '| Source | Rows | Row types | Exact duplicates |',
    '|---|---:|---|---:|',
    ...manifest.map(
      (m) =>
        `| ${m.file} | ${m.rows} | ${Object.entries(m.counts)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')} | ${m.duplicates} |`,
    ),
    '',
    '## Selection',
    'Use all metadata and CSVs. Link to large NASA videos and sensor logs instead of downloading them. Prioritize FLEX and normal-flame CFI-G for scalar oxygen/pressure/outcome exploration; BASS/BASS-II and SAFFIRE for material context; SAME/SAME-R for detection. FLEX-2 supports parameter coverage, not individual-test outcome statistics.',
    '',
    '## Limits',
    'Inverse-flame oxygen is a burner-stream concentration. Ranges and sets stay textual; fan display values are not converted into airspeed. Unknown values remain null; no forward filling of blank material names. Session summaries, references, notes and calibration rows are not plotted as individual tests. Microgravity evidence does not directly validate lunar or Martian fire safety.',
  ];
  fs.writeFileSync(path.join(root, 'DATA_AUDIT.md'), report.join('\n'));
  console.log(
    JSON.stringify(
      {
        ...dataset.stats,
        browserDataBytes: fs.statSync(path.join(root, 'public/data/combustion.json')).size,
      },
      null,
      2,
    ),
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
