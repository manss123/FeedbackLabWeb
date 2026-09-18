# Research Learning and Activity Logs

Updated: 2026-09-17. Implemented in `src/components/admin-research-dashboard.tsx`, loaded by `src/routes/admin/index.tsx`. Transformations live in `src/lib/research-log.ts`; export definitions and interpretation notes live in `src/lib/research-codebook.ts`.

## Views and units of analysis

| View / exported dataset                   | One row represents                                    | Evidence                                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Participant behavior / `participants.csv` | One participant in the selected cohort                | Observed event counts/days, distinct modules, VR records, paired-score coverage, latest profile demographics                                            |
| Learning Log / `vr_sessions.csv`          | One stored VR session including both speaking rounds  | Stage timestamps, transcript lengths, recording durations, eight separate self-ratings, goals, four rubric scores plus overall per round, paired deltas |
| Learning Log / `module_logs.csv`          | One participant × module in the selected event window | Start/completion event counts and observed reopen-after-completion counts                                                                               |
| Activity Log / `activity_events.csv`      | One stored milestone or telemetry event               | Event ID, client/server times, web session, page visit, run, step, timing and explicit VR linkage                                                       |
| Web Sessions / `web_sessions.csv`         | One authenticated document session                    | Browser/tab IDs, bounded heartbeat measurements, observed overlap counts                                                                                |
| Learning Steps / `learning_steps.csv`     | One visit to a step within a run                      | Module/VR/assessment, start/end, elapsed/visible/active-proxy time, end reason                                                                          |

The participant population is the union of UIDs in users, sessions and activity records. A missing user/profile document does not discard otherwise recorded activity. Zero counts mean no matching evidence in the loaded data, not proof that behavior never occurred. The dashboard does not substitute local progress defaults, points or levels for observed learning behavior.

The learner's existing individual history page remains accessible from a VR session detail. No raw audio upload or retention was added. Session detail displays saved transcripts, reflection, selected/custom goals, self-ratings and available AI scores.

## Sources and authorization

The dashboard reuses `adminExportData` (users + sessions) and `adminListActivity` (milestones and telemetry), after Firebase Auth restoration. Both existing callables enforce `requireAdmin`. Both reads must succeed; a failed source shows an error/retry state rather than an empty activity dataset. Source requests are parallel, not an atomic Firestore snapshot; `snapshot_loaded_at_utc` records when the combined client load completed.

No new Cloud Function or database schema is required for this change. The table paginates 25 rows at a time in the browser; the existing callables still read all records. This is not server pagination and may need replacement when the study grows. Automatic refetch on window focus is disabled; researchers can explicitly refresh.

## Filtering and time semantics

- Shared filters: participant search (name/email/faculty/code), participant selection, and inclusive calendar dates in Asia/Bangkok (UTC+7).
- VR scenario, module and event-type filters apply only to their respective table/export; they do not silently change the participant population or other datasets.
- Activity and module logs select events by `createdAt` within the chosen date range.
- VR selects sessions by their start `createdAt`. The selected session's entire latest saved lifecycle and explicitly linked events are retained, including those after the chosen date window. This allows a session started at the boundary to retain its outcomes.
- Participant sequence and VR attempt index are calculated from all loaded history before date filtering. Attempt indices are scoped by participant and scenario. Equal timestamps use document ID for deterministic ordering, not as proof of real action order.
- Invalid timestamps remain visible/flagged when no date range is selected. Date filtering excludes them and the UI reports the count of invalid timestamps in the full load.
- UTC ISO 8601 is used in exports; the UI presents Bangkok time. A gap between milestone events and elapsed time from session start to stage 4 include pauses. Neither is active learning time.

## Missing data and linkage

`null` is exported as JSON null or a blank CSV cell. Valid zero values are retained, including zero teaching experience or a zero score. Delta is round-two minus round-one and is calculated only when both scores are finite numbers between 0 and 100. The displayed mean delta is session-weighted, with the number of paired sessions shown; it is not a participant-weighted estimate or significance test.

