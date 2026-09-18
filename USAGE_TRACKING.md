# Usage and learning timing instrumentation

Implemented 2026-09-17. Event schema v2; research export schema 2.0. New code must be released before real users generate these fields. No historical backfill is performed.

## Stored events and identity

All instrumentation appends to the existing `activity_log` collection via the Firebase client SDK, with the authenticated UID. Existing ownership/create-only rules and admin callable reads apply; no new collection or callable is required. Current rules do not validate all telemetry fields, so these are client-reported research observations, not tamper-proof security evidence.

- `eventId`: random UUID, reused for every delivery retry; document ID is identical.
- `createdAt`: Firestore server timestamp, time the first write reaches the server.
- `occurredAt`: client ISO timestamp captured before queuing. Client clocks may be inaccurate. Offline delivery may arrive much later and out of order.
- `browserId`: random UUID persisted per authenticated UID in localStorage. Separate browsers/profiles/private windows/devices generally produce different IDs; clearing storage changes it. It is not a physical device identity or fingerprint. `browserIdPersistent` reports whether storage succeeded.
- `tabId`: random UUID per loaded document; duplicate tabs and reloads receive new IDs.
- `webSessionId`: random UUID per authenticated document/account context, independent of the VR session ID. A reload or account change starts a new session. BFCache restore continues the same web session with a resume event; no heartbeat covers time away.
- `authTime`: Firebase token metadata when available, without storing tokens. Browser family and device category are coarse user-agent inferences; the full user agent, IP, key contents, query strings and URL hashes are not stored.
- `runId`: one mounted module/VR run or enabled assessment form attempt. `stepVisitId` distinguishes repeated visits to the same step. `pageVisitId` joins page entry/exit segments. Reload starts a new run; resumed form drafts do not imply continuous timing across reloads.

Login, explicit logout, authenticated document start, observed pagehide, BFCache resume, page entry/exit, visibility/focus changes and idle transitions are recorded. The tracker runs for authenticated routes including the admin interface; filter by pathname when selecting a learner-only cohort. The system does not block simultaneous logins.

## Timing definitions

YouTube m1 playback now has separate measured intervals via the Player API. See [YOUTUBE_TRACKING.md](YOUTUBE_TRACKING.md) for visible playback, test-content flags and limitations. This does not change the Active proxy definition.

The root tracker samples every 30 seconds and at lifecycle boundaries. It records each heartbeat interval once. Page exits and learning-step exits carry their own measurements; these overlap with heartbeat time and must not be added to it.

- `elapsedSeconds`: monotonic `performance.now()` difference, including breaks during that document segment.
- `visibleSeconds`: measured time while `document.visibilityState` is visible.
- `activeSeconds` / export `active_proxy_seconds`: visible AND focused AND a pointer/key/scroll/touch interaction within the preceding 60 seconds. Initial authenticated document opening starts that window. No input content is recorded. This is an engagement proxy; quiet reading, watching a video, speaking or interacting only inside a Unity canvas may not produce all browser input events.
- `unobservedSeconds`: a sampling gap greater than 45 seconds, excluded entirely from visible/active time to avoid treating sleep or suspended timers as engagement.

Idle state transitions are observed at the next sample/input; duration calculation clips at the 60-second threshold. Visibility time can overlap between documents; it is not necessarily unique person-time.

Module and VR runners record step entry/exit with measured times and reasons. The old in-memory module timer is replaced by persisted events. VR timing run IDs match the session document ID, including the scenario-start event. Stage 1's existing startedAt field is now populated from client time when available; authoritative per-step timing is in the immutable events. The fabricated 60-second recording-duration fallback is removed; typed-only input records zero recording seconds.

Diagnostic, posttest (after wrap-up) and survey track the enabled form's opening through successful submission, or an observed exit. These are form-open durations, not first-answer-to-last-answer measurements. Assessment score persistence is unchanged. Reopening/retaking creates a new form attempt. Missing end events yield null durations in the steps dataset; absence is not interpreted as dropout.

