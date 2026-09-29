# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SD4A Client Portal: a lightweight ERP for SD4A (a structural engineering firm) with three roles —
**Client** (views project progress, downloads files once the project balance is paid, pays via
Wompi with optional e-invoicing), **Admin** (manages projects, clients, engineers, payments, files,
activity log), and **Engineer** (views assigned projects, uploads files). Monorepo: Next.js 15 +
TypeScript frontend (`apps/web`, deployed on Vercel) and FastAPI + Python backend (`apps/api`,
deployed on Railway), PostgreSQL, Google Drive for file storage, Wompi for payments, Brevo/SMTP for
email. Brand colors: `#0A7881` (teal), `#68B2B7` (cyan), `#9BE3BF` (mint), Visby CF font.

A separate, unrelated static marketing site (`sd4a-web`, not in this repo) is the public corporate
site; this portal is what it links to for client/admin login.

## Commands

**Local dev (Docker, both apps + Postgres):**

```bash
docker-compose up
```
Web on `:3000`, API on `:8000`, Postgres on host port `5433`.

**Frontend (`apps/web`):**

```bash
npm run dev     # next dev --turbopack
npm run build
npm run lint     # next lint
npx tsc --noEmit -p tsconfig.json   # typecheck (no dedicated script; run directly)
```

**Backend (`apps/api`), without Docker:**

```bash
python run.py
```
Not `uvicorn main:app --reload` directly on Windows — `run.py` forces
`asyncio.SelectorEventLoop` before uvicorn creates its own loop, required by psycopg3 on Windows
with Python 3.12+ (the same guard is also applied at the top of `main.py` itself). There are no
automated tests and no lint config for the API.

**Database schema changes:** this repo has no Alembic migrations despite `alembic` being listed in
`requirements.txt`. Schema changes are inline, idempotent `ALTER TABLE ... ADD COLUMN IF NOT
EXISTS` / `CREATE TABLE IF NOT EXISTS` statements inside `lifespan()` in `apps/api/main.py`, run on
every API startup. Add new columns/tables there, not in a separate migration file.

## Architecture

### Auth flow — three layers, know all three before touching auth

1. **NextAuth** (`apps/web/src/auth.ts`) authenticates against the FastAPI backend and stores the
   backend's JWT as `session.accessToken`.
2. **`apps/web/src/middleware.ts`** gates page routes by session presence and role
   (`ROLE_ROUTES`), redirecting unauthenticated users to `/login` and role-mismatched users to
   `/dashboard`. Its `matcher` deliberately excludes Next.js metadata routes (`icon`,
   `apple-icon`, `opengraph-image`) — including them broke the favicon because the middleware
   redirected those image requests to `/login`, which the browser can't render as an image.
3. **`apps/web/src/app/api/proxy/[...path]/route.ts`** is the *only* thing that talks to the FastAPI
   backend from the browser. It reads the NextAuth session server-side, attaches
   `Authorization: Bearer <accessToken>`, and forwards to `${API_URL}/api/v1/<path>`. Frontend code
   must call it via `proxyFetch()` (`apps/web/src/lib/proxy-fetch.ts`), never `fetch()` the API
   directly — `proxyFetch` also handles a 401 by signing out and redirecting to `/login`.

On the backend, `deps.py` provides `get_current_user` (decodes the bearer JWT, checks
`user.session_version` against the token's `sv` claim to enforce single-session-per-user — changing
a password or resetting one bumps `session_version` and invalidates old tokens) and
`require_roles(*roles)`, a dependency factory used as `Depends(require_roles(Role.ADMIN))` on
route handlers.

### Backend module layout (`apps/api`)

- `api/v1/endpoints/` — one router module per resource (`auth`, `users`, `projects`, `payments`,
  `files`, `deliverables`, `activity`, `notifications`, `engineer_profiles`, `automation`),
  registered in `api/v1/router.py`.
- `models/` — SQLAlchemy async models (`user`, `project`, `project_file`, `payment`,
  `deliverable`, `engineer_profile`, `activity_log`).
- `core/` — cross-cutting helpers: `wompi.py` (checkout URL building, HMAC webhook signature
  verification, amount-in-cents conversion), `drive.py` (Google Drive API — used for both file
  storage *and* as the backup destination via `find_or_create_folder`), `backup.py` (dumps every
  table to gzipped JSON, uploads to Drive, rotates to the last 14), `admin_notify.py` (emails admins
  on payment confirmation, new client, overdue projects), `email.py` (all outgoing email templates),
  `audit.py` (`log_action` — writes to the activity log), `security.py` (password hashing, JWT),
  `rate_limit.py`, `config.py` (Pydantic Settings).

### Payments (`payments.py`, `models/payment.py`, `core/wompi.py`)

A `Payment` has a `type` (`ADVANCE`/`PARTIAL`/`FINAL`) and `status`
(`PENDING`/`CONFIRMED`/`FAILED`). Two ways a `Payment` gets created:

- **Admin-initiated** (`POST /payments`, admin-only): admin picks project/type/amount, generates a
  Wompi checkout link, emails it to the client.
- **Client-initiated** (`POST /payments/self`, client-only): the client picks type/amount for their
  own project; server validates the amount against the project's actual remaining balance
  (`total_value − Σ CONFIRMED payments`) and rejects duplicate `PENDING` payments of the same type.

Both converge on the same Wompi checkout + webhook confirmation path. The webhook
(`POST /payments/webhook`) is unauthenticated by design (Wompi calls it) but requires
`WOMPI_EVENTS_SECRET` to be set — without it, all webhooks are rejected with 503 rather than
silently trusted — and independently re-validates that the transaction amount matches
`payment.amount` before marking it `CONFIRMED`. On `CONFIRMED`, project status auto-advances
(`PENDING_ADVANCE → IN_PROGRESS` on an `ADVANCE`, `PENDING_FINAL → PAID` on a `FINAL`) and admins
are notified via `admin_notify`. `DELETE /payments/{id}` (admin-only) has no status restriction —
it can remove a `CONFIRMED` payment too, which is the escape hatch for fixing a duplicate/erroneous
entry; `PATCH /payments/{id}` (edit) explicitly blocks editing a `CONFIRMED` payment instead.

### Automation (`api/v1/endpoints/automation.py`, `.github/workflows/automation.yml`)

`POST /automation/backup` and `POST /automation/check-overdue` are cron-triggered endpoints
protected by a shared secret (`X-Cron-Secret` header, compared with `hmac.compare_digest` against
`settings.CRON_SECRET`) rather than a user JWT — there is no logged-in user for a scheduled job.
The actual scheduling lives outside this repo's runtime, in a GitHub Actions daily cron
(`.github/workflows/automation.yml`) that calls both endpoints with the secret from repo secrets.

### Frontend structure (`apps/web/src/app`)

Route groups: `(auth)` (login, public), `(dashboard)` (everything behind auth — admin, engineer,
and client views share layout via role checks rather than separate route trees, except
`admin/*` which is gated by `middleware.ts`'s `ROLE_ROUTES`). `icon.tsx` / `apple-icon.tsx` /
`opengraph-image.tsx` at the app root are Next.js metadata routes generating the favicon/OG image
dynamically — see the auth-flow note above about why the middleware must not intercept them.
