# 15 - Refactor Plan: Design System, Frontend Refactor, and Backend Hardening

Status: in execution. This document is the working contract for the refactor
of the existing implementation. It does not change any requirement in
docs 01-14; it plans work that brings the implementation closer to those
requirements and cleans up technical debt.

## 1. Verified baseline (2026-10-21)

- Backend: 65 tests pass (`SUPABASE_DB_URL= USE_SQLITE=true python -m pytest -q` in `backend/`).
- Frontend: `npm run build` passes (Next 16.3.6, React 19.2.8, Tailwind 4.3.3, TS 5.9.3).
- Working tree contains in-flight attachment hardening (upload size handler,
  image content validation, download header hardening, frontend attachment
  viewer and confirm dialogs). This plan completes, corrects, and tests it.

## 2. Safe boundaries for business-logic changes

### 2.1 Invariants that must NOT change (enforced by docs 02, 04-06, 10, 11)

1. Status machine: QUEUED, IN_PROGRESS, WAITING_USER, RESOLVED, CLOSED,
   REOPENED; no long-lived ASSIGNED status; transitions only via the approved
   lifecycle.
2. Priority is copied from the requester's account at creation and is never
   accepted from the client.
3. Queue: P1 bypasses; P2 before P3; FIFO within priority; position computed
   dynamically server-side; never stored.
4. SLA: P1 immediate, P2 10 min, P3 60 min unattended; escalation idempotent;
   claim/assignment stops the clock.
5. Role permission matrix (USER/AGENT/ADMIN) and station scoping.
6. INTERNAL messages/attachments never exposed to USERs on any read path.
7. Feedback tokens: hashed at rest, 17:00 GMT working-day expiry, one-time.
8. No physical deletes; audit history retained.
9. API contract: existing endpoint paths, methods, and response shapes stay
   as-is (the existing subset; do not invent endpoints from doc 09 that are
   not implemented).
10. The frontend is not a security boundary and never computes authoritative
    priority, status, queue position, or SLA state.

### 2.2 Changes that ARE in scope (fixes toward the documented requirements)

| Change | Justification |
|---|---|
| `PUT/PATCH /api/v1/tickets/{id}/` returns 405 | Currently bypasses the transfer workflow: no TicketTransfer record, no audit, no SLA reset - violates docs 05/14 sections 25, 33, 37. The frontend does not use these methods. Message points callers to the transfer action. |
| Oversized upload returns a clear 400 "5 MB" error (instead of misleading "A file is required.") | Error-message fix; same 400 class; no stored-file behavior change (a tripped file was already dropped by the handler). |
| `resolve` uses `select_for_update` like `claim` | Doc 14 sections 23/69 require atomic business-critical operations; current code can double-issue feedback tokens under concurrency. |
| `MEDIA_ROOT = backend/media` | Doc 10 section 26 (secure storage, outside app source). Today uploads land in the CWD and 22 uploaded files are tracked in git. Pure configuration; no schema change. Existing uploads are relocated to `backend/media/tickets/` so existing `storage_key` values keep resolving. |
| SVG sanitizer rejects more hostile inputs (SMIL animation, xml-stylesheet PI, srcset/data, object) | Strictly tightens acceptance of unsafe files. Valid plain SVGs continue to pass; SVGs containing a DOCTYPE were already rejected. |
| `python -m pytest` defaults to SQLite locally unless the real environment explicitly sets `USE_SQLITE=false` | Safety fix: local runs currently create/drop a test database on the remote Supabase instance. CI keeps its Postgres service (it sets USE_SQLITE=false explicitly). |
| Frontend: design tokens, componentization, accessibility (focus traps, Escape, carousel pause/keyboard, contrast >= 4.5:1) | Doc 14 section 73. Presentation only; no business logic moves client-side. |
| requirements.txt pins refreshed to match the installed versions (Django 6.1.x, DRF 3.18.x) | The current pin excludes the installed Django and CI installs a different version than the dev machine. |

### 2.3 Explicitly out of scope (no scope creep)

- Route-splitting the single-page frontend (login/, dashboard/, tickets/...).
  The current query-param shell works; a route split is an architecture
  change, not a refactor. Deferred.
- New features from doc 09/03 that are not implemented (notifications UI,
  search, reports, response templates, WebSockets, wait-for-user/resume/
  reopen/close actions, pagination).
