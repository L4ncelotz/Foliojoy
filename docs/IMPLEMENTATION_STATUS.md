# Implementation status — 2026-10-09

The project has **started**, but Phase 1 is **not complete**.

## Implemented in the starter

- React/Vite/TypeScript frontend, styled responsive web UI, allocation chart with ECharts.
- FastAPI JSON API, SQLAlchemy domain tables, Alembic revision 0001.
- Argon2 password hashing, database-backed httpOnly cookie sessions, per-session CSRF tokens, account-owned data access.
- New USD-only portfolios.
- CSV template download and CSV/manual editable preview before explicit commit.
- Consistent date, value, instrument ID *syntax*, duplicate and numerical validation (not instrument exchange verification).
- Persist confirmed point-in-time snapshots; retrying an identical snapshot avoids duplicate writes.
- Holdings value, weights and total amount calculated with Python Decimal. No external quote/FX assumptions.

## Not implemented / not safe to claim

- Full Phase 1: trading ledger/transaction CSV import, full accounting, price verification, user email verification, account recovery, rate limiting.
- Phase 2: image/PDF upload and extraction, Excel import.
- Phase 3: AI assistant, rebalance simulation, Ollama GPU worker.
- Phase 4: investment thesis memory, embeddings, RAG.
- Phase 5: multi-tenant security assessment, legal/regulatory/privacy review, licensed data providers, public scaling/monitoring.

## Test status

- Python API unit/integration tests passed in SQLite test harness; PostgreSQL integration test added in CI (service container, `postgresql+psycopg`).
- Alembic migration 0001 applied to a temporary SQLite database; PostgreSQL migration verified in CI job.
- Frontend build verified (`npm run build` passes; chunk-size cosmetic warning only). Dependency installation works (npm registry accessible); `npm ci` used in CI and Docker build.
- Docker Compose provided but Docker was unavailable here; Dockerfiles and `.dockerignore` updated (`npm ci`, context exclusions).

## Next vertical slice

1. Confirm first-market scope and select licensed price/FX providers.
2. Add instrument resolution and correct asset identifiers.
3. Add transaction ledger independently from snapshots, with tests for lots, realized P&L and corporate actions.
4. Add stronger authentication and abuse protections before any public exposure.
5. Introduce image import staging and evidence-linked human review only after the underlying snapshot importer is stable.

The product is branded **Foliojoy** (the temporary working label "Northstar" was retired).
