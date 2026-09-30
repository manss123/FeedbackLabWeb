# Module 1 — Build the Best Feedback

Source: `B โมดูลที่ 1_Mini game.docx.pdf`, 12 pages. Replaces Module 1's Elaborate matching activity; other module placeholders remain unchanged. Uses the supplied `module1-banner.png`, shared typography, neutral panels and green primary controls. The reference screenshot is a layout guide; the actual activity has 3 rounds and a 10-point maximum, not 8 questions.

Module 1 now has four activity steps: Video → Concept → Mini Game → Reflect. The separate Explain/Quiz step was removed at the user's request. Forward/back navigation and progress use that same four-step list. New M1 completions save `quizScore: null`; the summary uses Mini Game alone out of 10. Historical quiz data is not migrated or deleted.

Round 1: purpose B gates the four-slot build. Round 2: purpose C, four-slot build. Round 3: purpose D, opening B, follow-up B. Sentence placement uses drag-and-drop only, as requested: native dragging for mouse and pointer-based dragging for touch/pen. Dropdowns and click-to-place controls are removed. Filled slots can be dragged to swap positions; reset remains available. Correct answers unlock the next activity; the answer key appears only after a correct build. All feedback is deterministic lesson guidance, not a live AI response. Coach video and scenario animations were not provided and are not simulated.

## Scoring and authoring decisions

- Round 1: Specific = canonical strength and improvement in their slots; Respectful = neither “พูดเร็วเกินไป” nor “ต้องกลับไปซ้อมใหม่” selected; Supportive = canonical strength and benefit in their slots; Actionable = canonical action in its slot. Each is 1 point. Purpose is a gate, not an extra point.
- Round 2: purpose = 1; canonical Strength = 1; canonical Action plus Encouragement = 1. Exact four-slot sequence remains necessary to finish the build.
- Round 3: correct purpose, opening and follow-up = 1 each.
- The PDF gives dimensions and examples but no exhaustive card-to-dimension matrix. The explicit Round 1 mapping above is an implementation interpretation that needs the instrument author's review before using these dimension scores in published research. The missing Round 2/3 incorrect-purpose hints are authored guidance. Some long hints are condensed for readability.
- First-attempt scores use the first submitted answer for each scored step. Final scores use the latest submitted answers. A hint is counted once per incorrect submission that displays guidance, not per render. Attempt records contain answers, results and client ISO timestamps; client time is not a trusted server timestamp.

## Persistence

In-progress game state stays in the mounted module runner when navigating between stages. Leaving the module or reloading starts a new unsaved run, consistent with the existing module activities. On first successful module completion, the existing Firestore update writes `users/{uid}.moduleProgress.m1.miniGame`, including version, per-round attempt histories, first/final scores and hints used. `completedAt` remains a server timestamp. M1 `matchScore` is null, so the old 5-point matching score is not conflated with the new 10-point game. Summary uses the 10-point denominator. Replays of already-completed modules do not overwrite that saved result. No writes occur for each drag/click. Existing research exports do not yet include this new nested mini-game payload.

Validation: `node --test scripts/test-module1-mini-game.mjs`, TypeScript, scoped ESLint. Browser visual QA is separate from these checks.
