"""Transaction ledger validation; deterministic Decimal rules, no P&L.

Implements docs/TRANSACTION_LEDGER_SPEC.md field rules. Identity is
(portfolio_id, entry_key): content hashing is never used for identity.
"""
import csv
import io
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import BaseModel, Field, model_validator

from .imports import CENT, EXCHANGE_RE, MAX_CSV_BYTES, MAX_ROWS, SYMBOL_RE

ACTIONS = ("BUY", "SELL", "DIVIDEND", "FEE", "DEPOSIT", "WITHDRAW")
INSTRUMENT_ACTIONS = ("BUY", "SELL", "DIVIDEND")
CASH_ACTIONS = ("FEE", "DEPOSIT", "WITHDRAW")
TRADE_ACTIONS = ("BUY", "SELL")
LEDGER_FIELDS = ("date", "action", "symbol", "exchange", "quantity", "unit_price",
                 "cash_amount", "currency", "fee_amount", "entry_key", "notes")
MAX_NOTES = 500


class LedgerRow(BaseModel):
    date: str = Field(default="", max_length=32)
    action: str = Field(default="", max_length=16)
    symbol: str = Field(default="", max_length=64)
    exchange: str = Field(default="", max_length=64)
    quantity: str = Field(default="", max_length=80)
    unit_price: str = Field(default="", max_length=80)
    cash_amount: str = Field(default="", max_length=80)
    currency: str = Field(default="USD", max_length=12)
    fee_amount: str = Field(default="", max_length=80)
    entry_key: str = Field(default="", max_length=80)
    notes: str = Field(default="", max_length=600)

    @model_validator(mode="before")
    @classmethod
    def stringify(cls, value: Any):
        if isinstance(value, dict):
            return {key: "" if val is None else str(val) for key, val in value.items()}
        return value


class LedgerPreviewRequest(BaseModel):
    rows: list[LedgerRow] | None = None
    csv_text: str | None = None

    @model_validator(mode="after")
    def exactly_one_source(self):
        if (self.rows is None) == (self.csv_text is None):
            raise ValueError("Provide rows or csv_text, but not both")
        return self


class LedgerCommitRequest(BaseModel):
    rows: list[LedgerRow] = Field(min_length=1, max_length=MAX_ROWS)


def parse_ledger_csv(content: str) -> list[LedgerRow]:
    if len(content.encode("utf-8")) > MAX_CSV_BYTES:
        raise ValueError("CSV exceeds 256 KB")
    try:
        reader = csv.DictReader(io.StringIO(content, newline=""), strict=True)
        if not reader.fieldnames:
            raise ValueError("CSV is empty")
        headers = [h.strip().lstrip("\ufeff").lower() for h in reader.fieldnames]
        if len(headers) != len(set(headers)):
            raise ValueError("Duplicate CSV header")
        missing = {"date", "action", "currency"} - set(headers)
        if missing:
            raise ValueError("Missing columns: " + ", ".join(sorted(missing)))
        if set(headers) - set(LEDGER_FIELDS):
            raise ValueError("Unknown columns: " + ", ".join(sorted(set(headers) - set(LEDGER_FIELDS))))
        rows = []
        for raw in reader:
            if len(rows) >= MAX_ROWS:
                raise ValueError("Maximum 200 transactions per import")
            if None in raw:
                raise ValueError("CSV row has too many columns")
            rows.append(LedgerRow(**{headers[i]: raw.get(reader.fieldnames[i], "") for i in range(len(headers))}))
        return rows
    except csv.Error as exc:
        raise ValueError("Malformed CSV: " + str(exc)) from exc


def decimal_amount(raw: str, field: str, errors: list[str], *, allow_zero: bool, max_places: int) -> Decimal:
    value = raw.strip()
    if not value:
        return Decimal("0")
    try:
        number = Decimal(value)
    except InvalidOperation:
        errors.append(f"{field} must be numeric")
        return Decimal("0")
    if not number.is_finite() or (number < 0 if allow_zero else number <= 0):
        errors.append(f"{field} must be a {'non-negative' if allow_zero else 'positive'} finite number")
        return Decimal("0")
    if number.adjusted() > 13 or -number.as_tuple().exponent > 8:
        errors.append(f"{field} is out of supported precision")
        return Decimal("0")
    if number != number.quantize(Decimal(1).scaleb(-max_places)):
        errors.append(f"{field} supports at most {max_places} decimal places")
        return Decimal("0")
    return number


