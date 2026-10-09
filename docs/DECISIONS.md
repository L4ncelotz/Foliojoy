# Decisions and Open Questions

**Convention:** `CONFIRMED` = expressed product requirement; `PROPOSED` = engineering recommendation, not approved as immutable; `OPEN` = needs product owner or research decision.

| ID | Status | Decision / current position | Rationale / implication |
| --- | --- | --- | --- |
| P-001 | CONFIRMED | Build a public multi-user portfolio visualization and AI research app. | Real end users, not a solo local demo. |
| P-002 | CONFIRMED | Accept images/screenshots, PDFs, CSV/Excel and direct manual entry. | Input quality and access vary by user. |
| P-003 | CONFIRMED | Offer downloadable CSV templates and website-based manual editing. | Recovery path when automated extraction is incomplete. |
| P-004 | CONFIRMED | Report missing/uncertain values and require review before saving extracted data. | Cannot guess quantities, dates or prices. |
| P-005 | CONFIRMED | Include interactive visualization and AI conversation about portfolio and rebalance scenarios. | Core user experience. |
| P-006 | CONFIRMED | Support per-user investment theses as retrievable AI context. | Personal analytical continuity over time. |
| P-007 | CONFIRMED | Choose technology by product fit, not previous stack familiarity. | Compare Go, Rust, Elysia, FastAPI and alternatives fairly. |
| D-001 | PROPOSED | Separate holdings snapshots from a transaction ledger. | Avoid false history, P&L and double counting. |
| D-002 | PROPOSED | Use deterministic financial calculations with Decimal; no LLM arithmetic as source of truth. | Testability and accounting accuracy. |
| D-003 | PROPOSED | React/TypeScript/Vite + Apache ECharts + TanStack Table/Query. | Interactive client-heavy dashboard. |
| D-004 | PROPOSED | FastAPI + Python workers, PostgreSQL, SQLAlchemy/Alembic. | Shared Python ecosystem for docs/analytics/inference. |
| D-005 | PROPOSED | pgvector + an embedding model for user thesis retrieval. | Keep relational and vector data under a single access-control model. |
| D-006 | PROPOSED | Private Ollama GPU worker with an authenticated job queue; cloud API/database/web. | Do not expose Ollama; web keeps working during GPU outage. |
| D-007 | PROPOSED | Start without LLM fine-tuning; add versioned thesis records + retrieval + feedback. | Avoid unreviewed self-training and data leakage. |
| D-008 | PROPOSED | Phase development: Core, Smart Import, AI Assistant, Thesis Memory, Public Beta. | Establish correctness before inference complexity. |
| D-009 | PROPOSED | Image path: OCR/document parsing plus an optional small vision model. | Text-only Qwen3 8B cannot directly read screenshots. |
| O-001 | OPEN | Initial supported securities and exchanges. | US stocks/ETFs first or broader coverage? |
| O-002 | OPEN | Market-price, FX and fundamentals data vendor, refresh rate, redistribution rights. | Avoid unlicensed data display. |
| O-003 | OPEN | Cost-basis method, transaction accounting, fractional shares, fees, taxes and corporate actions. | Impacts every P&L claim. |
| O-004 | OPEN | What qualifies as performance history, and which methodology to show (TWR/MWR). | Prevent misleading return charts. |
| O-005 | OPEN | Risk analytics and scope of individualized rebalance guidance in relevant jurisdictions. | Compliance and responsible UX. |
| O-006 | OPEN | Hosting budget, anticipated concurrency, expected response times, outage SLA. | Determines whether local GPU is viable for production. |
| O-007 | OPEN | Exact AI and OCR model choices after a real accuracy/latency benchmark. | Theoretical model fit is not a test result. |
| O-008 | OPEN | Authentication provider, encrypted storage details, deletion and retention periods. | Multi-tenant user trust. |
| O-009 | OPEN | Supported upload size/formats and abuse controls. | Upload security/cost. |
| O-010 | OPEN | Whether the product will be free, monetized, or invite-only at launch. | Impacts licensing, security and quotas. |

## Backend comparison from the discussion

| Option | Strength | Cost/trade-off | Position |
| --- | --- | --- | --- |
| FastAPI + Python | Strongest integration with document/OCR/financial analytics and AI libraries; typed validation/OpenAPI | CPU-heavy jobs must run in workers; Python runtime overhead | Proposed primary architecture |
| Go + Chi | Efficient service, concurrency, compact deployment | Likely still need Python for specialist document/finance processing; multi-language contract | Good alternative when API performance/ops dictate |
| Elysia + Bun | TypeScript end-to-end DX and fast API routes | Python worker still likely needed, operational complexity of two runtimes | Good TS-first alternative |
| Rust + Axum | High performance, strong static guarantees | Higher development complexity; unlikely to be the bottleneck before OCR/GPU | Not chosen for first MVP |
| NestJS/Fastify | Mature modular server architecture | More components and still needs financial/AI execution strategy | Valid alternative, not selected |

**Important:** No production benchmark was run for these options; conclusions are fit-based, not measured throughput rankings.

## How to record new decisions

Add an ID, date, status, options considered, rationale, owner confirmation, and links to affected docs. Do not silently convert a proposal into a confirmed requirement.

---

**Added 2026-10-09:**
- D-010 (CONFIRMED): Transaction ledger kept separate from snapshot (`docs/TRANSACTION_LEDGER_SPEC.md`); fixtures added but no P&L engine until reconciliation tests pass.
- D-011 (CONFIRMED): CI upgraded (`actions/setup-python@v5`, Python 3.12; `actions/setup-node@v4`, `node-version: 22`; PostgreSQL service added).
- D-012 (CONFIRMED 2026-10-09, owner decisions): Ledger identity is `(portfolio_id, entry_key)` with commit-required keys (no content-hash identity; keyless imports get preview-proposed UUIDs requiring explicit confirmation; replays distinguished by key equality). Unsigned trade fields with explicit `cash_amount` for `DIVIDEND`/`DEPOSIT`/`WITHDRAW` (DIVIDEND per-share encodings must reconcile to `cash_amount`). UTC calendar-day dates, future-dated rejections. Negative cash allowed as informational with explicit warning, never adjusted. Same-key conflicts error without overwrite; batch commits atomic with full rollback. See `docs/TRANSACTION_LEDGER_SPEC.md`.
