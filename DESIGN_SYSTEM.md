# Design System — FeedbackLab VR

Reference document for the UI design of **FeedbackLab VR** (Personalized VR Gamified Learning System) in the **Mint Laboratory** theme, designed for university lecturers. This document is written in a format that can be used directly as a reference prompt for Claude Code.

---

## 1. Design Principles

### UI Tone & Mood

- **Supportive:** Use language and colors that encourage users, avoiding judgment of learners.
- **Educational:** Emphasize clear step-by-step structure and visible progress.
- **Non-judgmental:** Present feedback in gentle colors, focusing on development rather than wrong scores.
- **Professional yet Approachable:** Look academic/research-oriented without being overly stiff.
- **Clear Hierarchy:** Users always know their current position through timeline, progress bar, and status badges.

### Overall Design Direction

- Use **Mint + Slate/White** as the primary theme, conveying freshness, new hope, and a friendly laboratory.
- Emphasize **card-based layout** to group content clearly.
- Use **rounded corners** more than sharp edges for softness.
- Main icons come from **Lucide React**.
- The primary language of the system is **Thai**; the main font is **Prompt** for Thai text and headings.
- Never hardcode colors in components — every color must be tied to a CSS variable / Tailwind semantic token.

---

## 2. Color Tokens

> The project uses Tailwind CSS v4 + CSS Variables in `oklch()` format. Hex values below are for reference and external prompt use.

### Brand / Accent Colors

| Token        | CSS Variable     | OKLCH                        | Hex       | Use Case                                                  |
| ------------ | ---------------- | ---------------------------- | --------- | --------------------------------------------------------- |
| Mint Primary | `--mint-primary` | `oklch(0.696 0.17 162.48)`   | `#00BC7C` | Primary buttons, active icons, success states, highlights |
| Mint Light   | `--mint-light`   | `oklch(0.97 0.03 162.48)`    | `#E4FBEF` | Badge backgrounds, hover states, soft highlights          |
| Slate Deep   | `--slate-deep`   | `oklch(0.208 0.042 265.755)` | `#0E162B` | Large headings, CTA sections, important text              |
| Slate Text   | `--slate-text`   | `oklch(0.446 0.03 256)`      | `#495564` | Secondary text, captions, descriptions                    |

### Semantic Colors

| Token          | CSS Variable     | OKLCH                       | Hex                               | Use Case                 |
| -------------- | ---------------- | --------------------------- | --------------------------------- | ------------------------ |
| Success        | `--mint-primary` | `#00BC7C`                   | Success, passed, completed, check |
| Warning        | `--chart-1`      | `oklch(0.646 0.222 41.116)` | `#E85D04`                         | Warnings, caution states |
| Error / Danger | `--destructive`  | `oklch(0.577 0.245 27.325)` | `#E7000A`                         | Errors, delete, failed   |
| Info           | `--chart-2`      | `oklch(0.6 0.118 184.704)`  | `#00A8B5`                         | Additional info, hints   |

### Background & Surface Colors

| Token             | CSS Variable                         | OKLCH                        | Hex           | Use Case                                   |
| ----------------- | ------------------------------------ | ---------------------------- | ------------- | ------------------------------------------ |
| Background        | `--background`                       | `oklch(1 0 0)`               | `#FEFEFE`     | Main background                            |
| Foreground        | `--foreground`                       | `oklch(0.129 0.042 264.695)` | `#010517`     | Main text                                  |
| Card              | `--card`                             | `oklch(1 0 0)`               | `#FEFEFE`     | Card background                            |
| Card Foreground   | `--card-foreground`                  | `#010517`                    | Text on cards |
| Secondary / Muted | `--secondary`, `--muted`, `--accent` | `oklch(0.968 0.007 247.896)` | `#F0F4F8`     | Secondary backgrounds, section backgrounds |
| Muted Foreground  | `--muted-foreground`                 | `oklch(0.554 0.046 257.417)` | `#61738D`     | De-emphasized text                         |
| Border            | `--border`                           | `oklch(0.929 0.013 255.508)` | `#E1E8F0`     | Borders, dividers                          |
| Ring / Focus      | `--ring`                             | `oklch(0.704 0.04 256.788)`  | `#90A1B8`     | Focus outline                              |

### Dark Mode (if enabled)

- Background: `#111827`
- Foreground: `#F8F9FB`
- Card: `#1F2937`
- Primary (in dark): `#E1E8F0`
- Muted: `#374151`