def cash_effect(action: str, quantity: Decimal, unit_price: Decimal, cash_amount: Decimal, fee: Decimal) -> Decimal:
    if action == "BUY":
        return -(quantity * unit_price) - fee
    if action == "SELL":
        return quantity * unit_price - fee
    if action in ("DIVIDEND", "DEPOSIT"):
        return cash_amount - fee
    return -cash_amount - fee if action == "WITHDRAW" else -fee


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def normalize_ledger(rows: list[LedgerRow], *, propose_keys: bool, today: date | None = None):
    if not 1 <= len(rows) <= MAX_ROWS:
        raise ValueError("Import must contain 1 to 200 rows")
    today = today or _utc_today()
    normalized = []
    seen_keys: set[str] = set()
    for index, entry in enumerate(rows, 1):
        raw = entry.model_dump()
        action = raw["action"].strip().upper()
        currency = raw["currency"].strip().upper()
        errors: list[str] = []
        if action not in ACTIONS:
            errors.append("Unsupported action (manual review required)")
        symbol = raw["symbol"].strip().upper()
        exchange = raw["exchange"].strip().upper()
        if action in INSTRUMENT_ACTIONS:
            if not SYMBOL_RE.fullmatch(symbol):
                errors.append("Valid symbol required")
            if not EXCHANGE_RE.fullmatch(exchange):
                errors.append("Valid exchange required")
        elif action in CASH_ACTIONS:
            if symbol or exchange:
                errors.append(f"{action} names no instrument: symbol and exchange must be empty")
        if currency != "USD":
            errors.append("MVP supports USD valuation only (no automatic FX)")
        quantity = decimal_amount(raw["quantity"], "quantity", errors, allow_zero=True, max_places=8)
        price = decimal_amount(raw["unit_price"], "unit_price", errors, allow_zero=True, max_places=8)
        cash = decimal_amount(raw["cash_amount"], "cash_amount", errors, allow_zero=True, max_places=2)
        fee = decimal_amount(raw["fee_amount"], "fee_amount", errors, allow_zero=True, max_places=2)
        if action in TRADE_ACTIONS:
            if quantity <= 0:
                errors.append("quantity must be positive for BUY/SELL")
            if price <= 0:
                errors.append("unit_price must be positive for BUY/SELL")
            if cash != 0:
                errors.append("cash_amount applies to DIVIDEND/DEPOSIT/WITHDRAW only")
        elif action == "DIVIDEND":
            if cash <= 0:
                errors.append("cash_amount must be positive (the payout)")
            elif quantity > 0 and price > 0 and abs(quantity * price - cash) > CENT:
                errors.append("cash_amount does not reconcile with quantity x unit_price")
        elif action == "FEE":
            if quantity != 0 or price != 0 or cash != 0:
                errors.append("FEE carries its amount in fee_amount only")
            if fee <= 0:
                errors.append("fee_amount must be positive for FEE")
        elif action in ("DEPOSIT", "WITHDRAW"):
            if quantity != 0 or price != 0:
                errors.append(f"{action} carries its USD amount in cash_amount only")
            if cash <= 0:
                errors.append("cash_amount must be positive for DEPOSIT/WITHDRAW")
        if raw["date"].strip():
            try:
                txn_date = date.fromisoformat(raw["date"].strip())
                if txn_date > today:
                    errors.append("date cannot be in the future (UTC)")
            except ValueError:
                errors.append("date must be YYYY-MM-DD")
                txn_date = None
        else:
            errors.append("date is required")
            txn_date = None
        if len(raw["notes"]) > MAX_NOTES:
            errors.append("notes supports at most 500 characters")
        key = raw["entry_key"].strip()
        key_proposed = False
        if not key:
            if propose_keys:
                key = uuid.uuid4().hex
                key_proposed = True
            else:
                errors.append("entry_key is required at commit")
        if len(key) > 64:
            errors.append("entry_key supports at most 64 characters")
        if key and key in seen_keys:
            errors.append("Duplicate entry_key in this import")
        seen_keys.add(key)
        normalized.append({
            "row": index,
            "date": txn_date.isoformat() if txn_date else raw["date"].strip(),
            "action": action,
            "symbol": symbol or None,
            "exchange": exchange or None,
            "quantity": str(quantity),
            "unit_price": str(price),
            "cash_amount": str(cash),
            "currency": currency,
            "fee_amount": str(fee),
            "entry_key": key,
            "notes": raw["notes"].strip() or None,
            "key_proposed": key_proposed,
            "errors": errors,
            "status": "invalid" if errors else "valid",
        })
    return normalized
