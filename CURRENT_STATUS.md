# BookOracle - Current Status

> **Last verified against production: 2026-09-20.** If it has been a while, treat
> the details below as a starting point to re-check, not as fact.

## What this is

BookOracle is a self-hosted personal library and reading tracker: a React SPA on a
Flask API, backed by SQLite. In production it runs behind host nginx at
`books.ilgaming.xyz`.

## Running services

| Service | Where | Notes |
|---|---|---|
| Frontend | SPA, served from its own container on `127.0.0.1:3505` | nginx terminates TLS and proxies to it |
| API | Flask (gunicorn), `127.0.0.1:5054` | nginx proxies `/api/` and `/static/` |
| Database | `data/bookoracle/books.db` (SQLite) | bind-mounted, not baked into the image |

Both containers bind to **loopback only**. They are reachable from the host and
through nginx, and deliberately not from the LAN. Needing to reach the API
directly is a change to make deliberately, not a misconfiguration to "fix".

## Architecture

- **Backend**: Flask application factory (`app/__init__.py`), SQLAlchemy ORM,
  Flask-Login sessions. Schema creation, migrations, and a pre-migration backup
  run **once** per container start via `app/bootstrap.py`, invoked from
  `docker-entrypoint.sh` before gunicorn starts with `--preload`. Do not move
  schema work back into the app factory: workers race on a fresh database and
  most die on boot.
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS + DaisyUI, Zustand,
  React Router, axios.
- **Legacy templates**: still in the repo (`app/templates/`), **not served**.
  nginx routes every path, including `/legacy`, to the SPA. They are kept for
  reference while the remaining features are ported out, and they are the source
  of the app's residual "MyBibliotheca" branding.

## What is actually working

- Multi-user auth with data isolation, admin area, password handling.
- Add/lookup by ISBN, bulk import from Goodreads and CSV exports, ISBN-list
  import. Duplicates skipped on ISBN or title+author.
- External search, OpenLibrary by default (`GOOGLE_BOOKS_API_KEY` optional).
- Library management, mass edit, reading logs and streaks.
- Monthly wrap-up, including the shareable collage image.
- Real, scheduled, verified database backups (`scripts/db/`).

## Security posture, honestly

- **CSRF is enforced for the legacy template routes and explicitly disabled for
  the entire API**: `csrf.exempt(api)` in `app/__init__.py`. So every write
  endpoint (`POST /api/books` and friends) accepts an authenticated session
  cookie with no CSRF token. Do not describe this app as having CSRF protection.
- Session cookies are `HttpOnly` and `SameSite=Lax`, and `Secure` outside
  development.
- nginx sets HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `X-XSS-Protection`, and `Referrer-Policy`.
- **No Content-Security-Policy** is set.
- A hardcoded public `SECRET_KEY` was removed and the app now refuses to boot on
  a missing, short, or known-public key.

## Known gaps and honest caveats

- **Nothing in the library is marked finished.** Production has 141 books and
  zero rows with a `finish_date`, so every reading statistic (Dashboard, Month
  Wrap-up) legitimately reads `0`. The features work; the data has never been
  recorded. A product gap, not a bug.
- **Keycloak SSO is not in this codebase.** It existed only as uncommitted work
  on the production box and is not deployed.
- **The test suite is red.** It fails on its own password validator and has
  drifted from the app. CI does not run it. A green CI badge is not coverage.
- **Test coverage is neither measured nor enforced.**
- **Lint errors are zero and gated; `no-explicit-any` warnings are ratcheted**,
  not fixed. They sit at genuinely dynamic REST boundaries with no generated
  types.
- **The Capacitor/Android tree is present but the shipped mobile target is the
  SPA**; treat the native scanner as legacy.

## Where the rest of the documentation lives

- `_docs/project-overview.md` - what the app is and who it is for
- `_docs/architecture.md` - structure and data flow
- `_docs/history/` - **historical point-in-time reports** (migration phases,
  one-off fixes, completed UI work). They describe the project when they were
  written, not now. Several claim "100% feature parity", which was not true even
  then.
- `DEPLOYMENT.md`, `MIGRATION.md`, `MIGRATION_SYSTEM.md` - operational detail
- `TESTING.md`, `AUTHENTICATION.md`, `ADMIN_TOOLS.md` - subsystem reference
