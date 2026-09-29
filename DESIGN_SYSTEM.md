# Design System — FeedbackLab VR

Revision: 2026-09-28 · Friendly, visual-first dashboards

FeedbackLab helps Thai university lecturers learn and practice constructive feedback. Retain the **Mint Laboratory** identity: Prompt typography, calm neutral surfaces, mint accents and clear Thai instructions.

**Status:** The instructor dashboard now implements the visual direction in §12 in this checkout. This is not a claim of deployment or completed visual usability testing. Other screens should follow the task-specific guidance and migration checklist. Assessment content, scoring and persistence remain governed by [ASSESSMENTS.md](ASSESSMENTS.md).

## 1. Design principles

1. **Make the action visible before interaction.** A learner must recognize what is clickable without hovering, trying it, or relying on a pointer cursor. This applies equally on touchscreens.
2. **Separate reading, choosing and acting.** Reading areas use typography, spacing and dividers; choices use visible form controls; actions use buttons or links.
3. **Match the design to the task.** Assessment forms need concentration; monitoring dashboards need inviting visual summaries. Use generous charts, expressive but consistent colors, and grouped surfaces for dashboards. Quiet must not mean empty, monochrome or difficult to scan.
4. **Show position and consequence.** Explain the current step, answer status and what the next action will do. Distinguish choosing an answer from submitting it.
5. **Be supportive and precise.** Avoid judgmental wording, unexplained scores, false success messages and decorative effects that compete with the task.

### Why the previous design was difficult

In the supplied Pre-test screenshot, the progress area, question container, option containers and rank buttons all have rounded outlined surfaces. The whole option also turns mint when a rank is selected. These repeated shapes make the clickable region and the selected value harder to identify.

The former recommendations to prefer cards everywhere, add hover to generic cards, use large rounded CTA containers and scale badges are superseded by this document.

| Previous pattern                                                  | Revised pattern                                                                | Intended benefit                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Progress inside a separate rounded card                           | Label, slim progress bar and supporting text directly in the page flow         | Progress reads as information                         |
| Question card → four option cards → sixteen button-shaped choices | One question section → four divided rows → visible radio controls              | Clear separation between statements and inputs        |
| Green outline/background around an entire answered option         | Selected radio indicator and explicit rank label                               | Shows exactly which value is selected                 |
| Generic hoverable cards                                           | Static sections with explicit actions; a whole-tile link is a narrow exception | Hover no longer implies an action that does not exist |
| Large pill-shaped buttons and large status pills                  | Compact rectangular action buttons; small noninteractive status labels         | Shape, wording and scale reinforce different roles    |

## 2. Visual roles and interaction semantics

Choose the role before choosing the component or styling.

| Role                         | Examples                                      | Default appearance                                                     | Behavior / HTML                                                        |
| ---------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Reading surface              | Scenario, explanation, score summary          | Plain section; optional quiet surface; no shadow or action icon        | `section`, heading, paragraph; no click handler or tab stop            |
| Status                       | Answered count, saved state, completion badge | Plain text or small soft badge with a status word                      | Text/status semantics; no pointer cursor, hover or keyboard focus      |
| Action                       | Next, submit, retry, download                 | Compact button with a verb; one strong primary action in the task area | `button`; disable or show loading only when appropriate                |
| Navigation                   | Open module, go to dashboard                  | Underlined text link, or an explicit labeled navigation button         | TanStack `Link`; meaningful destination label                          |
| Single selection             | Rank, one answer                              | Visible radio circle plus label; grouped choices                       | Native radio or accessible RadioGroup; selected is distinct from hover |
| Multiple selection / consent | Confirm review, survey checkboxes             | Visible checkbox plus readable label                                   | Checkbox; no preselection of consent                                   |
| Disclosure                   | Expand instructions, show details             | Text control with chevron and expanded state                           | Button with `aria-expanded`, or `details`/`summary`                    |

**Required:** use at least two mutually reinforcing cues for controls, such as button shape + action verb, radio indicator + label, or underline + destination. Color and corner radius alone are insufficient.

Do not put `onClick` on a generic `Card` or `div` and call it a button. A card containing a button remains a static container; only the button reacts to hover, focus and activation.

### Whole-tile navigation exception

