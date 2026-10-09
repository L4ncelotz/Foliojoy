# Transaction Ledger Design — Foundation Before P&L (Phase 2 prep)

Status: **Design / fixtures confirmed** — implementation not started (no P&L or cost-basis engine yet).

## Separation rule (from DECISIONS D-001)
- **Snapshot**: dated observation of holdings/value; does NOT infer trades, purchase dates, or cost basis.
- **Transaction ledger**: dated buys/sells/contributions/withdrawals/fees/dividends/corporate actions; supports reconstructing positions.
- A ledger import must never silently modify or duplicate a snapshot; if both exist, the user reviews conflicts explicitly.

## CSV schema proposal (manual/template)
Columns: `date` (YYYY-MM-DD), `action` (`BUY`/`SELL`/`DIVIDEND`/`FEE`/`DEPOSIT`/`WITHDRAW`), `symbol`, `exchange`, `quantity` (positive for BUY, negative for SELL), `unit_price`, `currency` (`USD` only for MVP), `fee_amount` (optional), `notes` (optional).

## Accounting invariants (to be enforced in code before P&L)
1. Every transaction has a unique `(portfolio_id, date, symbol, action, quantity, unit_price, fee_amount)` key; duplicates rejected.
2. `quantity` sign determines direction (`BUY` positive, `SELL` negative).
3. Cash contributions (`DEPOSIT`) and withdrawals (`WITHDRAW`) must reconcile with portfolio total value when combined with holdings snapshots.
4. Corporate actions (`SPLIT`, `MERGER`) require manual review and are not auto-applied.
5. No cost-basis calculation until the transaction ledger passes reconciliation tests.

## Fixture / test outline (not full implementation)
- Fixture file `tests/fixtures/transaction_ledger_sample.csv` (not yet implemented; placeholder file below).
- Integration test: import sample CSV → preview shows `BUY`/`SELL` rows with status `valid`; snapshot total does not change unless user explicitly links ledger to portfolio; duplicate `BUY` on same date/symbol rejected.

## Placeholder fixture file
`tests/fixtures/transaction_ledger_sample.csv` (to be added when Phase 2 starts):
```csv
date,action,symbol,exchange,quantity,unit_price,currency,fee_amount
2026-01-10,BUY,NVDA,NASDAQ,10,130.00,USD,0.00
2026-02-05,SELL,NVDA,NASDAQ,5,140.00,USD,5.00
```

Risk / next step: Do NOT implement P&L or historical returns until this fixture passes end-to-end reconciliation and the ledger snapshot-link review UX is confirmed.
