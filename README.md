# Reviewroom

Reviewroom gives creative teams one place to review copy and artwork, gather precise feedback, and approve a version for release. Editors prepare work; assigned reviewers approve it through ordered stages; workspace owners manage projects and monitor progress.

Eight connected capabilities cover workspace access, project management, versioned assets, anchored feedback and replies, staged approvals, assignments/deadlines/reminders, searchable saved views, and activity/inbox/reporting with exports. A typical flow is **draft → submit → creative review → final sign-off → approved export**. Requesting changes pauses approval; publishing a new version preserves history and starts a new draft. Concurrent stale edits return a conflict rather than overwriting work.

## Stack

- React 19.2.4, Vite 8.2.2, native hooks/fetch, local SVG media, and Roboto 5.3.0; no component library or external media service.
- Python 3.12, Django 5.2.18, Django REST Framework 3.17.2, MongoDB 8, and MongoEngine 0.29.1. There is no SQL database or migration step.
- One root Bun workspace/lockfile; uv creates the Python environment. Node runs the cross-platform lifecycle scripts.
- Explicit service validation and role/project authorization; bcrypt passwords and eight-hour JWT bearer sessions in browser session storage. Signing out revokes the user's existing sessions.
- Source/import/hygiene checks plus Django configuration checks; 17 integration tests use an isolated real MongoDB database. Security fixes upgrade existing dependencies without adding packages.

## Structure

```text
frontend/
  src/features/          # Auth, projects, assets/reviews, inbox, reports
  src/shared/            # API client, shared UI, formatting
  public/media/          # Original local artwork
  .env.example           # Public build-time API URL
backend/
  apps/                  # Domain models, views, services, repositories, tests
  calendar_backend/      # Reference project name retained; settings, routes, WSGI
  scripts/               # Deterministic seed and realistic content
  requirements.txt       # Pinned Python dependencies
  .env.example           # Private backend configuration template
scripts/                 # Setup, lifecycle, lint, build, seed wrappers
.vscode/launch.json      # Django debugger on port 8000
hackerrank.yml           # Authoritative assessment install/run commands
setup.sh                 # Cross-platform setup entry point
vercel.json              # Frontend deployment configuration and headers
skills/validate/         # Read-only submission verifier
transcripts/             # Exported AI sessions at handover
AGENTS.md                # Mandatory transcript logging instructions
GUIDELINES.md            # Acceptance contract
PROGRESS.md              # Phase decisions and verification history
```

## Prerequisites

Install **Node 22.12+**, **Bun 1.3+**, **Python 3.12**, **uv**, **MongoDB 8**, and Bash (Git Bash on Windows). Put their executables on `PATH`. Local verification used Windows, Node 25.6, Bun 1.4.3, uv 0.13.0, Python 3.12.14, and MongoDB 8.0.32.

## Install and run

Run from the repository root in Bash/Git Bash. These are the exact `hackerrank.yml` commands:

```sh
bun install && bash setup.sh --seed
bun start
```

Open **http://localhost:3000**. Django binds to **0.0.0.0:8000**; Vite binds to **0.0.0.0:3000** and proxies `/api/v1` to Django. The frontend waits for healthy MongoDB-backed API readiness. Health: `GET http://localhost:8000/api/v1/health`.

Setup creates missing root, frontend, and backend `.env` files from the committed examples and generates private backend signing secrets. No manual environment edits are needed locally. Real `.env` files are ignored; never commit them. `frontend/.env` contains public build-time configuration only.

### MongoDB and reset behavior

MongoDB must be reachable on `127.0.0.1:27017`. If absent, setup starts `mongod` from `PATH`, using ignored `.mongodb/` storage. The default URI is `mongodb://127.0.0.1:27017/reviewroom_db`; backend `MONGODB_URI` can select another database. Local MongoDB readiness is still required by assessment setup.

**Every `bun start` intentionally resets all six Reviewroom collections** before starting the servers: 5 members, 4 projects, 16 assets, 43 activities, 16 assignment/outcome notifications plus time-based deadline reminders, and 3 saved views. Verification observed 19 total notifications; reminder totals vary with the current UTC deadline window. Stable IDs, version histories, stages, and relative deadlines form a repeatable demo. Other databases and collections are untouched. Use the separate development commands below to keep edits between server restarts. Setup-started MongoDB remains running after application shutdown for reuse.