A module tile may be a single `Link` only when the entire tile opens one destination and contains no other interactive child. Include a visible action such as “เปิดบทเรียน” and a directional icon in the resting state. Give the link a focus outline. Do not nest buttons, links, checkboxes or menus inside it.

If the tile needs multiple actions, use a static section with separate labeled controls instead.

## 3. Color, typography and spacing

### Existing semantic tokens

Use CSS variables / Tailwind tokens from `src/styles.css`; never hardcode colors in components. These mappings describe the current light theme. Dark theme combinations need separate visual checks.

| Token                            | Current light value          | Revised role                                                                   |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| `primary` / `primary-foreground` | Deep slate / near-white      | Primary action button and its label; the actual CSS primary is slate, not mint |
| `mint-primary`                   | `oklch(0.696 0.17 162.48)`   | Brand accent, progress fill and supplemental status decoration                 |
| `mint-light`                     | `oklch(0.97 0.03 162.48)`    | Optional selected-control tint or gentle status surface                        |
| `slate-deep`                     | `oklch(0.208 0.042 265.755)` | Important text in the light theme                                              |
| `slate-text`                     | `oklch(0.446 0.03 256)`      | Supporting text in the light theme                                             |
| `background` / `foreground`      | Theme-dependent              | Page surface and primary readable text                                         |
| `card` / `card-foreground`       | Theme-dependent              | Optional reading surface and its text                                          |
| `secondary`, `muted`, `accent`   | Soft neutral                 | Grouping, subtle hover and disabled backgrounds                                |
| `muted-foreground`               | Muted slate                  | Secondary text, subject to legibility checks                                   |
| `border`                         | Light slate                  | Passive dividers and surface boundaries                                        |
| `destructive`                    | Red                          | Errors and destructive actions; include explanatory text                       |
| `chart-1`, `chart-2`             | Chart palette                | Charts and supplemental warning/info graphics, with text labels                |

Mint is not a universal signal for “click here.” A mint progress bar is still noninteractive. Do not use mint text on mint-light as the only selected or success cue. Prefer readable foreground text plus a checkmark or control indicator.

### Registered interaction tokens

These tokens are registered in `src/styles.css` and its Tailwind theme mapping. Use them consistently for controls; dashboard colors are defined separately in §12.

| Token              | Semantic mapping                                                                   | Purpose                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `control-border`   | `var(--slate-text)` in light mode; a visible foreground-derived value in dark mode | Radio/checkbox outlines and secondary button borders; stronger than passive `border` |
| `control-selected` | `var(--primary)`                                                                   | Radio dot, checkbox mark background and selected segment indicator                   |
| `focus-ring`       | `var(--primary)` with a background-colored offset                                  | Keyboard focus distinct from the selected state                                      |

Validate text, control boundaries and focus visibility on actual backgrounds, including disabled states and dark mode. Existing colors are not a claim of accessibility compliance. The current pale `ring` and `border-input` should not be accepted automatically for critical control outlines.

### Typography

- Global reading scale is defined in `src/styles.css`: root size is 100% below 1024px, 112.5% from 1024px, and 125% from 1920px. With the default browser font these are 16/18/20px. Relative units preserve user font preferences and let rem-based spacing and controls grow alongside text.
- Shared `text-xs` is 0.8125rem (13/14.625/16.25px), `text-sm` is 0.9375rem (15/16.875/18.75px), and body text is 1rem (16/18/20px), with line heights 1.5/1.5/1.6. Legacy 10/11/13px caption classes and chart axis labels follow the caption token globally. Do not add new fixed-pixel tiny text.
- Verify dense tables, sidebar navigation, long Thai labels, mobile forms and 200% zoom when changing this scale. Build/lint checks do not substitute for visual verification. Unity canvas content and embedded third-party players have their own typography and are not resized by these CSS tokens.

- Thai headings and body: `Prompt`, with `Noto Sans Thai` and system sans-serif fallbacks. Use `font-prompt` where needed.
- Numeric data and English labels may use `Inter`; align numeric columns with tabular figures.
- Task page title: `text-2xl sm:text-3xl`, bold. Reserve `text-5xl` / `text-6xl` for marketing hero text.
- Scenario/question: `text-lg sm:text-xl`, semibold, relaxed line height.
- Answer text: `text-base leading-relaxed`, normal weight. Avoid bolding whole answers.
- Instructions and input labels: `text-sm` or `text-base`; critical instructions must not rely on tiny captions.
- Do not apply uppercase or wide letter spacing to Thai sentences.

