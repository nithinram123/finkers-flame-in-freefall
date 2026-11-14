# Source audit

Prepared 14 November 2026. Snapshot supplied by the user; original fetch date unknown.

- 24 investigations; 22 CSV tables.
- 2870 source rows, including 861 blank rows.
- 2009 nonempty records; 1711 nonduplicate rows classified as test records. This is not a claim of distinct physical experiments.
- 50 exact duplicate rows retained and flagged.

| Source | Rows | Row types | Exact duplicates |
|---|---:|---|---:|
| PSI-100_Experimental table_SAFFIRE-3.csv | 2 | test record: 2 | 0 |
| PSI-101_Experimental table_SAME-R.csv | 109 | sample / session: 109 | 0 |
| PSI-102_Experimental table_SAME.csv | 8 | sample / session: 8 | 0 |
| PSI-106_Experimental table_Slice.csv | 12 | session summary: 12 | 0 |
| PSI-107_Experimental table_Spice.csv | 469 | test record: 469 | 34 |
| PSI-10_Experimental table_Flame Design_Inverse Flame.csv | 120 | test record: 120 | 0 |
| PSI-10_Experimental table_Flame Design_Normal Flame.csv | 207 | test record: 207 | 0 |
| PSI-142_Experimental table_Data Summary Table.csv | 8 | publication reference: 8 | 0 |
| PSI-159_Experimental table_CFI-G_Inverse Flames.csv | 1015 | test record: 154; blank: 861 | 0 |
| PSI-159_Experimental table_CFI-G_Normal Flames.csv | 179 | test record: 179 | 0 |
| PSI-20_Experimental table_ACME BRE.csv | 18 | session summary: 18 | 0 |
| PSI-21_Experimental table_CLD Flame.csv | 32 | session summary: 32 | 0 |
| PSI-22_Experimental table_ACME E-FIELD Flames.csv | 32 | session summary: 21; continuation / note: 11 | 8 |
| PSI-23_Experimental table_ACME s-Flame.csv | 18 | session summary: 18 | 0 |
| PSI-25_Experimental table_BASS-II.csv | 129 | test record: 129 | 0 |
| PSI-26_Experimental table_BASS.csv | 122 | test record: 121; continuation / note: 1 | 0 |
| PSI-39_Experimental table_CFI.csv | 87 | test record: 87 | 8 |
| PSI-47_Experimental table_DAFT.csv | 2 | sample / session: 2 | 0 |
| PSI-68_Experimental table_Flex2.csv | 8 | parameter summary: 8 | 0 |
| PSI-69_Experimental table_FLEX.csv | 274 | test record: 274 | 0 |
| PSI-98_Experimental table_SAFFIRE-1.csv | 4 | test record: 2; note / calibration: 2 | 0 |
| PSI-99_Experimental table_SAFFIRE-2.csv | 15 | test record: 9; note / calibration: 6 | 0 |

## Selection
Use all metadata and CSVs. Link to large NASA videos and sensor logs instead of downloading them. Prioritize FLEX and normal-flame CFI-G for scalar oxygen/pressure/outcome exploration; BASS/BASS-II and SAFFIRE for material context; SAME/SAME-R for detection. FLEX-2 supports parameter coverage, not individual-test outcome statistics.

## Limits
Inverse-flame oxygen is a burner-stream concentration. Ranges and sets stay textual; fan display values are not converted into airspeed. Unknown values remain null; no forward filling of blank material names. Session summaries, references, notes and calibration rows are not plotted as individual tests. Microgravity evidence does not directly validate lunar or Martian fire safety.