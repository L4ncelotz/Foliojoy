"""Regression guards for the transaction-ledger design (pre-implementation).

Spec: docs/TRANSACTION_LEDGER_SPEC.md. No ledger engine exists yet; these
tests lock tests/fixtures/transaction_ledger_sample.csv to the spec:

- Identity is (portfolio_id, entry_key): identical content under distinct
  keys is legitimate (repeats allowed); keys are unique per fixture.
- Unsigned quantities (Option A); per-action monetary field matrix with
  uniform amount = quantity x unit_price and signed cash effects.
"""
import csv
from datetime import date
from decimal import Decimal
from pathlib import Path

ACTIONS = {"BUY", "SELL", "DIVIDEND", "FEE", "DEPOSIT", "WITHDRAW"}
INSTRUMENT_ACTIONS = {"BUY", "SELL", "DIVIDEND"}  # must name a real instrument
CASH_ACTIONS = {"FEE", "DEPOSIT", "WITHDRAW"}  # must name no instrument
UNIT_MOVING_ACTIONS = {"BUY", "SELL"}  # require quantity > 0


def _rows():
    path = Path(__file__).parent / "fixtures" / "transaction_ledger_sample.csv"
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def _dec(value):
    return Decimal((value or "0").strip() or "0")


def test_ledger_identity_keys_unique_and_repeats_valid():
    rows = _rows()
    keys = [row["entry_key"].strip() for row in rows]
    assert all(keys), "every fixture row carries an entry_key"
    assert len(set(keys)) == len(keys), "entry_key values are unique"
    # Legitimate identical trades: same content, distinct keys, both valid.
    buys = [row for row in rows if row["action"].strip().upper() == "BUY"]
    contents = [
        (row["date"], row["symbol"], row["exchange"], row["quantity"], row["unit_price"], row["fee_amount"])
        for row in buys
    ]
    duplicates = {c for c in contents if contents.count(c) > 1}
    assert duplicates, "fixture must demonstrate a legitimate content repeat"
    for content in duplicates:
        repeat_keys = {row["entry_key"] for row in buys if (
            row["date"], row["symbol"], row["exchange"], row["quantity"], row["unit_price"], row["fee_amount"]
        ) == content}
        assert len(repeat_keys) > 1, "repeated content must carry distinct entry_keys"


def test_ledger_monetary_fields_by_action():
    rows = _rows()
    seen_actions = set()
    for row in rows:
        action = row["action"].strip().upper()
        assert action in ACTIONS, f"unsupported action {action!r} must be rejected with a manual-review message"
        seen_actions.add(action)
        symbol, exchange = row["symbol"].strip(), row["exchange"].strip()
        quantity, price, fee = _dec(row["quantity"]), _dec(row["unit_price"]), _dec(row["fee_amount"])
        assert quantity >= 0, "quantities are unsigned magnitudes (SELL -5 is invalid)"
        assert fee >= 0, "fee_amount is a non-negative magnitude"
        assert row["currency"].strip().upper() == "USD", "MVP supports USD only"
        date.fromisoformat(row["date"].strip())  # raises on non YYYY-MM-DD
        if action in INSTRUMENT_ACTIONS:
            assert symbol and exchange, f"{action} must name a real instrument"
        else:
            assert not symbol and not exchange, f"{action} is a cash row and names no instrument"
        if action in UNIT_MOVING_ACTIONS:
            assert quantity > 0 and price > 0, f"{action} requires quantity > 0 and unit_price > 0"
        elif action == "DIVIDEND":
            assert quantity * price > 0, "DIVIDEND requires amount (quantity x unit_price) > 0"
        elif action == "FEE":
            assert quantity == 0 and price == 0 and fee > 0, "FEE carries its amount in fee_amount only"
        else:  # DEPOSIT / WITHDRAW: cash amount with unit_price pinned to 1
            assert quantity > 0 and price == 1, f"{action} requires quantity > 0 and unit_price = 1"
    assert {"BUY", "SELL", "DIVIDEND", "FEE", "DEPOSIT"} <= seen_actions, "fixture must cover the monetary matrix"


def test_ledger_cash_effect_signs():
    expected_sign = {"BUY": -1, "SELL": 1, "DIVIDEND": 1, "FEE": -1, "DEPOSIT": 1, "WITHDRAW": -1}
    for row in _rows():
        action = row["action"].strip().upper()
        amount = _dec(row["quantity"]) * _dec(row["unit_price"])
        fee = _dec(row["fee_amount"])
        cash = expected_sign[action] * amount - fee if action != "FEE" else -fee
        if action in ("BUY", "FEE", "WITHDRAW"):
            assert cash < 0, f"{action} must reduce cash"
        else:
            assert cash > 0, f"{action} must increase cash"


def test_sell_direction_comes_from_action_not_sign():
    sells = [row for row in _rows() if row["action"].strip().upper() == "SELL"]
    assert sells, "fixture must cover SELL"
    for row in sells:
        assert Decimal(row["quantity"]) > 0, "SELL rows carry positive magnitudes, never SELL -5"