## Timing precision and development lifecycle correction

New duration events store seconds rounded to millisecond precision (for example, 8.542 seconds). The conversion from milliseconds to seconds remains division by 1,000. Admin tables display two decimal places; positive values below 0.01 seconds display `<0.01` rather than zero. Exports retain stored numeric values, including legacy precision.

The application entry uses [React Strict Mode](https://react.dev/reference/react/StrictMode), which replays effect setup/cleanup in development. Immediate logging previously persisted discarded setups as separate, extremely short visits. Timing, page/session tracking and module/VR start effects now defer setup to a microtask and cancel discarded setups before logging. No duration threshold discards genuine committed visits. Regression tests exercise setup, cleanup and setup again.

Historical records are retained without rescaling, merging or deleting them. The admin steps table flags cleanup-ended visits shorter than 0.01 seconds for review; this is a review hint, not proof that a particular historic record came from Strict Mode. Each row measures one step visit or form opening, not the entire lesson.

## Simultaneous usage analysis

The Web Sessions table groups filtered events by UID + webSessionId. For the same participant, overlapping sessions require a positive intersection between client-reported heartbeat intervals. Only intervals up to 45 seconds with zero unobserved gap and wall/monotonic duration agreement within 2 seconds qualify. A login without logout never establishes indefinite overlap. Sessions from other participants are never compared.

`overlapping_web_session_count` counts other document sessions; `overlapping_other_browser_count` counts distinct different browser IDs among those peers. Same browser with different sessions may mean multiple tabs. Different browser IDs may mean another device, browser or profile; this is not confirmed hardware identity. Cross-device clock skew can create or hide overlaps, even when each device's monotonic timer is valid. This is a descriptive signal requiring interpretation, not enforcement or a security alert.

Web and step datasets inherit the server `createdAt` date filter. Measurements may span outside the selected date range; they are not prorated. A start or end outside the filter may be absent in the exported subset. Raw Activity Log exposes client and server timestamps for alternative analysis.

## Delivery and failure behavior

Events are synchronously queued under individual localStorage keys before asynchronous sending. One key per event prevents cross-tab queue overwrites. Retry triggers include new events, authenticated startup, the 30-second timer and reconnect. Each queued event retains its original UID, IDs and occurredAt; a different logged-in account never sends it. Returning to the original account can resume delivery.

Firestore documents remain immutable. A repeated write rejected by the create-only rules is considered delivered only after reading the existing document and verifying the same eventId and owner. This handles a lost acknowledgement and two tabs draining the same queue without duplicate rows. Server createdAt is preserved on retries. A failed write stays queued. A visible status reports pending/failed delivery and storage failure, with manual retry. If browser storage is denied or full, records remain in memory only and cannot survive a closed document.

No browser can guarantee an unload callback during a crash/force-close. The final interval or end event may be missing; durable queued events can resume later, but clearing site data removes the local queue. Explicit logout queues the ending observations before signing out; undelivered records may wait until that same account signs in again. Remote auth changes may have no writable end event for the old identity. Session document writes are separate from this activity queue and can still fail independently.

Heartbeat volume is approximately 120 events/hour/document plus boundaries and learning events. Current admin endpoints fetch all records and paginate only in the UI. A larger research rollout should move date filtering/pagination to the server and set retention/export policy before scaling this collection.

## Verification

`node --test scripts/test-usage-tracking.mjs scripts/test-research-log.mjs scripts/test-learner-access.mjs` checks measurement boundaries, session overlap, old/missing data, durable delivery, duplicate retries, account isolation, exports and auth guards. TypeScript, scoped ESLint and production build are additional checks. Real multi-device/browser behavior and Firestore emulator integration require manual/integration verification; unit tests use controlled service responses and do not claim an actual multi-device trial.
