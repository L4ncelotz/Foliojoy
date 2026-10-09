# Delivery Roadmap (Proposed)

No phase here is reported as complete. Ordering may change after product discovery and prototype measurements.

## Phase 0 - Feasibility and domain decisions

**Tasks:** Define initial asset markets, provider terms, valuation/currency conventions, cost-basis approach, snapshot vs ledger rules; gather a consented, anonymized fixture collection; benchmark screenshot/PDF extraction and Qwen inference on RTX 2060 SUPER.

**Exit criteria:** Written assumptions; example imports classified by what can and cannot be inferred; explicit market-data license path; realistic latency/cost evidence; risks tracked.

## Phase 1 - Portfolio Foundation (no LLM required)

**Scope:** Auth; portfolios; manual positions/transactions as appropriate to selected accounting scope; two distinct CSV templates; import previews/validation; instrument identification; holdings/valuation engine; dashboard allocation; test fixtures; data ownership controls.

**Exit criteria:** A user can create a portfolio, enter/paste/import structured data, confirm it, and view correct holdings/allocation. No inferred purchase dates; incomplete data produces unavailable states; no cross-tenant data access.

## Phase 2 - Smart Import

**Scope:** Image/PDF/Excel ingestion, document processing, extraction staging, confidence/missing/invalid markers, correction UI, file provenance, duplicate identification, confirmation and idempotency.

**Exit criteria:** Representative broker samples have documented accuracy; users can fix misread rows; no extracted trade record is committed silently; duplicates are handled visibly.

## Phase 3 - Grounded AI Assistant

**Scope:** Private AI worker, queue/quota/timeout, grounding tools for portfolio metrics, evidence-aware chat, numerical guardrails and rebalance scenario calculator.

**Exit criteria:** Grounded answer-evaluation suite passes agreed threshold; no invented holdings or prices; deterministic numbers agree with dashboard; GPU outage gracefully handled.

## Phase 4 - Thesis Memory and Research

**Scope:** Structured thesis records, version history, per-user RAG, embeddings, related evidence, thesis-change comparison, user feedback.

**Exit criteria:** Citations point to owned/source content, correct versions and dates; retrieval is tenant-isolated; feedback supports revision; no autonomous fine-tuning on private data.

## Phase 5 - Public Beta, Compliance and Reliability

**Scope:** Privacy controls, upload and inference abuse prevention, data retention/export/deletion, security audit, monitoring, queues, load/soak tests, cost controls, licensed data, accessibility, user feedback.

**Exit criteria:** Tested against realistic user load and failure modes; operational runbooks exist; launch scope and obligations reviewed; queue wait and uptime expectations communicated.

## Recommended initial backlog

1. Write accounting invariants and prepare verified portfolio fixtures.
2. Decide the initial market and pricing/FX data source with public redistribution rights.
3. Design distinct snapshot and transaction CSV schemas; make manual correction UX.
4. Build deterministic portfolio engine and API before LLM features.
5. Create interactive holdings/asset allocation dashboard.
6. Benchmark OCR and small vision model on actual target documents.
7. Add queued AI analysis only after the underlying metrics are trusted.

## Hold the line against scope creep

- Do not add broker trading integration in the first release.
- Do not attempt every security or every jurisdiction before validating an initial segment.
- Do not confuse a good-looking dashboard with validated performance metrics.
- Do not allow AI "memory" to be misrepresented as model retraining or continual self-improvement.