### Layout and shape

- Base spacing unit: 4px. Use 8–12px within controls, 16–24px within sections and 24–32px between sections.
- Task forms: `max-w-3xl`; dashboard: `max-w-6xl`; marketing: `max-w-7xl`.
- Page padding: 16px on small screens, 24px on larger screens; increase only where reading width remains comfortable.
- Assessment text sections: avoid repeated enclosing borders. Dashboard chart panels and KPI groups: use readable card surfaces with 16–20px corners on a neutral white/gray canvas. Static panels can be visually appealing without implying clickability.
- Buttons and input groups: 6–8px corners, compact content-based width. Avoid large pill shapes for routine task actions.
- Pills: small status badges only; `rounded-full` also remains appropriate for radio circles and avatars.
- Dialogs: 12–16px corners. A restrained, consistent surface shadow is also allowed for dashboard panels; avoid hover lift on static panels.
- Avoid nested outlined answer containers in forms. A dashboard may have several sibling chart panels and summary tiles, each grouping one question the instructor wants answered. This is not a blanket one-container limit.

## 4. Actions: buttons, links and states

Use `Button` from `src/components/ui/button.tsx`. Its current sizes, shadows and focus styling need adjustment to match this specification.

| Variant     | Resting appearance                                               | Example                                        |
| ----------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| Primary     | Solid `bg-primary text-primary-foreground`, no decorative shadow | “ข้อถัดไป →”, “ยืนยันส่งคำตอบ”                 |
| Secondary   | Background surface, visible `control-border`, readable text      | “← ก่อนหน้า”, “ลองอีกครั้ง”                    |
| Text action | Persistent underline and readable text; adequate hit area        | “ทบทวนคำตอบทั้งหมด”, “แก้ไขข้อ 3”              |
| Destructive | Destructive color plus explicit destructive verb                 | “ลบรายการ”                                     |
| Icon-only   | Recognizable icon, accessible name and tooltip where useful      | Close dialog; avoid for the main learning flow |

- Use one primary action in the active task area. Other actions have lower emphasis.
- Design ordinary controls for at least 44px target height; give compact icons/radios a label or hit area that reaches that size. Do not make the visible radio circle itself 44px.
- Use verbs and explicit outcomes. Avoid vague labels such as “ตกลง” when “ส่งคำตอบ” is the actual operation.
- Use `Link` for destinations and `button` for changes within the current screen. Use `type="button"` for non-submit buttons inside forms.
- Full-width primary buttons are appropriate on narrow screens or final submission, not as the default for every control.

### State contract

| State          | Required treatment                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| Rest           | Already recognizable as interactive; never depend on hover for discoverability                                        |
| Hover          | Subtle background/border change on the actual control only; preserve label and geometry                               |
| Keyboard focus | Distinct 2px outline/ring with 2px offset; visible independently of selection                                         |
| Pressed        | Brief contrast change; no layout shift or bouncing                                                                    |
| Disabled       | Unavailable semantics and muted styling; retain a readable label and explain the reason nearby when it is not obvious |
| Loading        | Spinner + specific text such as “กำลังบันทึก…”; preserve width and prevent duplicate submission                       |
| Selected       | Persistent radio dot/check/indicator + readable label; never use hover styling as the selection indicator             |
| Error          | Inline message near the affected field or action; preserve answers and provide a clear recovery step                  |

Use native `disabled` for unavailable controls where appropriate. Use `aria-disabled` only when intentionally keeping a control discoverable in the tab order, and explicitly prevent activation. Disabled, loading and selected are different states.

## 5. Reading areas, progress and badges

### Static content

Use semantic sections with headings. Separate repeated content with spacing or `border-t border-border`. If reusing `Card`, override its current shadow and unnecessary outer border; do not inherit its appearance by default.

Static content has no hover lift, border-color transition, chevron suggesting navigation, pointer cursor or keyboard tab stop. Do not make the entire option statement appear selectable when only a rank input changes its answer.

Dashboard statistics use large values, concise labels, recognizable icons and gentle category colors. Use white summary tiles with distinct colored top borders, icons and values. Keep drill-down actions explicit. The tile itself does not become clickable merely because it has color or rounded corners.

