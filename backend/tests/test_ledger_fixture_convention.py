"""Regression guard for the unsigned-quantity ledger convention (Option A).

Spec: docs/TRANSACTION_LEDGER_SPEC.md. No ledger engine exists yet; this test
locks tests/fixtures/transaction_ledger_sample.csv to the spec so the
BUY-positive / SELL-negative vs SELL-positive mismatch cannot recur.

Convention: quantity is an unsigned magnitude (> 0 for BUY/SELL, >= 0
otherwise); action alone determines direction; fee_amount >= 0 always.
"""
import csv
from datetime import date
from decimal import Decimal
from pathlib import Path

ACTIONS = {"BUY", "SELL", "DIVIDEND", "FEE", "DEPOSIT", "WITHDRAW"}
# Actions that move units and therefore require quantity > 0. The rest
# (e.g. a cash DIVIDEND) may not move units, so quantity >= 0 suffices.
UNIT_MOVING_ACTIONS = {"BUY", "SELL"}


def _rows():
    path = Path(__file__).parent / "fixtures" / "transaction_ledger_sample.csv"
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def test_ledger_fixture_unsigned_quantity_convention():
    rows = _rows()
    assert len(rows) >= 2, "fixture must cover at least BUY and SELL"
    seen = set()
    for row in rows:
        action = row["action"].strip().upper()
        assert action in ACTIONS, f"unsupported action {action!r} must be rejected with a manual-review message"
        quantity = Decimal(row["quantity"])
        fee = Decimal(row["fee_amount"] or "0")
        assert quantity >= 0, "quantities are unsigned magnitudes (SELL -5 is invalid)"
        assert fee >= 0, "fee_amount is a non-negative magnitude"
        if action in UNIT_MOVING_ACTIONS:
            assert quantity > 0, f"{action} requires quantity > 0"
            assert Decimal(row["unit_price"]) > 0, f"{action} requires unit_price > 0"
        assert row["currency"].strip().upper() == "USD", "MVP supports USD only"
        date.fromisoformat(row["date"].strip())  # raises on non YYYY-MM-DD
        key = (row["date"], action, row["symbol"], row["exchange"], str(quantity), row["unit_price"], str(fee))
        assert key not in seen, "duplicate transaction in fixture"
        seen.add(key)


def test_sell_direction_comes_from_action_not_sign():
    sells = [row for row in _rows() if row["action"].strip().upper() == "SELL"]
    assert sells, "fixture must cover SELL"
    for row in sells:
        assert Decimal(row["quantity"]) > 0, "SELL rows carry positive magnitudes, never SELL -5"
