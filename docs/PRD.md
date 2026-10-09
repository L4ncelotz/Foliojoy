# Product Requirements Document (Working Draft)

**Product:** AI Portfolio Intelligence Platform  
**Status:** DRAFT / Not approved  
**Goal:** Turn inconsistent portfolio data into trustworthy, understandable analytics with a private investment-thesis-aware AI assistant.

## Target users (hypotheses to validate)

1. Retail investors who manage accounts across multiple brokers and want a consolidated view.
2. Long-term investors who document their theses and rebalance rules.
3. Users who have only broker screenshots or periodic statements, not structured trade exports.

## Principal user journeys

### A. Quick portfolio snapshot

1. User signs in, creates a portfolio and chooses Upload, CSV template or Manual Entry.
2. User uploads broker screenshot/PDF or types/pastes positions.
3. Parser extracts symbols/identifiers, quantities or market values, currency and snapshot date when present.
4. User sees raw evidence, original document, extracted values and explicit missing/uncertain/invalid states.
5. User corrects and confirms data.
6. System persists a **snapshot** and displays eligible visualizations. It must NOT infer transaction history.

**Acceptance:** No invented missing purchase price/date; chart totals equal accepted valuations; quote/FX timestamps are shown; incomplete data limits metrics rather than producing fictional precision.

### B. Historical performance from transactions

1. User uploads transaction history CSV/Excel or enters buys, sells and cash flows.
2. System validates timestamp, symbol/exchange, action, currency, quantity, unit price and applicable fees.
3. User resolves duplicates, splits, reverse splits or other unsupported events before finalizing.
4. Engine reconciles positions and calculates cost basis, realized/unrealized P&L, and eligible return series according to a documented methodology.

**Acceptance:** Computations pass fixture-based tests, no hidden cash flow assumptions, and imported snapshots do not double-count ledger positions.

### C. Portfolio-aware AI question

1. User asks, "Is my portfolio too concentrated?"
2. Backend authenticates and retrieves **only that user's** portfolio and eligible computed metrics.
3. LLM explains the concentration calculation and what it means, describing assumptions and uncertainty.
4. Response includes calculation date, applicable holdings and sources.

**Acceptance:** LLM does not invent prices or holdings; no cross-tenant access; answer explains if data is missing/stale.

### D. Rebalance scenario

1. User defines target allocation, cash availability and assumptions (price, FX, fees, taxes as supported).
2. Deterministic simulator computes proposed target-value differences and hypothetical trades.
3. AI explains trade-offs, rather than claiming an unsupported optimal portfolio.

**Acceptance:** No automated order placement in MVP; totals reconcile; scenario is clearly differentiated from recommendations.

### E. Personal thesis memory

1. User saves dated reason for buying/holding, expected catalysts, risks, invalidation conditions, references.
2. Each edit is versioned and auditable.
3. Retriever selects relevant user-owned versions and verified public evidence.
4. AI highlights consistent/contradictory observations with citations and timestamps.

**Acceptance:** Retrieval respects account ownership; the system distinguishes user opinions, company statements and verified financial metrics; no claim of automatic weight training.

## Functional modules

| Module | MVP (Phase 1) | Later |
| --- | --- | --- |
| Accounts | Secure sign-in / portfolio ownership | Preferences and sharing controls |
| Import | Manual + structured CSV; downloadable templates | PDF/images/OCR/Excel mapping |
| Data review | Typed/validated preview for import | Evidence crops, confidence cues |
| Accounting | Holdings, portfolio value, allocation; define currency handling | Transaction ledger, P&L, income, returns, corporate actions |
| Visualizations | Allocation, holdings table, currency exposure | Sector, concentration, history, drawdown, treemap |
| AI chat | Not required for Phase 1 | Grounded portfolio questions, missing-data explanations |
| Rebalance | Target weight data model optional | Scenario engine with assumptions |
| Thesis | Basic notes optional | Structured versioned thesis and RAG |
| Public operation | Tenant isolation and basic audit logs | Quotas, monitoring, retention and scaling |

## Important edge cases

- Multiple securities with identical tickers on different exchanges; renamed/delisted securities.
- Fractional units, multiple currencies, inconsistent quote or FX timestamps.
- Statements without trade dates/cost basis, or screenshots showing only allocation percentages.
- One position present in both snapshot and transaction-ledger import.
- Multiple snapshots at different dates; users uploading an outdated image.
- Orders, pending settlement, dividends, fees, stock splits, transfers, cash holdings.
- Partial OCR recognition and low-quality cropped screenshots.
- Source document duplicates, upload replay, and modified statements.
- Unauthorized upload/download or retrieval across user accounts.

## UX principles

- Upload/Manual/CSV paths should all be first-class, not manual entry as a hidden fallback.
- Missing, uncertain and invalid are distinct states; allow correction without restarting the flow.
- Keep original evidence visible alongside proposed structured data.
- Clearly label unavailable metrics: do not render 0% P&L when the correct value is unknown.
- AI responses state as-of time and data lineage; actionable calculations have preview/simulation before any persistence.
- Accessibility and usable mobile dashboard layouts are required for public beta.

## Non-goals for initial launch

- Brokerage trade execution.
- An autonomous trading or asset-allocation agent.
- Guaranteed return predictions.
- Silent retraining on users' private portfolios.
- Support for every market or broker on day one.

## Success metrics (to set targets after discovery)

- Import completion and correction rate; number of rows with uncertainty.
- Agreement between validated import totals and dashboard totals.
- Latency/accuracy of OCR and AI requests on actual hardware.
- AI answer grounding/citation accuracy, hallucination reports.
- Percentage of users returning to view/revise their portfolio and thesis.

## Legal and data obligations to assess

Check financial advice classification for target jurisdictions, quote/market-data redistribution licensing, user consent and privacy obligations, statement storage/retention, and secure handling of financial documents. Legal disclaimers alone do not replace necessary compliance decisions.
