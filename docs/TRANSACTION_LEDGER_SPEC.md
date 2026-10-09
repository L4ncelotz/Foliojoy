# Transaction Ledger Design — Foundation Before P&L (Phase 2 prep)

Status: **Design / fixtures confirmed** — implementation not started (no P&L or cost-basis engine yet).

## Separation rule (from DECISIONS D-001)
- **Snapshot**: dated observation of holdings/value; does NOT infer trades, purchase dates, or cost basis.
- **Transaction ledger**: dated buys/sells/contributions/withdrawals/fees/dividends/corporate actions; supports reconstructing positions.
- A ledger import must never silently modify or duplicate a snapshot; if both exist, the user reviews conflicts explicitly.

## CSV schema proposal (manual/template)
Columns: `date` (YYYY-MM-DD, completion date, never in the future — see date policy), `action` (`BUY`/`SELL`/`DIVIDEND`/`FEE`/`DEPOSIT`/`WITHDRAW`), `symbol`, `exchange`, `quantity` (unsigned units, semantically accurate — see monetary table), `unit_price` (per-unit price, semantically accurate), `cash_amount` (explicit money for `DIVIDEND`/`DEPOSIT`/`WITHDRAW`; must be empty/zero for `BUY`/`SELL`/`FEE`), `currency` (`USD` only for MVP), `fee_amount` (optional, `>= 0` always), `entry_key` (idempotency key — required at commit, see below), `notes` (optional).

## Accounting invariants (to be enforced in code before P&L)
1. Identity is `(portfolio_id, entry_key)` (see below), not content. Content-identical rows with distinct keys are distinct valid entries; re-upload with identical keys is an idempotent no-op.
2. `action` alone determines direction; `quantity`/`unit_price` are unsigned trade fields (`> 0` for `BUY`/`SELL`; `DIVIDEND` may carry shares/per-share values or zeros). A negative quantity or price (e.g. `SELL -5`) is invalid. Cash movement is expressed only through `cash_amount` and `fee_amount`, never through signs.
3. Cash contributions (`DEPOSIT`) and withdrawals (`WITHDRAW`) must reconcile with portfolio total value when combined with holdings snapshots.
4. Unsupported action types (e.g. `SPLIT`, `MERGER`) are rejected with a manual-review message and are not auto-applied. The action enum stays closed at the six listed actions.
5. No cost-basis calculation until the transaction ledger passes reconciliation tests.
6. `fee_amount` is a non-negative magnitude (`>= 0`) for every action.
7. Transaction dates are completion dates on the UTC calendar day. A date after today (UTC) is rejected. Boundary: today (UTC) is accepted, tomorrow (UTC) is not. Exchange-local settlement-day nuances are deferred as a documented MVP simplification.
8. Withdrawals may exceed the recorded cash balance. Negative cash is informational: it is stored as computed, surfaced with an explicit warning, and never silently adjusted, clamped, or blocked.

## Transaction identity and idempotency

Content alone cannot identify a transaction: two separate fills can share
date, symbol, action, quantity, price, and fee legitimately (e.g. repeated
DCA buys). Row-content hashing is therefore **never** used for identity —
neither alone nor as a fallback — because it cannot distinguish a replay
from an intentionally new identical trade. Identity is
`(portfolio_id, entry_key)`:

- `entry_key` is a client-supplied idempotency key per row (UUID or stable
  brokerage reference). Stored verbatim; unique per portfolio.
- A commit requires `entry_key` on **every** row. There is no keyless
  commit path.
- **Keyless imports (explicit handling):** preview accepts rows without
  keys and proposes a UUID per row, flagged `key_proposed: true`. Proposed
  keys commit only after explicit user confirmation (per row or whole
  batch). A re-uploaded file that goes through preview again receives
  *fresh* proposed keys and is therefore treated as a **new** batch, with
  an explicit warning that it will not link to the prior import. Replays
  and new transactions are distinguished solely by key equality — same
  keys mean replay, anything else means new.
- Same content + distinct keys → distinct valid entries (repeats allowed).
- Same key + different content → conflict error. Keys are never silently
  reused or overwritten; the user resolves the conflict explicitly.
- Re-uploading with identical keys is an idempotent no-op (rows reported
  as already recorded, nothing duplicated).
- Batch commits are atomic: any conflict aborts the **entire** batch with
  a clear error identifying the conflicting keys, the transaction rolls
  back fully, and no rolled-back row is ever reported as recorded. A batch
  commits only when every row is newly recorded or already recorded.
- Corrections are reversing entries with new keys, never edits or deletes,
  so the audit trail stays append-only.

## Monetary fields by action

Trade quantities and prices stay semantically accurate: `quantity` is units,
`unit_price` is per-unit price. Money that is not a trade principal —
cash movements and dividend payouts — uses explicit `cash_amount`, never an
artificial `quantity × unit_price`. `fee_amount` always reduces cash.
Principal for trades is `quantity × unit_price` (`Decimal`); signs below
are the cash effect on the portfolio:

