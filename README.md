# Flame in Freefall

A NASA PSI combustion evidence explorer for the 2026 Space Apps challenge. The first MVP focuses on making source data readable and traceable. Primary award target: Best Use of Data; award saturation is unknown.

## Run

Requires Node.js 22.12+ or 24 and npm. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm ci
npm run data
npm run dev
```

Production verification:

```sh
npm test
npm run build
npm run preview
```

`npm run build` regenerates `public/data` from the original inputs before compiling the app. No API key, database or NASA login is required for the current MVP.

## Available in the MVP

- Catalogue of all 24 investigations, filtered by fuel, hardware and safety area.
- Investigation objectives, methods, SI-assisted plain-English descriptions, reported condition ranges, measurements and publications.
- Comparison of two or three investigations with missing measurements identified.
- Scatter plots of scalar oxygen, pressure, airflow and burn duration, coloured by source-reported outcomes.
- Original-column inspector and original CSV downloads for every nonempty record.
- CSV export with source filenames and CSV row references.
- Keyword evidence search with citations to specific PSI source rows. This is visibly labelled source-search mode; it is not a live language-model answer service.
- Sources, methods, limitations and SI disclosure in the application.

## Data and scientific boundaries

The user supplied the downloaded NASA snapshot. Original retrieval date is unknown. It contains 22 CSV files and 2,870 data rows, including 861 blank rows. Normalization retains 2,009 nonempty records and identifies 1,711 nonduplicate test records. These are classified source rows, not a claim of distinct physical experiments. See [DATA_AUDIT.md](DATA_AUDIT.md).

NASA inputs are stored unchanged in `data/tables` and `data/investigations.json`. The generated `source-manifest.json` records SHA-256 checksums. `combustion.json` preserves each original row and header alongside typed measurements. Large videos and sensor logs are linked through NASA PSI rather than downloaded.

Ranges, multiple values, instrument settings and unresolved text are not converted into individual scalar measurements. Session summaries, notes, references and exact duplicates are excluded from charts. Inverse-burner oxygen is separated from ambient oxygen. Objectives and hypotheses are not presented as findings. The app does not estimate habitat fire probability or certify materials. Lunar/Martian surface extrapolation requires further scientific review.

## Structure

```text
data/                 Original NASA metadata and tables
scripts/normalize.mjs Reproducible classifications, units, provenance, audit
scripts/fetch_psi.py   Original user-supplied NASA refresh script (Python 3.8+)
src/components/       Catalogue, details, comparison, charts, evidence search
src/lib/evidence.mjs  Pure selectors, filters and export utilities
tests/                Data fidelity and selector checks
public/data/          Generated browser data (ignored in Git)
```

Refreshing from NASA is optional and may change the snapshot. The original Python script fetches metadata and table records without downloading the full underlying video archive. After refresh, regenerate and review the audit before publishing.

## Next functional steps

1. Add a server-only SI answer endpoint after the team chooses a provider. Configure credentials directly in Vercel; never use a frontend `VITE_` secret.
2. Design habitat ranking after the team owns and confirms its research angle, relevance rules and scoring method.
3. Review scientific interpretations with publications or a subject-matter expert.
4. Complete visual, keyboard and responsive browser QA, then prepare the submission and demo.

## SI use and originality

OpenAI Codex assisted source inspection, normalization code, React implementation, tests, documentation and plain-English descriptions. NASA observations are preserved rather than generated. In-app descriptions and disclosure identify SI assistance. The team must provide its own original project angle; no novel research finding or team identity is claimed here. No NASA logo or SI-generated media is included.

## References

- [NASA PSI repository](https://psi.nasa.gov/physci/repo/search?q=combustion); individual PSI links and dataset/publication DOIs are provided in the app.
- [NASA combustion science](https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/).
- [React](https://react.dev/), [Vite](https://vite.dev/), [Recharts](https://recharts.github.io/), [Lucide](https://lucide.dev/), [csv-parse](https://csv.js.org/parse/), [Prettier](https://prettier.io/).
- [IBM Plex](https://github.com/IBM/plex), loaded through Google Fonts with a sans-serif fallback.
- The user's previously supplied frontend design skills informed the framed-sheet visual direction. See `DESIGN.md`.

Original code is SI-assisted project work. Third-party packages and NASA data retain their respective terms. This independent project does not imply NASA endorsement.