## Seeded access

All accounts use **`Reviewroom2026!`**. Quick account buttons fill credentials; they still authenticate through Django.

| Email                      | Role                  | Access                                                              |
| -------------------------- | --------------------- | ------------------------------------------------------------------- |
| `owner@reviewroom.test`    | Owner · Maya Chen     | Workspace/project administration, reminder processing, all projects |
| `editor@reviewroom.test`   | Editor · Alex Rivera  | Create and revise assets in member projects                         |
| `reviewer@reviewroom.test` | Reviewer · Sam Taylor | Assigned creative reviews                                           |
| `creative@reviewroom.test` | Reviewer · Priya Shah | Assigned creative reviews                                           |
| `legal@reviewroom.test`    | Reviewer · Jordan Lee | Final sign-off after creative approval                              |

People can comment within their project access. Only assigned reviewers can decide the current stage, and asset owners cannot approve their own work. Change `SEED_PASSWORD` in backend configuration before seeding any hosted demo; use at least 12 characters and at most 72 UTF-8 bytes.

## Commands

Use Bun for dependency installation; the npm commands below execute scripts and do not create an npm lockfile.

| Command                                                     | Purpose                                                                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `bun install --frozen-lockfile`                             | Install the committed JavaScript graph                                                                     |
| `bash setup.sh --seed`                                      | Prepare environment/Python/MongoDB and reset demo data                                                     |
| `bun start`                                                 | Setup/reset, then run both development servers with reload                                                 |
| `npm run dev:backend`                                       | Start Django without resetting existing data                                                               |
| `npm run dev:frontend`                                      | Start Vite without resetting data; wait for the API                                                        |
| `npm run seed`                                              | Reset demo data in the configured database                                                                 |
| `npm run lint`                                              | Syntax, local imports, conservative unused-import checks, debug hygiene, Python compilation, Django checks |
| `npm run build`                                             | Production frontend build into `frontend/dist`                                                             |
| `npm test`                                                  | Real Mongo integration tests; MongoDB must be running                                                      |
| `bun run --cwd frontend preview --host 0.0.0.0 --port 3000` | Serve the built frontend; start Django separately for its API proxy                                        |

## Vercel frontend deployment

Import the **private** GitHub repository into Vercel with the repository root as Root Directory. `vercel.json` selects Vite, frozen Bun install, `npm run build`, and `frontend/dist`, and adds frame/content-type/referrer/permissions headers. Set **`VITE_API_URL=https://YOUR-API-HOST/api/v1`** before building. Hash routing needs no history fallback rewrite. This configuration has been prepared; a live deployment has not been performed.

Django and MongoDB require separate hosting. Use a Python WSGI host that loads `backend/calendar_backend/wsgi.py`, supplies its production server, installs `backend/requirements.txt`, and exposes HTTPS. Provision authenticated MongoDB with TLS, set `MONGODB_URI`, and provide independent random `DJANGO_SECRET_KEY` and `JWT_SECRET` values of at least 32 characters. Set `DJANGO_DEBUG=false`, `ALLOWED_HOSTS` to the API hostname, and `CORS_ALLOWED_ORIGINS` to the exact frontend origin. Preview origins require explicit allowlisting; no wildcard is configured.

Set `REVIEWROOM_HTTPS=true` after HTTPS works. Enable `TRUST_PROXY_HTTPS=true` only when a controlled proxy removes incoming client headers and sets `X-Forwarded-Proto` itself. Use a shared edge rate limit for multi-worker hosting; built-in bounded login counters are per worker. Never use assessment `bun start` in production: it resets data and uses development servers. Seed a hosted demo deliberately, then use the production WSGI entry point. Keep demo credentials out of a real customer deployment.

This private authenticated workspace intentionally uses `noindex`/robots restrictions. Reminders stay in the product; there are no outbound emails, uploads, WebSockets, or hosted-media dependencies. Windows runtime and browser checks are recorded in `PROGRESS.md`; Linux execution, live Vercel hosting, and full screen-reader certification remain unverified.