---

## 3. Typography

### Font Family

| Role              | Font Stack                                                         | Usage                      |
| ----------------- | ------------------------------------------------------------------ | -------------------------- |
| Headings / Thai   | `"Prompt", "Noto Sans Thai", ui-sans-serif, system-ui, sans-serif` | All headings, Thai text    |
| Numbers / English | `"Inter", ui-sans-serif, system-ui, sans-serif`                    | Statistics, English labels |

> Load via Google Fonts in `src/routes/__root.tsx`: `Prompt:wght@300;400;500;600;700` and `Inter:wght@400;500;600;700`

### Type Scale

| Element | Size                         | Weight  | Line Height       | Letter Spacing             | Usage                  |
| ------- | ---------------------------- | ------- | ----------------- | -------------------------- | ---------------------- |
| H1      | `text-5xl` / `text-6xl` (lg) | 700     | `leading-[1.15]`  | `tracking-tight`           | Hero headline          |
| H2      | `text-3xl` / `text-4xl`      | 700     | `leading-tight`   | `tracking-tight`           | Section title          |
| H3      | `text-xl` / `text-2xl`       | 600–700 | `leading-snug`    | normal                     | Card title             |
| H4      | `text-lg`                    | 600     | `leading-snug`    | normal                     | Sub-section            |
| Body    | `text-base` / `text-lg`      | 400–500 | `leading-relaxed` | normal                     | Main content           |
| Caption | `text-xs` / `text-sm`        | 400–500 | `leading-relaxed` | normal                     | Descriptions, metadata |
| Label   | `text-xs` / `text-sm`        | 600     | normal            | `uppercase tracking-wider` | Badge, step label      |
| Button  | `text-sm` / `text-base`      | 500–700 | normal            | normal                     | Buttons                |

### Typography Rules

- Thai headings always use **Prompt**.
- No serif fonts.
- Important text uses **Slate Deep (`#0E162B`)**.
- Secondary text uses **Slate Text (`#495564`)** or **Muted Foreground (`#61738D`)**.
- Statistics/scores emphasize **font-bold** and larger sizes than normal text.

---

## 4. Spacing System

### Base Unit

Base unit = **4px**

| Token    | Pixel | Tailwind Class              | Usage                         |
| -------- | ----- | --------------------------- | ----------------------------- |
| 1 unit   | 4px   | `space-y-1`, `p-1`, `gap-1` | Minimum spacing               |
| 2 units  | 8px   | `gap-2`, `p-2`              | Spacing between icon and text |
| 3 units  | 12px  | `gap-3`, `p-3`              | Inside cards                  |
| 4 units  | 16px  | `p-4`, `gap-4`              | Standard spacing              |
| 6 units  | 24px  | `p-6`, `gap-6`              | Inside sections/cards         |
| 8 units  | 32px  | `p-8`, `gap-8`, `mb-8`      | Between groups                |
| 10 units | 40px  | `py-10`                     | Medium spacing                |
| 12 units | 48px  | `p-12`, `py-12`             | Inside CTA sections           |
| 16 units | 64px  | `py-16`, `gap-16`           | Large section spacing         |
| 20 units | 80px  | `py-20`, `pb-24`            | Hero / large section padding  |

### Layout Grid

- Container max-width: `max-w-7xl` (1280px) for marketing pages.
- Learner dashboard container: `max-w-6xl`.
- Sidebar width: `w-64` (256px).
- Page horizontal padding: `px-6` (mobile), `px-8` / `px-12` (desktop).
- Card border-radius: `rounded-xl` (12px) / `rounded-2xl` (16px) / `rounded-3xl` (24px).

---

## 5. Component Patterns

### Buttons

Use the `Button` component from `src/components/ui/button.tsx` built with `class-variance-authority`.

