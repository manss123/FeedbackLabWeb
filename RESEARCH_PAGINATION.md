# Bounded research reads (2026-09-18)

The production dashboard uses `adminResearchPage`, protected by the same `requireAdmin` email allowlist as research exports. No new database collection, client write privilege or public read rule is introduced.

## Read behavior

- Initial selection: seven Bangkok calendar days, editable before applying the date range. Changing local participant/search/table filters uses already loaded data; choose a new server range to retrieve other dates.
- Each request queries at most 201 documents per unfinished collection (`users`, `sessions`, `activity_log`), returns at most 200, and uses the extra document only to determine whether another page exists. Completed collections are skipped on subsequent calls. This bounds returned document reads; query/index/minimum read charges may also apply.
- Sessions and events use `createdAt >= start` and `< next day` in UTC+7, capped at the first request's server time. Timestamp nanoseconds plus document ID form a stable descending cursor. Users use document ID ordering and are not filtered by signup date, so participant demographics remain available.
- Cursor payloads are validated and bound to the date range. Every page requires researcher authorization. They use values rather than re-reading an anchor document; no offsets or count queries are used.
- One page loads automatically. Load next page retrieves another bounded set. Load all explicitly walks remaining pages for export. Stop prevents subsequent requests; an already running request may finish. Five-minute query caching avoids refetch on a quick return; window focus and reconnect do not trigger refetch. Refresh resets to the first page.
- Firestore's built-in createdAt and document-ID ordering indexes support these queries; there is no new multi-field participant/event-type filter requiring a composite index.

## Completeness and export

Until all collections are exhausted successfully, the UI marks totals as partial and disables data exports. A failed page retains loaded rows, displays an error and can be retried. CSV/JSON use the complete loaded server range, then the existing local filters. JSON schema 2.2 adds `server_range`, `server_as_of_utc`, and `dataset_complete_for_server_range`. The codebook and interpretation notes describe the limited history.

This is not a transactionally frozen snapshot: profiles and mutable session records may change between requests. Events are immutable and normal server-timestamp inserts after the initial cutoff are excluded. Backdated administrative imports or deletion during pagination can change results. Missing/invalid createdAt records do not qualify for Timestamp range queries. No guessed timestamps or historical events are created.

Sequence, attempt index, reopen counts, video sums and session overlap refer to the loaded range, not lifetime history. A start/end or linked VR session outside that range can be absent. `session_missing` means missing from the selected data, not confirmed absent from the database. Select a wider range before drawing longitudinal conclusions.

## Costs and video checkpoints

Opening Admin no longer scans the entire history. Full-range exports necessarily read the selected data; pagination itself does not make a full export cheaper. At maximum, an initial page queries 603 documents, before any index/minimum-query charges. Subsequent pages read only collections still unfinished.

YouTube checkpoints now persist once every 60 seconds, while local sampling remains every second. Play/pause/end, error and exit boundaries still persist measured intervals. Continuous video plus web heartbeats contributes approximately 120 writes/hour/document, plus boundaries and other learning events (previously 180). Abrupt termination can leave up to roughly a checkpoint interval unqueued, potentially longer if browser timers are suspended. Queued records remain durable.

Legacy `adminExportData`/`adminListActivity` remain for compatibility with previously loaded clients. The new dashboard does not call them. Per-learner detail endpoints are unchanged and can still read that learner's complete history. Refresh older browser tabs to use the bounded dashboard.

## Verification

Build Functions first: `npm --prefix functions run build`.
Run `node --test scripts/test-research-pagination.mjs` for date boundaries, invalid cursors, nanosecond/tied timestamp pagination, bounded reads, skipped completed collections and fixed insertion cutoff. These tests use a controlled Firestore query double; they do not establish production index health or browser behavior.