### Progress

Show “ตอบครบแล้ว 6 / 20 ข้อ” above a slim progress bar, with supporting text below. Keep this directly in the page flow rather than inside its own card. Count completed questions, not just the current question index.

Steps and timelines are static unless navigation is supported. When a step is a navigation control, use a labeled button/link with focus treatment. Show locked steps with a lock and a reason; color alone is insufficient.

### Status badges

Badges use a small label such as “ครบแล้ว”, “ยังไม่ครบ” or “บันทึกแล้ว”. No hover animation, raised shadow or pointer cursor. If a status can be changed, expose a separate control. Tooltips must not contain the only explanation.

## 6. Reference redesign: Pre-test / Post-test

This is the implementation reference for `src/components/ranking-assessment.tsx`. Apply the same interaction roles to surveys, lesson activities and other forms.

### Page structure

1. Small phase label, title and short instructions.
2. Unboxed answered count, progress bar and draft-saving explanation.
3. Rank legend as plain text: `1 เหมาะสมที่สุด · 2 เหมาะสมรองลงมา · 3 เหมาะสมน้อยลง · 4 เหมาะสมน้อยที่สุด`. Wrap naturally on mobile.
4. One question section: scenario number, scenario text and the rank instruction. An optional single background surface may group this section.
5. Four option rows A–D, separated by whitespace and a thin divider. A–D are text markers, not badge-shaped buttons.
6. Each row has its own visible radio group for ranks 1–4. Keep the controls together under the answer, distinct from the answer text.
7. Task footer with secondary “ก่อนหน้า”, primary “ข้อถัดไป” and a lower-emphasis underlined “ทบทวนคำตอบทั้งหมด”.

### Schematic — hierarchy, not a pixel-perfect screenshot

```text
Pre-test · 20 สถานการณ์
แบบทดสอบก่อนเรียน
คำชี้แจง ...

ตอบครบแล้ว 6 / 20 ข้อ                                30%
━━━━━━━━━━━━━━━━───────────────────────────────────────
คำตอบระหว่างทำเก็บไว้ในเบราว์เซอร์นี้

1 เหมาะสมที่สุด · 2 เหมาะสมรองลงมา · 3 ... · 4 ...

สถานการณ์ที่ 7 จาก 20
ข้อความสถานการณ์และคำถาม ...
เลือกอันดับ 1–4 ให้ครบทุกตัวเลือก โดยไม่ซ้ำกัน

A   ข้อความตัวเลือก A ...
    อันดับของ A     ○ 1     ● 2     ○ 3     ○ 4
    เลือกอันดับ 2 · เหมาะสมรองลงมา
───────────────────────────────────────────────────────
B   ข้อความตัวเลือก B ...
    อันดับของ B     ○ 1     ○ 2     ○ 3     ○ 4
    ยังไม่ได้เลือก
───────────────────────────────────────────────────────
C   ...
D   ...

[ ← ก่อนหน้า ]                             [ ข้อถัดไป → ]
                 ทบทวนคำตอบทั้งหมด  (ขีดเส้นใต้)
```

In the rendered UI, the last primary button is solid slate; the previous button is outlined. Radio circles are always visible, including before any answer is selected. The four ranks may share a compact horizontal group boundary, but must not look like four independent action cards.

### Rank-control behavior

- Use one `fieldset`/legend or accessible RadioGroup per option. Each rank has an accessible name including the option, number and meaning, e.g. “ตัวเลือก A อันดับ 2 เหมาะสมรองลงมา”.
- The radio label is clickable; clicking unrelated answer text or the outer row must not assign a rank.
- Selected state: filled radio indicator plus the text “เลือกอันดับ 2 · เหมาะสมรองลงมา”. Optional mint tint stays inside the selected control, not around the entire option row.
- Keep all answers initially unselected. Preserve visible focus and standard radio keyboard behavior: Tab to the group, arrows between ranks, Space to select.
- Retain the existing duplicate-rank swap behavior, with an explanation before answering. If two existing ranks are swapped, announce both affected options through a polite live region. Example: “A เปลี่ยนเป็นอันดับ 2 และ B เปลี่ยนเป็นอันดับ 1”.
- If a previously unranked option takes an occupied rank, announce that the displaced option is now unranked. Update its visible label and completed-question count immediately. Never silently imply all four ranks remain complete.
- Keep the legend visible in the page flow and include meanings in accessible names; do not force users to remember a color code.