| Variant   | Class                                                                            | Usage                                    |
| --------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| Primary   | `bg-primary text-primary-foreground hover:bg-primary/90`                         | Main CTA buttons                         |
| Secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80`                   | Secondary buttons                        |
| Outline   | `border border-input bg-background hover:bg-accent hover:text-accent-foreground` | Alternative buttons                      |
| Ghost     | `hover:bg-accent hover:text-accent-foreground`                                   | Buttons in lists, no background emphasis |
| Danger    | `bg-destructive text-destructive-foreground hover:bg-destructive/90`             | Delete, logout                           |
| Link      | `text-primary underline-offset-4 hover:underline`                                | Inline links                             |

**Special Buttons in the System:**

- **Google Sign-in:** `rounded-full border border-border bg-background px-5 py-2 shadow-sm hover:bg-mint-light`
- **CTA Hero:** `rounded-xl bg-slate-deep px-8 py-4 font-bold text-white hover:opacity-90`
- **CTA Section:** `rounded-2xl bg-background px-10 py-5 text-lg font-bold text-slate-deep shadow-xl hover:bg-mint-light`

### Cards

Use the `Card` component from `src/components/ui/card.tsx`.

```
rounded-xl border bg-card text-card-foreground shadow
```

**Card Variants in the System:**

| Style         | Class                                                          | Usage                  |
| ------------- | -------------------------------------------------------------- | ---------------------- |
| Default       | `rounded-2xl border border-border bg-background p-8`           | Feature cards          |
| Hoverable     | `transition-all hover:border-mint-primary/50`                  | Cards with hover state |
| Stat Card     | `rounded-2xl border border-border bg-background p-6 shadow-xl` | Floating stat cards    |
| Dark CTA Card | `rounded-[3rem] bg-slate-deep p-12 lg:p-20 text-white`         | CTA sections           |
| Progress Card | `rounded-3xl bg-slate-deep p-8 text-white`                     | Dashboard progress     |

### Input & Form Elements

- Input: `rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`
- Label: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`
- Radio / Checkbox: Use shadcn/ui primitives in a clean style.
- Textarea: Used for reflection and survey open-ended feedback.
- Select: Used for Likert scales and dropdowns.

### Modal & Overlay

- Backdrop: Use default shadcn Dialog.
- Modal: `rounded-2xl` card style.
- Toast: Use `sonner` positioned `top-center` with `richColors`.

### Progress Indicators

**Progress Bar:**

```
relative h-2 w-full overflow-hidden rounded-full bg-primary/20
indicator: h-full w-full flex-1 bg-primary transition-all
```

**Timeline / Step Flow:**

- Used in Dashboard and VR Simulation.
- Each step has a numbered circle marker.
- Completed: `bg-mint-primary text-white`
- In-progress: `bg-mint-primary text-white` with pulse/ring.
- Locked: `bg-secondary text-muted-foreground`
- Connector line between steps: `bg-border` or `bg-mint-primary`

### Badge & Tag

| Type         | Style                                                                                               | Usage                              |
| ------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Status Badge | `rounded-full bg-mint-light px-3 py-1 text-xs font-bold uppercase tracking-wider text-mint-primary` | e.g., "Research-Based Learning"    |
| Module Badge | Badge image + name + Thai subtitle                                                                  | Displayed in Dashboard and Modules |
| Locked Badge | `grayscale opacity-40` + Lock icon                                                                  | Badges not yet unlocked            |
| Earned Badge | Full color + gradient tint + hover scale                                                            | Unlocked badges                    |

---

## 6. Animation & Transition

### Duration Standards

| Duration | Tailwind       | Usage                     |
| -------- | -------------- | ------------------------- |
| Fast     | `duration-150` | Hover state, button press |
| Normal   | `duration-300` | Card hover, fade in       |
| Slow     | `duration-500` | Page transition, modal    |

### Easing Standards

- Default Tailwind: `ease-in-out`.
- Hover transitions: `transition-colors`, `transition-all`.
- Avoid custom cubic-bezier unless there is a specific purpose.

### Loading States

- Spinner: `<Loader2 className="h-8 w-8 animate-spin text-mint-primary" />`
- Skeleton: Use `bg-muted` / `animate-pulse` for placeholders.
- Button loading: Use spinner inside the button with `disabled:opacity-50 disabled:cursor-not-allowed`.

### Micro-interactions

- Card hover: `hover:border-mint-primary/50` + `group-hover:scale-110` for icons.
- Badge hover: `hover:scale-105 transition-transform`.
- Focus ring: `focus-visible:ring-1 focus-visible:ring-ring`.
- Ping dot: `animate-ping` for fresh status indicators.

---

## 7. Responsive Breakpoints

The system uses a **desktop-first** approach (Tailwind default) with the following breakpoints:

