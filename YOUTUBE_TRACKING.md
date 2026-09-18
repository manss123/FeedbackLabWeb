# YouTube lesson tracking

Implemented 2026-09-17 using the official [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference). No Data API key is needed. The script/player load in the browser, not during SSR.

## Current integration

- Module m1, Engage, uses `TrackedYouTube` instead of the six-second simulated video.
- `src/lib/learning-videos.ts` contains the temporary, user-authorized official API example `M7lc1UVf-VE`. The learner sees a test-content notice and every video observation carries `videoIsTest: true`. Replace the ID and change `test` to false when approved content is available. Other modules do not currently have this video activity.
- Existing progression is unlocked only when the player reports ENDED, not after a fabricated timer. Reaching the end can include skipping; it is not proof of watching every second. This integration does not impose a new minimum viewing requirement.
- Loading/player failures show an error and retry control and record failure observations. They never auto-complete the lesson.

## Observation and timing

`video_observation` events use the existing immutable `activity_log` queue, retry behavior, account ownership and server timestamps. They link the module, learning run, document session, YouTube ID and a unique `videoVisitId`. Discarded Strict Mode setups do not create players or observations.

The component samples monotonic wall time every second and records disjoint intervals at 30-second checkpoints only when there is playback or an unobserved gap. Ready, distinct play/pause/end transitions, errors and lifecycle exits also flush observations. Buffering, cued, visibility/fullscreen and rate changes update local measurement without adding durable rows; repeated state callbacks are ignored. Idle paused playback produces no periodic zero rows. Sum duration fields by video visit to obtain totals; do not sum positions. Player states at the end of an interval are -1 unstarted/error, 0 ended, 1 playing, 2 paused, 3 buffering and 5 cued. `reason` and `videoErrorCode` distinguish errors.

- `videoPlaybackSeconds`: wall seconds while the API reports PLAYING, including background playback. Paused/buffering time is excluded.
- `videoVisiblePlaybackSeconds`: the subset where the document is visible and at least half the player intersects the viewport, or its element is fullscreen. No focus or recent-click requirement is applied, so reading-like inactivity and iframe keyboard controls do not suppress this metric.
- `videoUnobservedSeconds`: sampling gaps over 45 seconds, excluded from playback totals.
- `videoPositionSeconds` and `videoPlaybackRate`: media position and speed at the interval end. Forward/backward seeks do not manufacture viewing time; watching ten wall seconds at 2x still counts ten seconds. Replays count as additional wall time, not unique coverage.

Playback state changes work independently of whether the user uses a mouse, Spacebar or player controls. YouTube does not provide a dedicated seek-button event in this integration: no exact button, key or seek direction is inferred. Positions are snapshots, so not every short seek will be observable.

Standard fullscreen is handled via document visibility, IntersectionObserver and fullscreenchange. Native mobile video presentation and each browser's iframe/fullscreen lifecycle still require device testing. A visible player does not prove attention or rule out obstruction by another window. Ads and other third-party player behavior may limit interpretation; these are player-reported observations, not verified content coverage.

The original Active proxy stays unchanged. Video time overlaps step and web time and must not be added to them. BFCache time away is excluded; force-close may lose the final unqueued interval. Client clocks, delivery delays and missing events have the same limitations as other logs.

## Admin and export

Activity Log defaults to one video summary row per opened player, grouped by participant, web session, run, module, video and visit ID. It shows measured playback/visible totals, first/last observed times, whether reaching the end or an exit was observed, and error count. Times and totals cover only the selected subset; absent end/exit evidence is not inferred as a completed or abandoned visit. Missing visit IDs remain separate records rather than being guessed into groups. Existing historical observations are included without deletion.

The summary exports separately as `video_visits.csv`. `observation_count` is the number of source rows, not the number of plays; `reached_end` and `exit_observed` indicate evidence in the filtered subset, not full coverage or guaranteed final closure (BFCache can resume a visit). The details checkbox exposes original video state/interval rows. The top Activity CSV and JSON still export all filtered original events, regardless of that display checkbox. Export schema remains `feedbacklab-research-2.1`; old events have null video fields, not fabricated zeros. Test-content observations must be excluded when analyzing genuine lesson video learning.

## YouTube advertising requests

A CORS message for a YouTube-origin request redirected to `googleads.g.doubleclick.net/pagead/viewthroughconversion` concerns a third-party advertising request, not Firebase activity delivery. Its response headers are controlled by Google, not this application. Do not disable browser security or proxy these requests as a workaround. This message alone does not establish player or logging failure; verify playback and the saved observations separately. Player errors are still displayed/logged. Privacy-enhanced embedding does not guarantee zero advertising requests. See [YouTube embedded ads](https://support.google.com/youtube/answer/132596) and [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS).

## Verification

Run `node --test scripts/test-youtube-tracking.mjs scripts/test-research-log.mjs scripts/test-usage-tracking.mjs scripts/test-learner-access.mjs`.

Controlled tests cover the real component's Strict Mode lifecycle, play/pause, hidden tabs, fullscreen, seeking/2x playback without inflated time, account switching, player/API errors, cleanup and export preservation. They mock the external YouTube API and do not constitute real browser playback testing.

Manual acceptance: open m1 Engage, play for a measured interval, pause, switch tabs, enter fullscreen, use Spacebar, seek and change speed. Exit the step, refresh Admin and compare exported interval sums. Confirm ENDED advances the existing completion gate and test records remain marked. Repeat on target mobile browsers and with an embed blocked by the network.