### Navigation and review

- Allow moving between incomplete questions, retaining answers. “ข้อถัดไป” navigates; it does not submit. At the last question use “ทบทวนคำตอบ”.
- Review shows a compact list/table: question number, answer status and a separate “แก้ไขข้อ …” text action. Avoid another grid of status cards that also act as buttons.
- Explain unanswered questions and allow jumping back to them. Do not label incomplete work as an error merely because a learner is browsing.
- Final submission requires all questions complete and the existing review confirmation. Explain that submitted answers cannot be edited. Show a single primary “ยืนยันส่งคำตอบ”.
- Loading/error/success follow §4. Show final success only after the server confirms the write. Do not expose the answer key or introduce new scoring or passing rules during this visual redesign.

## 7. Responsive layout, motion and accessibility review

- Use mobile-first Tailwind breakpoints: unprefixed small screens, `sm` ≥640px, `md` ≥768px, `lg` ≥1024px, `xl` ≥1280px.
- At 320–390px widths, answer text and controls stack without horizontal page scrolling. Four rank hit areas still fit; reduce surrounding padding before reducing target sizes.
- On larger screens retain readable question width. Do not stretch rank controls across a full dashboard-width container.
- Test long Thai answers, 200% zoom, keyboard use and error/loading states. Focus must stay visible and must not be hidden by a sticky footer.
- Prefer a normal-flow action footer first. If a sticky footer is needed, reserve space, account for device safe areas and verify it does not obscure the last option.
- Use 150–200ms color transitions for actual controls. No hover transforms for reading surfaces or badges. Respect reduced-motion preferences for optional movement; avoid pulsing the current step continuously.
- Use text plus an indicator for selected, incomplete, saved and error states. Do not rely on color alone.
- Meaningful images need Thai alt text; decorative images use empty alt text. Decorative icons should not duplicate the accessible control name.

## 8. Patterns across the system

| Area              | Reading / status                                                  | Explicit interaction                                                |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Learner dashboard | Colored summary tiles, stage labels and readable grouped sections | “ทำแบบทดสอบก่อนเรียน”, “เปิดบทเรียน”, “ฝึกสถานการณ์”                |
| Module list       | Module name, description and progress                             | Labeled open/continue link; single-link tile only under §2          |
| Lesson content    | Reading section and lesson progress                               | Distinct play control, form controls and next-step button           |
| VR simulation     | Scenario context and stage status                                 | Labeled microphone, playback, retry and next-stage controls         |
| AI feedback       | Readable report sections and labeled score charts                 | Separate retry button for unavailable AI; no hover on report text   |
| Research admin    | Table rows, timestamps, metrics and statuses                      | Labeled filters, sort controls, expand controls and export buttons  |
| Survey            | Labels and divided question groups                                | Visible radio/checkbox/select/textarea controls                     |
| Score summary     | Score, explanation and completion text                            | Labeled continuation link; certificate action only when implemented |

For research tables, use row hover only when it helps tracking columns; do not add a pointer or navigation chevron unless the row has a real action. Prefer a dedicated “ดูรายละเอียด” control so row appearance does not imply hidden navigation.

VR charts may retain the existing round-one amber and round-two mint distinction, with explicit round labels. Module badge palettes remain decorative identity; do not reuse them as arbitrary action colors. All colors must use registered semantic tokens.

## 9. Research-flow requirements retained

- Stage 2 is self-reflection: temporary local audio playback, without AI scores or judgments. Audio upload/archive/admin playback is not required.
- Distinguish AI loading, success and unavailable. A `null` must not become zero, fabricated text or a neutral emotional assessment. Show an understandable Thai failure message and a separate retry action where supported.
- Compare before/after only when genuine results exist. Label general guidance separately from AI-generated analysis.
- Pre/post uses the 20-item ranking instrument. Drafts are local; final answers are validated and scored by a callable Function and stored in Firestore. Preserve the existing timing/logging and user-scoped drafts while changing appearance.
- The supplied instrument does not establish a passing threshold or certificate criteria. Do not reinstate the former 80% rule or show a certificate as issued without a server-issued record. PDF issuance remains unimplemented.

