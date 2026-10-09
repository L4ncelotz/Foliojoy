# Transaction Ledger Design — Foundation Before P&L (Phase 2 prep)

Status: **Design / fixtures confirmed** — implementation not started (no P&L or cost-basis engine yet).

## Separation rule (from DECISIONS D-001)
- **Snapshot**: dated observation of holdings/value; does NOT infer trades, purchase dates, or cost basis.
- **Transaction ledger**: dated buys/sells/contributions/withdrawals/fees/dividends/corporate actions; supports reconstructing positions.
- A ledger import must never silently modify or duplicate a snapshot; if both exist, the user reviews conflicts explicitly.

## CSV schema proposal (manual/template)
Columns: `date` (YYYY-MM-DD), `action` (`BUY`/`SELL`/`DIVIDEND`/`FEE`/`DEPOSIT`/`WITHDRAW`), `symbol`, `exchange`, `quantity` (unsigned magnitude: `> 0` for `BUY`/`SELL`, `>= 0` otherwise — direction comes from `action` only, never from the sign; `SELL -5` is invalid), `unit_price`, `currency` (`USD` only for MVP), `fee_amount` (optional, `>= 0` always), `notes` (optional).

## Accounting invariants (to be enforced in code before P&L)
1. Every transaction has a unique `(portfolio_id, date, symbol, action, quantity, unit_price, fee_amount)` key; duplicates rejected.
2. `action` alone determines direction; `quantity` is an unsigned magnitude (`> 0` for `BUY`/`SELL`, `>= 0` for `DIVIDEND`/`FEE`/`DEPOSIT`/`WITHDRAW`, which may not move units). A negative quantity (e.g. `SELL -5`) is invalid.
3. Cash contributions (`DEPOSIT`) and withdrawals (`WITHDRAW`) must reconcile with portfolio total value when combined with holdings snapshots.
4. Unsupported action types (e.g. `SPLIT`, `MERGER`) are rejected with a manual-review message and are not auto-applied. The action enum stays closed at the six listed actions.
5. No cost-basis calculation until the transaction ledger passes reconciliation tests.
6. `fee_amount` is a non-negative magnitude (`>= 0`) for every action.

## Fixture / test outline (no ledger engine yet)
- Fixture file `tests/fixtures/transaction_ledger_sample.csv` (present; locked to this spec by `test_ledger_fixture_convention.py`).
- Integration test: import sample CSV → preview shows `BUY`/`SELL` rows with status `valid`; snapshot total does not change unless user explicitly links ledger to portfolio; duplicate `BUY` on same date/symbol rejected.

## Sample fixture file
`tests/fixtures/transaction_ledger_sample.csv`:
```csv
date,action,symbol,exchange,quantity,unit_price,currency,fee_amount
2026-01-10,BUY,NVDA,NASDAQ,10,130.00,USD,0.00
2026-02-05,SELL,NVDA,NASDAQ,5,140.00,USD,5.00
```

Risk / next step: Do NOT implement P&L or historical returns until this fixture passes end-to-end reconciliation and the ledger snapshot-link review UX is confirmed.