| action | symbol / exchange | quantity | unit_price | cash_amount | fee_amount | cash effect | units effect |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `BUY` | required, real instrument | `> 0` | `> 0` | must be empty/zero | `>= 0` | `−principal − fee` | `+quantity` |
| `SELL` | required, real instrument | `> 0` | `> 0` | must be empty/zero | `>= 0` | `+principal − fee` | `−quantity` |
| `DIVIDEND` | required, paying instrument | `>= 0` | `>= 0` | `> 0` (the payout) | `>= 0` | `+cash_amount − fee` | unchanged |
| `FEE` | must both be empty (no instrument) | must be `0`/empty | must be `0`/empty | must be empty/zero | `> 0` | `−fee` | unchanged |
| `DEPOSIT` | must both be empty (cash, no instrument) | must be `0`/empty | must be `0`/empty | `> 0` (USD amount) | `>= 0` | `+cash_amount − fee` | n/a (cash) |
| `WITHDRAW` | must both be empty (cash, no instrument) | must be `0`/empty | must be `0`/empty | `> 0` (USD amount) | `>= 0` | `−cash_amount − fee` | n/a (cash) |

`DIVIDEND` cross-check (same cent tolerance as snapshot reconciliation):
when `quantity > 0` and `unit_price > 0`, `cash_amount` must equal
`quantity × unit_price` (per-share encoding, e.g. 15 shares × $2.00 =
$30.00). When either is zero/empty, `cash_amount` stands alone as the
total payout. The encoding is stored, not normalized away.

Cash rows carry no `symbol`/`exchange` so no fake instrument enters the
namespace; instrument rows always name a real one. `currency` is `USD` on
every row for MVP.

## Cash accounting and reconciliation

- Cash balance starts at `0` per portfolio. Each entry applies its signed
  cash effect from the table above; fees always reduce cash.
- The ledger is append-only and never writes snapshots; snapshots never
  write the ledger (separation rule above).
- When both exist for a portfolio, reconciliation compares ledger-implied
  units per instrument against the latest snapshot quantities and lists
  mismatches for explicit user review. No auto-adjustment in either
  direction (future behavior — no engine in this change).
- Cash balance and ledger-derived positions are informational until the
  reconciliation tests pass; no cost basis, P&L, or returns are computed
  from them.

## Migration plan (for the backend milestone)

Planned `transactions` table (Alembic revision after `0001`; empty table,
no backfill — no ledger data exists yet):

- `id` PK; `portfolio_id` FK → `portfolios.id`, `ON DELETE CASCADE`.
- `entry_key` `TEXT NOT NULL`; `UNIQUE(portfolio_id, entry_key)`.
- `date` `DATE NOT NULL`; `action` `TEXT NOT NULL` (enum enforced in app layer).
- `symbol` / `exchange` `TEXT NULL` (required-or-empty per action, app layer).
- `quantity` / `unit_price` `Numeric(24, 8) NOT NULL DEFAULT 0`, `CHECK >= 0`.
- `cash_amount` / `fee_amount` `Numeric(24, 2) NOT NULL DEFAULT 0`, `CHECK >= 0`.
- `currency` `CHAR(3) NOT NULL DEFAULT 'USD'`; `notes` `TEXT NULL`.
- `created_at` timestamp `NOT NULL`.
- Per-action field rules and cross-checks live in the app layer, not DDL.

## Fixture / test outline (no ledger engine yet)
- Fixture file `tests/fixtures/transaction_ledger_sample.csv` (present; locked to this spec by `test_ledger_fixture_convention.py`).
- Import sample CSV → preview shows each row with status `valid`; identical `BUY` content under distinct `entry_key` values yields distinct valid entries; re-upload with identical keys is idempotent; snapshot total does not change unless user explicitly links ledger to portfolio.

## Sample fixture file
`tests/fixtures/transaction_ledger_sample.csv`:
```csv
date,action,symbol,exchange,quantity,unit_price,cash_amount,currency,fee_amount,entry_key,notes
2026-01-10,BUY,NVDA,NASDAQ,10,130.00,,USD,0.00,buy-nvda-001,
2026-01-10,BUY,NVDA,NASDAQ,10,130.00,,USD,0.00,buy-nvda-002,
2026-02-05,SELL,NVDA,NASDAQ,5,140.00,,USD,5.00,sell-nvda-001,
2026-03-01,DIVIDEND,NVDA,NASDAQ,15,2.00,30.00,USD,0.00,div-nvda-001,
2026-03-05,FEE,,,,,,USD,9.95,fee-001,
2026-03-10,DEPOSIT,,,,,5000.00,USD,0.00,dep-001,
```

Risk / next step: Do NOT implement P&L or historical returns until this fixture passes end-to-end reconciliation and the ledger snapshot-link review UX is confirmed.
