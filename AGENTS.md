# Contributor and coding-agent instructions

Read `docs/PROJECT_CONTEXT.md`, `docs/DECISIONS.md`, `docs/PRD.md` and `docs/IMPLEMENTATION_STATUS.md` before changing functionality.

The current working feature is a **USD-only holdings-snapshot importer**. Do NOT fabricate trade history, cost basis, quote/FX rates, P&L or historical returns. A snapshot must never write transactions implicitly.

Financial arithmetic stays deterministic in the FastAPI/domain layer (`Decimal`), not in the browser or LLM. Upload/preview inputs are untrusted. Protect all user-owned reads/writes and regression-test cross-tenant isolation.

The current architecture is a recommendation; do not refactor or swap frameworks for style alone. Prefer small tested changes that complete the current phase.

Before coding a new feature, identify whether it is Phase 1, 2, 3, 4 or 5. Do not mark phases complete prematurely.

Run `cd backend && python -m pytest -q`; run `cd frontend && npm install && npm run build` when npm registry access is available.