## 10. Implementation order and acceptance checklist

### Migration order

1. Register interaction tokens and update shared `Button` sizing/focus/shadow defaults. Audit existing usages so icon buttons and dense admin controls remain usable.
2. Apply §6 to Pre-test/Post-test: flatten progress and option containers, use visible radio groups, announce rank swaps, and use a list for review.
3. Apply the same action hierarchy to survey and lesson forms, then dashboard/module navigation.
4. Review VR overlays and admin tables in their own context. Do not blindly remove every container; retain meaningful grouping and overlays.
5. Remove obsolete per-page overrides that recreate pill buttons, nested option cards or noninteractive hover effects.

### Accept a screen only after checking

- [ ] Before hovering, testers can point to actions, inputs and reading areas correctly.
- [ ] Static content and status labels do not look or behave like controls.
- [ ] Buttons have explicit action labels; links have explicit destinations.
- [ ] The primary action is easy to identify and its effect matches its label.
- [ ] Selection remains distinguishable from hover and keyboard focus.
- [ ] Rank swaps/cleared values are visible and announced; unfinished counts are correct.
- [ ] Keyboard order is logical; radios work with keyboard; passive containers add no tab stops.
- [ ] Thai text, targets and footer fit narrow screens and zoomed layouts.
- [ ] Loading, disabled, incomplete, failure and saved states are understandable without color alone.
- [ ] Existing question text, scoring, submission safeguards and research logging remain unchanged.

Run a short task review with the client and representative lecturers: identify what can be clicked without touching the screen; rank one scenario; change an occupied rank; find an unfinished question; and explain what “ข้อถัดไป” versus “ยืนยันส่งคำตอบ” does. Record confusion and unintended actions, then revise. The specification is a design proposal, not evidence that usability testing has passed.

## 11. Source files

The dashboard-specific specification in §12 supersedes earlier generic surface guidance where they differ. It does not change the assessment interaction or scoring rules.

- Tokens and theme mapping: `src/styles.css`
- Root fonts/layout: `src/routes/__root.tsx`
- Actions and surfaces: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`
- Choice primitives: `src/components/ui/radio-group.tsx`, `src/components/ui/checkbox.tsx`
- Progress: `src/components/ui/progress.tsx`
- Learner navigation: `src/components/learner-shell.tsx`
- Ranking assessment: `src/components/ranking-assessment.tsx`
- Pre/post routes: `src/routes/_authenticated/diagnostic.tsx`, `src/routes/_authenticated/posttest.tsx`
- Dashboard and modules: `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/modules.tsx`
- VR: `src/routes/_authenticated/vr-simulation.tsx`
- Admin research: `src/components/admin-research-dashboard.tsx`
- Assessment behavior/data: [ASSESSMENTS.md](ASSESSMENTS.md)
- Current architecture and remaining gaps: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)

## 12. Instructor dashboard — inviting, visual-first design

### Experience goal

Within a quick scan, an instructor should find: **how many learners participated, how participation changed, which lessons were used, and how VR practice scores compare**. The page should feel welcoming and worth revisiting. A list of text blocks with a few small charts does not satisfy this goal.

Interaction clarity and visual warmth must coexist: use attractive static panels for information, compact labeled buttons for actions, and visible controls for filters. Do not remove all panels or all color to distinguish actions.

### Visual hierarchy and layout

1. **Compact controls:** date range and refresh are a small toolbar. Advanced filters and technical explanations are collapsed. Keep a partial-data warning visible when relevant.
2. **Four summary tiles:** large 36–48px figures, 14–16px labels, one category icon per tile. White surfaces use teal, blue, violet and amber on top borders, icons and values; do not tint the tile backgrounds. No hover lift or full-tile click handler.
3. **Hero chart:** daily participation spans the content width. Plot height is 384px on desktop and 320px on mobile, excluding heading and caption. The chart, not its explanation, dominates this section.
4. **Lesson comparison:** another large grouped bar chart with the same spacious plot height. Both series use consistent colors and text legends. Do not shrink charts just to fit every section above the fold.
5. **VR comparison and review information:** two supporting panels on wide screens; stacked on mobile. Show round labels, actual mean scores and sample size. The white review panel uses an amber border for context, not an alarming failure state.
6. **Recent learners:** compact table at the bottom with a clear “ดูผู้เรียนทั้งหมด” action. Detailed research logs and exports remain in their own views.

```text
Date range / refresh                      Advanced filters
Overview                 Learners                 Research export

