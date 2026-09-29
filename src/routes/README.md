# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File                     | URL                                                     |
| ------------------------ | ------------------------------------------------------- |
| `index.tsx`              | `/`                                                     |
| `about.tsx`              | `/about`                                                |
| `users/index.tsx`        | `/users`                                                |
| `users/$id.tsx`          | `/users/:id` (dynamic — bare `$`, no curly braces)      |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                  |
| `files/$.tsx`            | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx`            | layout route (renders children via `<Outlet />`)        |
| `__root.tsx`             | app shell — wraps every page; preserve `<Outlet />`     |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Current route and data boundaries (2026-09-16)

- `_authenticated/route.tsx` and `admin/route.tsx` set `ssr: false`. The learner guard resolves Firebase identity and Firestore setup status through `learner-access.ts` in `beforeLoad`, before forms mount (login/logout both route through `/`, which does the same check). Completed setup redirects directly to `/overview`; incomplete setup goes to the missing step. It is not a data authorization boundary.
- Firebase client SDK plus Security Rules is the default for permitted own-data reads/writes. Do not add an SSR-to-Firestore proxy solely because a page requires sign-in.
- `admin/` reads cross-user data through authenticated, allowlist-protected Firebase callable functions. Hiding an admin link is not authorization.
- AI calls use `src/lib/ai.functions.ts` server-function wrappers and `ai.server.ts` for the secret API key. Verified Firebase caller authentication is still pending; the existing CSRF middleware does not verify Firebase identity.
- `learner.functions.ts` is currently a localStorage store despite its filename. Diagnostic/posttest final submission will use an authenticated callable that computes scores and writes Firestore; the browser will read its own saved results through the client SDK.
- Recordings remain temporary local playback material. Do not add recording upload or persistence as part of assessment migration.
- AI `null` means unavailable. Never conceal failure with a mock report or substitute score.

See [Project Context](../../PROJECT_CONTEXT.md) for current/target status and [System Diagrams](../../SYSTEM_DIAGRAMS.md) for the request paths.

Setup status uses a UID-scoped query cache, invalidated after successful consent/profile writes. Keep this routing decision in `beforeLoad`; do not restore component-effect redirects or separate per-form status queries.
