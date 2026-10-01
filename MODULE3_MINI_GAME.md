# Module 3 — Read the Emotion, Shape the Feedback

Source: `B โมดูลที่ 3_Mini game.docx.pdf` (23 pages), supplied by the project owner.

Implemented content:

- Round 1: three single-choice steps: recognize emotion, empathic first response, supportive follow-up. Answer keys B, C, B.
- Round 2: delivery versions A/B/C (answer C); multiple selection A/B/C/D, excluding E; drag and drop Tone / Pace / Body Language (Neutral-Calm / Moderate / Open).
- Round 3: self-regulation, empathic de-escalation, evidence-focused follow-up. Answer keys B, C, C.
- Each wrong submission shows feedback and a hint; a correct submission unlocks the next step. The learner explicitly proceeds to the next step/round. Correct answers cannot be overwritten.

## Scoring decisions to review

The PDF specifies round totals 3 / 3 / 4 (10 total), but not every step's weighting. The implementation uses:

- Round 1: 1 point for each of the three choices.
- Round 2: 1 point each for Tone, Pace and Body Language in the final drag submission. Earlier choice and multiple-selection steps are mandatory, tracked formative activities worth 0 points.
- Round 3: 1 point for self-regulation; 2 for the response combining Empathy and De-escalation; 1 for Learning Focus. This 1/2/1 allocation is an implementation interpretation requiring researcher review, not an explicitly weighted answer key in the PDF.

First-attempt score uses the first submitted answer to each scored step; final learning score uses the latest attempt. Untouched steps have null accuracy and contribute zero to the running score; the completed result requires all nine steps to be correct. A multi-select is submitted as a complete set (not scored on each checkbox toggle). A drag answer is submitted as three slots (not scored on every movement).

## Persistence and timing

Draft: `flvr.draft.modules.m3.miniGame3` in localStorage, containing submitted attempts. Resume opens the first incomplete round/step. Unsubmitted checkbox/drag changes are component state and are not durable after reload.

At module completion, results are stored under `users/{uid}.moduleProgress.m3.miniGame`; `matchScore` is null. Existing completed placeholder M3 users can submit the new content; an existing completed result of the same version is retained when practicing again. This follows the client-written learning activity model, not the server-scored pre/post assessment model.

Attempts include selection, correctness, per-dimension checks, score, client submission timestamp, presentation timestamp, responseTimeMs, retryCount, hintDisplayed, responseTags and errorTypes. Response time is monotonic elapsed time from the step presentation (or prior submission) to submission; it can include inactivity/background time and is **not** active learning time. Refresh starts a new presentation interval. Tags distinguish defensive, authority-based, avoidance, empathic and evidence-focused choices.

No Firestore write occurs on a drag or choice selection. Scores and attempts persist with the module completion write, following the existing M1/M2 lifecycle. Local drafts remain if saving fails, and the summary provides a retry action. These results are not automatically new Activity Log events or a new admin export table.

## Temporary presentation

Per the user's instruction, the banner, coach, female feedback avatar, badges, theme and responsive layout reuse M1 assets. M3 situation text and answer wording follow the supplied PDF. Source media instructions are treated as content-production notes: no new images or short videos are generated. Delivery versions are currently described in text, so this version does not measure actual audio/video delivery recognition. The feedback is deterministic from the document; it does not call an AI service.

Validation: `node scripts/test-module3-mini-game.mjs`, TypeScript, scoped ESLint. Browser/device visual verification is still required.
