# Transaction Ledger Design — Foundation Before P&L (Phase 2 prep)

Status: **Design / fixtures confirmed** — implementation not started (no P&L or cost-basis engine yet).

## Separation rule (from DECISIONS D-001)
- **Snapshot**: dated observation of holdings/value; does NOT infer trades, purchase dates, or cost basis.
- **Transaction ledger**: dated buys/sells/contributions/withdrawals/fees/dividends/corporate actions; supports reconstructing positions.
- A ledger import must never silently modify or duplicate a snapshot; if both exist, the user reviews conflicts explicitly.

## CSV schema proposal (manual/template)
Columns: `date` (YYYY-MM-DD), `action` (`BUY`/`SELL`/`DIVIDEND`/`FEE`/`DEPOSIT`/`WITHDRAW`), `symbol`, `exchange`, `quantity` (unsigned magnitude: `> 0` for `BUY`/`SELL`, `>= 0` otherwise — direction comes from `action` only, never from the sign; `SELL -5` is invalid), `unit_price`, `currency` (`USD` only for MVP), `fee_amount` (optional, `>= 0` always), `entry_key` (optional idempotency key, see below), `notes` (optional).

## Accounting invariants (to be enforced in code before P&L)
1. Identity is `(portfolio_id, entry_key)` (see below), not content. Content-identical rows with distinct keys are distinct valid entries; re-upload with identical keys is an idempotent no-op.
2. `action` alone determines direction; `quantity` is an unsigned magnitude (`> 0` for `BUY`/`SELL`, `>= 0` for `DIVIDEND`/`FEE`/`DEPOSIT`/`WITHDRAW`, which may not move units). A negative quantity (e.g. `SELL -5`) is invalid.
3. Cash contributions (`DEPOSIT`) and withdrawals (`WITHDRAW`) must reconcile with portfolio total value when combined with holdings snapshots.
4. Unsupported action types (e.g. `SPLIT`, `MERGER`) are rejected with a manual-review message and are not auto-applied. The action enum stays closed at the six listed actions.
5. No cost-basis calculation until the transaction ledger passes reconciliation tests.
6. `fee_amount` is a non-negative magnitude (`>= 0`) for every action.

## Transaction identity and idempotency

Content alone cannot identify a transaction: two separate fills can share
date, symbol, action, quantity, price, and fee legitimately (e.g. repeated
DCA buys). Identity is therefore `(portfolio_id, entry_key)`:

- `entry_key` is a client-supplied idempotency key per row (UUID or stable
  brokerage reference). Stored verbatim; unique per portfolio.
- Same content + distinct keys → distinct valid entries (repeats allowed).
- Same key + different content → conflict error. Keys are never silently
  reused or overwritten; the user resolves the conflict explicitly.
- Re-uploading a file with identical keys is an idempotent no-op
  (rows reported as already recorded, nothing duplicated).
- Corrections are reversing entries with new keys, never edits or deletes,
  so the audit trail stays append-only.
- `entry_key` column absent → importer falls back to a content hash and
  marks every row for explicit user confirmation before commit (per
  DECISIONS P-004). Deterministic when keys are present, human-reviewed
  when they are not.

## Monetary fields by action

`amount = quantity × unit_price` uniformly (`Decimal`). `fee_amount` always
reduces cash. Signs below are the cash effect on the portfolio:

| action | symbol / exchange | quantity | unit_price | fee_amount | cash effect | units effect |
| --- | --- | --- | --- | --- | --- | --- |
| `BUY` | required, real instrument | `> 0` | `> 0` | `>= 0` | `−amount − fee` | `+quantity` |
| `SELL` | required, real instrument | `> 0` | `> 0` | `>= 0` | `+amount − fee` | `−quantity` |
| `DIVIDEND` | required, paying instrument | `>= 0` | `>= 0`, with `amount > 0` | `>= 0` | `+amount − fee` | unchanged |
| `FEE` | must both be empty (no instrument) | must be `0`/empty | must be `0`/empty | `> 0` | `−fee` | unchanged |
| `DEPOSIT` | must both be empty (cash, no instrument) | `> 0` (USD amount) | must be `1` (keeps `amount = quantity`) | `>= 0` | `+amount − fee` | n/a (cash) |
| `WITHDRAW` | must both be empty (cash, no instrument) | `> 0` (USD amount) | must be `1` | `>= 0` | `−amount − fee` | n/a (cash) |

`DIVIDEND` amount may be encoded either per-share (`quantity` = shares on
record, `unit_price` = per-share payout) or as a total (`quantity` = 1,
`unit_price` = total payout). Either encoding is valid as long as
`amount > 0`; the encoding is stored, not normalized away.

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

## Fixture / test outline (no ledger engine yet)
- Fixture file `tests/fixtures/transaction_ledger_sample.csv` (present; locked to this spec by `test_ledger_fixture_convention.py`).
- Import sample CSV → preview shows each row with status `valid`; identical `BUY` content under distinct `entry_key` values yields distinct valid entries; re-upload with identical keys is idempotent; snapshot total does not change unless user explicitly links ledger to portfolio.

## Sample fixture file
`tests/fixtures/transaction_ledger_sample.csv`:
```csv
date,action,symbol,exchange,quantity,unit_price,currency,fee_amount,entry_key
2026-01-10,BUY,NVDA,NASDAQ,10,130.00,USD,0.00,buy-nvda-001
2026-01-10,BUY,NVDA,NASDAQ,10,130.00,USD,0.00,buy-nvda-002
2026-02-05,SELL,NVDA,NASDAQ,5,140.00,USD,5.00,sell-nvda-001
2026-03-01,DIVIDEND,NVDA,NASDAQ,15,2.00,USD,0.00,div-nvda-001
2026-03-05,FEE,,,,,USD,9.95,fee-001
2026-03-10,DEPOSIT,,,5000,1.00,USD,0.00,dep-001
```

Risk / next step: Do NOT implement P&L or historical returns until this fixture passes end-to-end reconciliation and the ledger snapshot-link review UX is confirmed.