| Breakpoint | Tailwind Prefix     | Usage     |
| ---------- | ------------------- | --------- |
| Mobile     | default (no prefix) | < 640px   |
| Tablet     | `sm:`               | >= 640px  |
| Laptop     | `md:`               | >= 768px  |
| Desktop    | `lg:`               | >= 1024px |
| Wide       | `xl:`               | >= 1280px |

### Common Responsive Patterns

- **Sidebar:** Hidden (`hidden`) on mobile, shown (`lg:flex`) on desktop.
- **Hero:** 1 column on mobile/tablet, 2 columns (`lg:grid-cols-2`) on desktop.
- **Card Grid:** 1 column on mobile, 2 columns (`md:grid-cols-2`) on tablet, 4 columns (`lg:grid-cols-4`) on desktop.
- **Container Padding:** `px-6` mobile, `px-8` / `px-12` desktop.
- **Font Size:** `text-5xl` mobile, `text-6xl` desktop for H1.

---

## 8. Special Patterns in the System

### VR Simulation Stage Colors

| Round               | Color        | Hex       | Usage                          |
| ------------------- | ------------ | --------- | ------------------------------ |
| Round 1 (Attempt 1) | Amber/Gold   | `#F59E0B` | Radar chart, comparison tables |
| Round 2 (Attempt 2) | Emerald/Mint | `#10B981` | Radar chart, comparison tables |

### Module Badge Color Tints

| Module                  | Gradient Tint                   | Ring                   |
| ----------------------- | ------------------------------- | ---------------------- |
| M1 Feedback Explorer    | `from-emerald-50 to-mint-light` | `ring-mint-primary/40` |
| M2 Principle Master     | `from-rose-50 to-slate-50`      | `ring-rose-300/50`     |
| M3 Empathy Communicator | `from-sky-50 to-blue-50`        | `ring-sky-300/50`      |
| M4 Motivator Coach      | `from-emerald-50 to-teal-50`    | `ring-emerald-300/50`  |
| M5 Action Designer      | `from-violet-50 to-purple-50`   | `ring-violet-300/50`   |

---

## 9. Do's & Don'ts

### Do

- Always use CSS variables / Tailwind semantic tokens (`bg-mint-primary`, `text-slate-text`).
- Use `font-prompt` for Thai text.
- Use `rounded-2xl` or `rounded-3xl` for cards and CTAs.
- Use `text-slate-text` for secondary descriptions.
- Add Thai `alt` text to every image.

### Don't

- Do not hardcode colors such as `text-white`, `bg-black`, `bg-[#...]` directly in components.
- Do not use serif fonts.
- Do not use generic purple/blue AI gradients (except for defined module badges).
- Do not reduce contrast to the point of poor readability.
- Do not create pages outside `src/routes/` or use any router other than TanStack Router.

---

## 10. File References

### Research-flow behavior notes (2026-09-16)

These are agreed interaction requirements. See `PROJECT_CONTEXT.md` for the current implementation gaps; the existing UI does not yet satisfy every item below.

- Stage 2 is self-reflection: allow playback of temporary local audio without displaying AI scores or judgments. Recording upload, audio archive, and administrator audio playback are not required.
- Keep AI loading, success, and unavailable states distinct. A `null` result must remain unavailable; never turn it into a zero score, fabricated paragraph, or neutral emotional assessment.
- The current UI displays “-” for unavailable AI values. Add clear Thai failure text such as “ไม่สามารถวิเคราะห์ด้วย AI ได้ในขณะนี้” and an explicit retry action so a service failure is visible.
- Show before/after comparisons only where genuine results exist. General teaching tips must be labelled as general guidance rather than AI output.
- Pre/post assessment results will move from localStorage to Firestore. Show successful final submission only after the authoritative server write succeeds; allow errors to be retried without inventing a completed state.
- Certificate eligibility is currently displayed, but PDF issuance/download remains disabled. Do not describe a certificate as issued until a server-issued record exists.

### Source files

- Design tokens: `src/styles.css`
- Root layout & fonts: `src/routes/__root.tsx`
- Button component: `src/components/ui/button.tsx`
- Card component: `src/components/ui/card.tsx`
- Progress component: `src/components/ui/progress.tsx`
- Learner shell: `src/components/learner-shell.tsx`
- Homepage: `src/routes/index.tsx`
- Dashboard: `src/routes/_authenticated/dashboard.tsx`
- Modules: `src/routes/_authenticated/modules.tsx`
- VR Simulation: `src/routes/_authenticated/vr-simulation.tsx`