- MinIO storage wiring, Channels consumers, email delivery.
- Removing the `WAITING_USER` status or changing escalation for REOPENED
  tickets (product decision; flagged as follow-up).
- Consultant expiry enforcement (product decision; flagged as follow-up).
- Any new npm/pip dependency.

## 3. Parallel work packages (disjoint file ownership)

Four packages run in parallel in the same working tree. Each agent owns its
files exclusively and must not edit files outside its ownership.

| Package | Owner files |
|---|---|
| FA - Design tokens | `frontend/app/globals.css` ONLY |
| FB - Componentize + a11y | `frontend/app/page.tsx`, `frontend/app/layout.tsx`, `frontend/app/loading.tsx`, `frontend/app/DashboardSkeleton.tsx`, `frontend/app/lib/api.ts` (moved to `frontend/lib/api.ts`), new `frontend/components/**` |
| B - Backend hardening | `backend/**` EXCEPT `.github/**` and EXCEPT the media relocation (C does that) |
| C - Hygiene + CI | `.github/**`, `.gitignore`, `README.md`, `frontend/README.md`, `frontend/package.json`, `frontend/pnpm-lock.yaml` + `frontend/pnpm-workspace.yaml` (remove), unused `frontend/public/*.svg`, relocation of upload artifacts + git index entries for them |

Nobody commits. Nobody pushes. Nobody runs destructive git commands.

### 3.1 Design token contract (binding for FA and FB)

Tailwind v4 `@theme` in `globals.css` emits both CSS variables
(`var(--color-ink-muted)`) and utilities (`text-ink-muted`, `bg-surface`,
`border-line`, ...). Token NAMES are fixed; FA chooses exact VALUES to meet
the contrast requirements and publishes a contrast table in its report.

```
Surfaces : page, surface, surface-muted, surface-brand, surface-brand-soft
Ink      : ink, ink-strong, ink-soft, ink-muted, ink-inverse
Lines    : line, line-strong
Brand    : brand, brand-strong, brand-focus, brand-ink (text on surface-brand)
Accent   : accent, accent-ink, accent-soft      (the lime/olive family)
Status   : danger, danger-ink, danger-soft
           warning, warning-ink, warning-soft
           info, info-ink, info-soft
           success uses brand tokens
```

Contrast requirements (WCAG): every `*-ink`/`ink-*` text token >= 4.5:1 on
surface, surface-muted, and its paired `*-soft` background; brand/accent used
as large text or UI border >= 3:1; focus ring >= 3:1 against adjacent colors.