Missing AI scores do not by themselves establish an API failure. Older upstream defaults of zero cannot be distinguished retrospectively from true zero scores. Current records do not preserve a structured AI error state or scoring/prompt version.

VR event linkage requires an explicit `sessionId`, matching participant UID, and matching scenario when provided. No nearest-time heuristic is used. Status values are `matched`, `not_recorded`, `session_missing`, and `mismatch`. Unlinked legacy events remain exportable in Activity Log. A repeated round-two run may overwrite that round's session fields; event counts do not recreate historical scores for every retry.

Legacy module events have no run/attempt identifier. The aggregate module table retains its original definitions and `active_learning_seconds` remains null. New runs carry `runId`; measured step visits are provided separately in Learning Steps, including repeated visits to a step. Do not sum step measurements and web heartbeat measurements together: they describe overlapping time.

Self-ratings remain eight separate variables (1–5), tied to each scenario's questions. They are not averaged into an assumed common scale or merged with the distinct pre/post assessment rubric. Before/after assessments and surveys remain primarily local and are not manufactured from submission events.

## Export protocol

The current export schema is 2.1, adding nullable YouTube fields to Activity Log. See [YOUTUBE_TRACKING.md](YOUTUBE_TRACKING.md). The temporary m1 video is marked `video_is_test=true`; it is not actual lesson content. Video durations overlap web/step durations and must not be added to them.

Admin duration cells display seconds with two decimal places, or `<0.01` for smaller positive values. CSV/JSON preserve numeric data rather than these display strings. Step rows include client start and end timestamps with seconds and a review hint for extremely short cleanup-ended visits. Historical values are not corrected automatically; see [timing precision and lifecycle correction](USAGE_TRACKING.md#timing-precision-and-development-lifecycle-correction).

Each table exports all filtered rows, not only the visible page. CSV uses fixed English variable names and UTF-8 BOM for Thai text; an empty dataset still exports column headers. Spreadsheet formula-like strings are escaped; the optional JSON text export preserves original text.

`feedbacklab_research.json` schema 2.0 contains six filtered datasets (participants, VR, module aggregates, activity, web sessions and learning steps) plus export/load times, filter settings, matched participant codes, interpretation notes, and the full codebook. The codebook can also be exported as `research_codebook.csv`; `research_metadata.json` records filters and methods separately for CSV users.

Participant codes are stable truncated SHA-256 values of a fixed namespace and Firebase UID. Names, emails and raw UIDs are not included in analytic files or metadata. This is pseudonymous linkage, not a guarantee of anonymity: demographics, times and optional qualitative text can still identify someone. Names remain visible within the authorized admin UI.

Transcripts, reflection and goal text are excluded from exports by default and can be explicitly included for qualitative analysis. Research consent is exported as a recorded value, including null when unknown; this view does not automatically define study eligibility or exclude participants on behalf of the researcher.

## Instrumentation still needed for richer future studies

New instrumentation captures page visits, session boundaries, visibility/focus/idle signals and timed steps prospectively. See [USAGE_TRACKING.md](USAGE_TRACKING.md) for exact definitions, delivery behavior and overlap limitations. It does not reconstruct historic telemetry, versioned question responses, complete retry score histories or instrument/scoring versions. Those remain future collection work. Store genuine measured values; do not fill historical gaps with estimates presented as observations.

## Verification

Run `node --test scripts/test-research-log.mjs` for date-boundary, missing-score, explicit-linkage, ordering, incomplete-profile, module-reopen, export and participant-code regression checks. Application validation uses TypeScript, scoped ESLint and the Vite build.

For isolated manual UI checks, run `node scripts/preview-research.mjs` and open `http://127.0.0.1:4318`. This development-only preview seeds synthetic records and blocks the dashboard's Firebase service imports. It is not part of the application route or a production data fallback. Browser interaction and visual verification remain pending because no browser was available in the implementation session.
