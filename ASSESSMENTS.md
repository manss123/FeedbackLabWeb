# Pre-test / Post-test: CFCT ranking instrument

Implemented from `B Pretest VS Posttest.pdf` (8 pages), supplied 2026-09-27.

## Content and scoring

- Each phase has 20 scenarios and four options A–D per scenario, transcribed from the corresponding PDF column. Options retain their original labels and order; no randomization was specified.
- Participants assign unique ranks 1–4: most appropriate, next most appropriate, less appropriate, least appropriate. Selecting an occupied rank swaps it with the previous rank, or clears the displaced option if there was no previous rank.
- Server score per option = `3 - abs(correctRank - participantRank)`. Each item has a maximum of 12; total maximum = 240; percentage = total / 240 × 100, rounded to two decimal places for display. Raw total and item/option scores are retained.
- Pre-test items 9, 10, 11, 16 and 20 use A, B, D, C in rank order. Other pre-test items and all post-test items use A, B, C, D, as printed in the supplied PDF.
- This is not the old 4-dimension self-rating instrument. Do not synthesize Empathy/Clarity/Motivation/Actionability scores, apply the old 80% passing rule, or infer certificate eligibility. The PDF supplies neither dimension assignments nor a passing threshold.
- The old simulated 30-second video prerequisite is removed from post-test.

## Data and submission

Version: `cfct-ranking-2026-09-v1`. Drafts are local, versioned, phase-specific and UID-specific. They are not research submissions and survive page refresh on the same browser.

`submitRankingAssessment` is an authenticated callable Cloud Function. It validates exactly 20 distinct item IDs and a permutation of 1–4 for every item; it ignores client-supplied scores and computes results using server-only keys. No AI scoring is involved.

The transaction writes an immutable document at `users/{uid}/assessment_attempts/{version}_{phase}` and a snapshot at `users/{uid}.assessmentResults.{phase}`. The snapshot includes raw ranks, option and item scores, total, max, percentage, instrument version and server-generated `submittedAt`. The researcher export uses this snapshot, so no additional assessment query is required.

One final submission per phase/version is retained. A deterministic document ID makes retrying after a lost response or submitting from concurrent tabs idempotent. Post-test requires a stored pre-test of the same version. Successful UI completion occurs only after server confirmation; failed submissions retain the draft. Firestore rules prevent client writes/deletes of submitted results. Authentication and other participant data retain their existing rules.

The overview and result pages read authoritative Firestore results; historical mock local scores are not migrated or represented as responses to this instrument. Module/VR/survey progress still has legacy local state and is not fully migrated by this change.

## Research export

Research JSON schema 2.3 includes `assessment_responses`; a separate CSV exports the same rows. Each row is one item for one participant/phase/version (20 rows per submission). Columns include pseudonymous participant code, server submission time, total/max/percentage, item score and ranks/option scores A–D. Totals are repeated per item: do not sum the total-score column across all 20 rows. Date filtering uses submission day in Asia/Bangkok; text search and participant filters apply, while module/VR/activity-type filters do not apply to these rows. Missing submissions produce no rows, not zero scores. Compare percentages as percentage-point differences, not relative percent improvement.

## Release and verification

Deploy the callable and updated Firestore rules together with the website: `firebase deploy --project feedbacklabs --only functions:submitRankingAssessment,functions:ssr,firestore:rules,hosting`. A frontend-only deploy is insufficient.

Run `npm --prefix functions run build`, `node --test scripts/test-assessment.mjs`, `npx tsc --noEmit` and the existing regression scripts. The assessment tests cover PDF key differences, score boundaries, invalid responses, rank swapping, server persistence/retries and pre-test prerequisite. `scripts/extract-assessment-pdf.py` and `scripts/build-assessment-content.mjs` reproduce the bank from the supplied PDF; extraction requires PyMuPDF and the local source PDF. Generated answer keys must remain under `functions/src`, never in browser assets.

Local integration: `firebase emulators:exec --project demo-assessment --config firebase.assessment-test.json --only firestore,auth "node scripts/test-assessment-emulator.cjs"`. Uses isolated ports 7185/7199 and synthetic accounts, checking actual transactions, concurrent retries, saved scores, owner-only reads, protected score fields and ordinary profile updates. No production data is used.
