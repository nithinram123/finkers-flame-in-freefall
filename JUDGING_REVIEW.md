# Flame in Freefall · 2026 judging review

This is a project-team self-assessment using the public guidance, not a NASA evaluation or a prediction of the result.

## What the judges can verify

The [2026 Flame in Freefall challenge](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/) calls for an interactive tool to find and interpret microgravity combustion investigations. In Flame in Freefall, the [NASA Physical Sciences Informatics archive](https://psi.nasa.gov/) supplies the evidence itself: 24 investigations catalogued, 22 source tables and 738 nonduplicate test rows with both ambient oxygen and pressure across four investigations. Listed investigations and eligible test rows are different totals.

The [2026 Judging and Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/) uses five criteria before Executive Judging awards. These indicative scores are out of five, based on what the site can substantiate today. There was no independent evaluation and no demo or project-form score to verify here.

| Criterion    | Internal read                 | What earns it and what is missing                                                                                                                                                                                                  |
| ------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Impact       | 3                             | A mission researcher can see where evidence is thin and identify useful follow-up tests. No evidence yet that crews or engineers make better decisions with it.                                                                    |
| Creativity   | 4                             | An evidence-gap workflow sorts actual tests by their proximity to a cabin's atmosphere and lets the user trace them back to the source. The model check makes its own scope and baseline visible.                                  |
| Validity     | 3                             | Original rows and normalized units are inspectable; the FLEX model is compared on grouped held-out observations. Neither air similarity nor one duration model validates a habitat design or supplies a fire safety qualification. |
| Relevance    | 5                             | NASA data determine the matches, the chart, the source trail and the model evaluation. Without PSI data the core workflow would not work.                                                                                          |
| Presentation | 4 for the site, demo unscored | The lab puts the result and its limitation together and makes source inspection one click. The formal project description, public demo and a judge's signed-out access still matter.                                               |

### All ten executive awards

These alignments are based on NASA's [current award definitions](https://www.spaceappschallenge.org/resources/judging-awards-guide/#phase-3-executive-judging).

| Award                   | Fit       | Why                                                                                                                                                      |
| ----------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Best Use of Science     | Secondary | Comparing against a baseline and holding out groups are strengths. Cross-study validation and new experiments would materially improve this case.        |
| Best Use of Data        | Strongest | PSI records become an accessible, traceable tool for a mission research question; the dashboard surfaces missing evidence as well as available evidence. |
| Best Use of Technology  | Moderate  | Low-cost build-time model and row citations make a usable tool. A small neural network alone is not a technical breakthrough.                            |
| Galactic Impact         | Early     | The need is real for future crews. Demonstrated mission or Earth outcomes are absent.                                                                    |
| Best Mission Concept    | Limited   | This supports research and test planning. It is not an end-to-end mission concept with systems and design evidence.                                      |
| Most Inspirational      | Possible  | The fire-safety question is tangible. An audience-facing story demonstrating whom it helps is needed to make this case.                                  |
| Best Storytelling Award | Secondary | The Moon Base evidence gap gives the demo a clear reveal, backed by open data. Much depends on the demo itself.                                          |
| Global Connection Award | Limited   | Public research access helps, but the project does not yet demonstrate collaboration or connections across communities.                                  |
| Art & Technology Award  | Modest    | The visualizations make scientific state legible. Artistic expression is not the primary contribution.                                                   |
| Local Impact Award      | Limited   | No local pilot, community partner or measured local benefit was evidenced for this review.                                                               |

## What to carry over from Resonant Exoplanets

NASA lists [Resonant Exoplanets as 2025 Best Use of Data](https://www.spaceappschallenge.org/2025/awards/). Its team describes moving from telescope observations through signal processing and physics checks to an inspectable result in its [public explorer](https://resonant-planet.vercel.app/). That is a useful benchmark for a demonstrable pipeline. The winner's claims are the team's account of its method; they are not independently replicated here.

Flame in Freefall's comparable path is **cabin → atmosphere match → PSI source row**, followed by a separate, reproducible model check. Its strongest result for a judge is a practical negative: the Moon Base preset has **zero** tests in the close oxygen/pressure window and **37** in the wider window. A user can inspect the nearest rows without mistaking them for a test of the proposed cabin. The station preset supplies a contrast: **179** close records, still without matching all fuels or hardware. The app is a research aid, not a safety classifier. The visual direction borrows the idea of a focused signal readout from [Shakuro’s neural-monitoring dashboard](https://dribbble.com/shots/26738095-Dashboard-Design-for-Neural-Implant-Monitoring), with original diagrams and the app’s existing white briefing surface and flame accent.

The FLEX audit groups source tests into oxygen/pressure bands, rotating all rows through five held-out folds. The seven-input, six-hidden-unit network gives **4.91 seconds** mean absolute error versus **5.96 seconds** for the fold's training median over **259** PSI-69 tests. This comparison is limited to one study, against a deliberately simple baseline. Adjacent atmospheric groups can be similar and the tests do not constitute an independent external validation. The estimates are computed in the build, not for a judge's cabin, and there is no model or SI API key requirement to inspect the results.

## Submission check

1. Keep the [public final project URL](https://flame-in-freefall-beta.vercel.app/) and open the judges’ click path directly via **Neural Evidence Lab**, or include the direct lab URL alongside the homepage. Verify both without an account.
2. Demo: Moon Base → no close records → wider match → open NASA source row → station comparison → optional FLEX model check. Explain the engineering decision: inspect the underlying tests and plan further testing instead of declaring the cabin safe.
3. Follow the [2026 Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/): public demo in up to seven slides or 30 seconds; English (or English subtitles for permitted non-English video); clear PSI citations, references and team attribution; no media showing minors. NASA evaluates the submission form as well as any links.
4. Disclose SI assistance with code, data normalization, model implementation and copy in the form, project description and metadata. Distinguish NASA observations from the model's estimates. The project team should verify its own claim of originality. The metadata and Lab methods note cite the development assistance.
5. The published cutoff is **Sunday 15 November 2026 at 11:59 p.m. in the Local Event's time zone** (Team Owner's local time for the Universal Event). Verify the team's event. If editing the project page after an earlier submit, use **Submit for Judging** again before the deadline and check for the confirmation banner. Deploying to Vercel alone does not submit the entry.
