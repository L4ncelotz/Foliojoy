# Foliojoy — Portfolio Intelligence (Phase 1 vertical slice)

**Status: development preview only. NOT ready to expose to public users or real sensitive documents.**

This repo starts the Portfolio Intelligence app discussed in `docs/`. It contains a working first slice:

- Register / sign in / sign out with Argon2 password hashing and DB-backed httpOnly cookie sessions.
- Create user-owned USD portfolios.
- Download holdings CSV template, upload CSV (max 256 KB / 200 positions), or edit holdings manually.
- Validate before commit: date, symbol/exchange syntax, duplicate positions, finite positive numeric fields, reconciliation, USD only.
- Commit a confirmed point-in-time holdings snapshot (duplicate retries are idempotent).
- View a responsive allocation dashboard with exact Decimal-backed totals and holdings weights.
- View explicit limitations: **no cost basis, P&L, performance history or market quotes yet**.

## Run with Docker Compose (local development)

1. Install Docker Desktop, `cp .env.example .env` and replace the password with a strong URL-safe password (avoid special URL delimiters).
2. `docker compose up --build`
3. Visit http://localhost:8080

The web port binds to localhost only. Do not forward it to the internet as-is.

## Run without Docker (SQLite-based local trial)

Requires Python 3.12+, Node.js 22+.

**Windows one-command start:** double-click `dev.bat` (or run it from a terminal). It opens the backend in a separate window and runs the frontend in the current one; the backend window auto-creates its venv on first run.

Manual equivalent:

```bash
cd backend
python -m venv .venv
# activate .venv for your shell
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Visit http://127.0.0.1:5173 (use `127.0.0.1`, not `localhost`, if another local app already binds port 5173; then run `npm run dev -- --port 5174`). Backend uses `sqlite:///./portfolio_local.db` by default in this *development-only* mode; Docker Compose uses PostgreSQL. Vite proxies `/api` to the backend.

## Tests

```bash
cd backend
pytest -q
cd ../frontend
npm run build
```

## Financial rules

- A holdings snapshot is **not** a trade ledger. Purchase dates, cost basis and investment performance are not inferred from screenshots or snapshots.
- Snapshot market values are **user supplied**. Unit price, if supplied, is a price *as of snapshot date*, not purchase price. No quote provider or FX source is integrated.
- All positions in a snapshot require the same date, quantity, symbol, exchange, USD and either unit price or market value. A mismatch is rejected.
- Every portfolio read/write is scoped to the authenticated owner.
- Preview is not persisted. Only explicit confirmation commits a snapshot.

## Critical gaps before public beta

- Rate limiting on authentication, account verification/password reset, security audit, production TLS/cookie configuration, logging/monitoring, data retention and deletion/export.
- Security review for CSRF/origin handling behind reverse proxies and shared-domain deployments.
- Real instrument identifiers, corporate actions, approved market/FX data feeds, and historic cost basis/returns.
- Transaction CSV schema/import/ledger, document upload/OCR and AI memory/chat (future phases).
- Worker queue, inference quota, upload abuse controls, privacy/legal/regulatory review.

See `docs/` for full architecture, PRD, decisions and roadmap. No production readiness or financial accuracy beyond the supported USD snapshot scope is claimed.