[ Teal: learners ] [ Blue: VR ] [ Violet: paired scores ] [ Amber: post-test ]

┌ Daily participation — full-width visual focus ───────────────────┐
│                                                                │
│                 Large blue bars · 384px plot                    │
│                                                                │
└ Brief caption / expandable data table ──────────────────────────┘

┌ Lesson participation ───────────────────────────────────────────┐
│       Large grouped bars: blue = started, teal = completed      │
└────────────────────────────────────────────────────────────────┘

[ VR scores: amber first / teal second ] [ Records to review ]
[ Recent learners table                                      ]
```

### Semantic color palette (implemented tokens)

| Tokens                                  | Role                                                       | Rule                                                  |
| --------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `monitor-canvas`                        | Neutral gray page background                               | Separate the page from readable chart surfaces        |
| `monitor-teal`, `monitor-teal-soft`     | Learners, completed lesson series, second VR round         | Readable accent for text, borders and charts          |
| `monitor-blue`, `monitor-blue-soft`     | Participation bars, started lesson series, VR session tile | Visually distinct from completed series               |
| `monitor-violet`, `monitor-violet-soft` | Paired-score summary                                       | One intentional accent, not a generic AI gradient     |
| `monitor-amber`, `monitor-amber-soft`   | Assessment summary, first VR round, review context         | Informational warmth; do not equate this with failure |

All colors are CSS variables in `src/styles.css`, with dark-theme values. Use foreground text for body copy and labels alongside every color distinction. Color is supplemental; chart legends and numeric tables must preserve meaning without color perception. Actual contrast and device rendering still require visual verification.

### Chart and content quality

- Use 13–14px axis text, thin dashed horizontal gridlines, no heavy axis boxes and readable tooltips. Round bar tops subtly. Leave breathing room between the title, subtitle and plot.
- Use bars for discrete observed days. Do not invent missing dates, smooth a trend across missing observations or insert attractive sample data when the dataset is empty.
- Empty states keep the panel's space and show a calm, readable explanation on a muted inset surface. Do not render a fabricated graph.
- Keep the chart subtitle to one short explanation. Put method detail and full numeric values in an expandable section; retain sample size and partial-data status without requiring expansion.
- Do not use decorative pie charts, gauges or gradients where they add no information. Beauty comes from proportion, meaningful color, typography and spacing.
- On mobile, stack panels, preserve chart height and horizontal label readability, and avoid page-level horizontal scrolling. Test long Thai labels and zoom.
- Preserve real data definitions, explicit refresh and read-cost controls. A polished dashboard must not imply live presence, statistical significance or complete data without evidence.

### Review before acceptance

Ask the instructor to locate participation, lesson usage and VR score comparison without opening another view; identify the main chart before reading instructions; and distinguish each action from a static tile. Check populated, empty and partial-data states on desktop and mobile. Do not mark visual QA complete from build/tests alone.

### Dashboard preference refinement (2026-09-28)

Use neutral white/gray page and panel backgrounds. Keep color on buttons, icons, text, borders and chart series. Soft brand tokens remain available elsewhere, but do not apply them as dashboard panel fills. Keep full research limitations in exported metadata/codebook; the export view shows only three concise usage notes, with timestamp warnings when needed. Do not display the long technical limitations list below the monitoring overview. Partial-data warnings remain visible near loading controls.

### Assessment accents (2026-09-28)

Keep the green brand theme across pre-test, post-test and questionnaires, including headings, progress and primary actions. Keep page and question surfaces neutral. Color belongs to the response scale: ranking 1–4 uses teal, blue, amber and violet respectively, with facial emoji from most to least suitable; questionnaire 1–5 uses violet, amber, blue, teal and teal, with facial emoji from the lowest to highest response level. Repeat each level’s color and icon in the explanatory legend and choice controls. Color and emoji describe the response level, never correctness or a preferred answer. Preserve numeric labels, full scale explanations and a visible selected radio dot; do not color the entire option row. Controls have a minimum height of 44px and a keyboard focus outline. Completed answers use a check-circle plus a text label in the review list. These presentation changes do not change scoring, question order or submission behavior.
