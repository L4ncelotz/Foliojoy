"""Regression guards for the transaction-ledger design (pre-implementation).

Spec: docs/TRANSACTION_LEDGER_SPEC.md. No ledger engine exists yet; these
tests lock tests/fixtures/transaction_ledger_sample.csv to the spec:

- Identity is (portfolio_id, entry_key): identical content under distinct
  keys is legitimate (repeats allowed); keys are unique per fixture. No
  content hashing is used for identity anywhere.
- Unsigned trade fields; explicit cash_amount for DIVIDEND/DEPOSIT/
  WITHDRAW (never artificial quantity x unit_price money); fee_amount >= 0.
- UTC date policy: no future-dated completed transactions.
"""
import csv
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

ACTIONS = {"BUY", "SELL", "DIVIDEND", "FEE", "DEPOSIT", "WITHDRAW"}
INSTRUMENT_ACTIONS = {"BUY", "SELL", "DIVIDEND"}  # must name a real instrument
CASH_ACTIONS = {"FEE", "DEPOSIT", "WITHDRAW"}  # must name no instrument
TRADE_ACTIONS = {"BUY", "SELL"}  # principal = quantity x unit_price
CENT = Decimal("0.01")


def _rows():
    path = Path(__file__).parent / "fixtures" / "transaction_ledger_sample.csv"
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def _dec(value):
    return Decimal((value or "0").strip() or "0")


def test_ledger_identity_keys_unique_and_repeats_valid():
    rows = _rows()
    keys = [row["entry_key"].strip() for row in rows]
    assert all(keys), "every fixture row carries an entry_key (commit requires keys)"
    assert len(set(keys)) == len(keys), "entry_key values are unique"
    # Legitimate identical trades: same content, distinct keys, both valid.
    buys = [row for row in rows if row["action"].strip().upper() == "BUY"]
    contents = [
        (row["date"], row["symbol"], row["exchange"], row["quantity"], row["unit_price"],
         row["cash_amount"], row["fee_amount"])
        for row in buys
    ]
    duplicates = {c for c in contents if contents.count(c) > 1}
    assert duplicates, "fixture must demonstrate a legitimate content repeat"
    for content in duplicates:
        repeat_keys = {
            row["entry_key"] for row in buys
            if (row["date"], row["symbol"], row["exchange"], row["quantity"], row["unit_price"],
                row["cash_amount"], row["fee_amount"]) == content
        }
        assert len(repeat_keys) > 1, "repeated content must carry distinct entry_keys"


def test_ledger_monetary_fields_by_action():
    rows = _rows()
    seen_actions = set()
    for row in rows:
        action = row["action"].strip().upper()
        assert action in ACTIONS, f"unsupported action {action!r} must be rejected with a manual-review message"
        seen_actions.add(action)
        symbol, exchange = row["symbol"].strip(), row["exchange"].strip()
        quantity, price, cash, fee = _dec(row["quantity"]), _dec(row["unit_price"]), _dec(row["cash_amount"]), _dec(row["fee_amount"])
        assert quantity >= 0 and price >= 0, "trade fields are unsigned (SELL -5 is invalid)"
        assert cash >= 0 and fee >= 0, "cash_amount and fee_amount are non-negative magnitudes"
        assert row["currency"].strip().upper() == "USD", "MVP supports USD only"
        row_date = date.fromisoformat(row["date"].strip())  # raises on non YYYY-MM-DD
        assert row_date <= datetime.now(timezone.utc).date(), "future-dated completed transactions are rejected (UTC calendar day)"
        if action in INSTRUMENT_ACTIONS:
            assert symbol and exchange, f"{action} must name a real instrument"
        else:
            assert not symbol and not exchange, f"{action} is a cash row and names no instrument"
        if action in TRADE_ACTIONS:
            assert quantity > 0 and price > 0, f"{action} requires quantity > 0 and unit_price > 0"
            assert cash == 0, f"{action} carries no cash_amount (principal is quantity x unit_price)"
        elif action == "DIVIDEND":
            assert cash > 0, "DIVIDEND requires cash_amount > 0 (the payout)"
            if quantity > 0 and price > 0:
                assert abs(quantity * price - cash) <= CENT, "declared per-share encoding must reconcile with cash_amount"
        elif action == "FEE":
            assert quantity == 0 and price == 0 and cash == 0 and fee > 0, "FEE carries its amount in fee_amount only"
        else:  # DEPOSIT / WITHDRAW: explicit cash, no artificial unit price
            assert quantity == 0 and price == 0 and cash > 0, f"{action} carries its USD amount in cash_amount only"
    assert {"BUY", "SELL", "DIVIDEND", "FEE", "DEPOSIT"} <= seen_actions, "fixture must cover the monetary matrix"


def test_ledger_cash_effect_signs():
    for row in _rows():
        action = row["action"].strip().upper()
        principal = _dec(row["quantity"]) * _dec(row["unit_price"])
        cash, fee = _dec(row["cash_amount"]), _dec(row["fee_amount"])
        if action == "BUY":
            effect = -principal - fee
        elif action == "SELL":
            effect = principal - fee
        elif action == "DIVIDEND":
            effect = cash - fee
        elif action == "FEE":
            effect = -fee
        elif action == "DEPOSIT":
            effect = cash - fee
        else:  # WITHDRAW
            effect = -cash - fee
        if action in ("BUY", "FEE", "WITHDRAW"):
            assert effect < 0, f"{action} must reduce cash"
        else:
            assert effect > 0, f"{action} must increase cash"


def test_sell_direction_comes_from_action_not_sign():
    sells = [row for row in _rows() if row["action"].strip().upper() == "SELL"]
    assert sells, "fixture must cover SELL"
    for row in sells:
        assert Decimal(row["quantity"]) > 0, "SELL rows carry positive quantities, never SELL -5"