Intent mapping for FB (replace hex arbitrary-values by intent):
- Dark text hexes (#20291f, #26342e, #263a31, #263126, #26321b, #344a3e,
  #27352f, #202b27) -> `ink` or `ink-strong`.
- Muted text hexes (#74817b, #899181, #7d8678, #7d8981, #7b8980, #65736b,
  #626f68, #5d6b62) -> `ink-muted`; darker secondaries (#52605a, #526242,
  #43503e, #43594b) -> `ink-soft`.
- Divider hexes (#edf0e7, #e5e9df, #dce8df, #e8eadf, #dfe8e1, #dce5df,
  #dce5de, #e2eae3, #e5ece6, #e4eae5, #e2e9e4, #e7ede8, #e9eeea, #edf0ed)
  -> `line`; stronger ones (#dfe4d7) -> `line-strong`.
- Brand greens (#047857, #065f46, #059669, #10b981, #34d399, #6ee7b7,
  #d1fae5, #b7e4d0, #ccebdc, #e4f8ee, #effcf5, #ecfdf5, #a7f3d0, #a7d8c2)
  -> `brand` / `brand-strong` / `brand-focus` / `surface-brand` /
  `surface-brand-soft`.
- Lime/olive (#9cba43, #edf6ca, #667c31, #788763, #dce9c0) -> `accent` /
  `accent-soft` / `accent-ink`.
- Error reds (#9a5849, #7b4335, #96594a, #b42318, #8f2525) and error tints
  (#fbefeb, #faefea, #ead2cb, #fff9f7, #fecaca, #fff5f4, #e8c2b8) ->
  `danger` / `danger-ink` / `danger-soft`.
- Amber/warnings (#7a5a00, #705315, #6d5b1b, #925f00, #79520b, #8b6200,
  #d99b08, #facc15, #f9f4d8, #e6d6a8, #faf5e6, #f5f1e2, #f4d98c, #fffbeb) ->
  `warning` / `warning-ink` / `warning-soft`.
- Info blues (#234b7a, #244b7a, #1d4ed8, #edf3ff, #bfdbfe, #f3f8ff) ->
  `info` / `info-soft`.
- Page/panel backgrounds (#f7f8f6, #f7f8f2, #f8faf7, #f8faef, #f5f7f1,
  #f2f7df, #f2f4ee, #f0f1ed, #effaf3, #fbfcfb) -> `page` / `surface-muted` /
  `surface-brand-soft`.

Badge text always uses the `*-ink` variant on the `*-soft` background.

### 3.2 CSS class contract

- FA keeps EVERY class referenced by the current TSX defined and visually
  coherent (app-shell, app-sidebar, metric-card, content-card, admin-*,
  requester-*, welcome-*, queue-*, empty-*, primary-action, secondary-action,
  sign-out-action, login-card, brand-*, loading-*), re-tokenized internally.
- FA additionally defines the currently-dangling hooks so they are no longer
  dead: `request-form`, `request-form-grid`, `request-form-field`,
  `agent-ticket-list`, `loading-screen`.
- FA deletes only confirmed-dead rules: `.hero-toolbar`, `.hero-carousel`,
  unused custom props (--green, --green-deep, --lime, --surface-muted,
  --font-geist-sans reference), the color-remap hack block (its effect is
  replaced by correct token values).
- FB keeps referencing the same component class names and replaces hex
  arbitrary-values with token utilities. FB must not reference classes FA
  deletes.

## 4. Prioritized implementation plan

P0 - correctness and safety (must all land, verified by tests):
1. B: accurate oversized-upload error (request flag + view check), scoped
   upload handler; SVG sanitizer gap fixes; module-level
   `content_disposition_header` import; `FileNotFoundError` -> 404 on
   download; tests for all of the in-flight hardening (size limit, bad
   PNG/JPEG magic, hostile SVGs, agent-history download, headers).
2. B: `resolve` locking; PUT/PATCH tickets -> 405 with tests.
3. C: stop tracking uploaded files in git (relocate to `backend/media/tickets/`,
   `git rm -r --cached` the two artifact locations, anchored `.gitignore`
   entries). Prevents future leaks of user data into the repository.
4. FB: dialog/lightbox accessibility (Modal primitive: Escape, focus trap,
   focus return, scroll lock); carousel pause control + keyboard support.

P1 - design system and structure (the core refactor):
5. FA: token layer in `globals.css` per the contract, dead CSS removal,
   unified weights/radii/focus styles, contrast-compliant values.
6. FB: split `page.tsx` into `components/{ui,dashboard,tickets,auth}/`,
   move `api.ts` to `lib/`, dedupe sidebars/headers/error banners/transfer
   form/status constants, adopt tokens, fix race guard in admin refresh,
   duplicated officer filter predicates, `formatAge` day support,
   `crypto.randomUUID` fallback for non-secure contexts, consistent
   history handling for nav actions.

P2 - infrastructure and hygiene:
7. B: `MEDIA_ROOT`/`MEDIA_URL` settings; conftest SQLite-default fix;
   requirements.txt pins matching installed versions; EMAIL_BACKEND
   deprecation if mechanical.
8. C: frontend CI job (install + lint + build), working lint script,
   single lockfile (npm), remove unused public scaffold SVGs, refresh stale
   READMEs.

P3 - integration and verification (sequential, after all packages land):
9. Full backend suite on SQLite; frontend production build; eslint;
   `npm ci`-clean install check.
10. Audits: no stray hex arbitrary-values in TSX; no dangling CSS classes;
    no dead API exports; no tracked upload artifacts.
11. Browser end-to-end pass over login, requester, officer, admin flows,
    including dialogs and carousels.
12. Final summary; behavior changes flagged (see section 2.2).

## 5. Follow-up decisions deferred to the product owner

- REOPENED P2/P3 tickets never escalate (escalation task filters QUEUED only).
- `WAITING_USER` status is never set by any code path.
- Feedback token is returned in the resolve response (relayed by the agent)
  and feedback endpoints are unauthenticated by design; confirm delivery
  channel with the owner.
- Consultant account expiry is stored but never enforced.
- No pagination/throttling yet (doc 09/10 specify both).
- Remote Unsplash images power the requester hero; consider bundling local
  artwork for offline internal use.
- 22 uploaded files already exist in git history; history purge is a separate
  decision (requires rewrite; coordinate if the repo will be shared).
