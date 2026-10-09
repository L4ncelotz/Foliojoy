"""Explicit valuation-only snapshot import; never infer trade history or cost basis."""
import csv
import io
import re
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from pydantic import BaseModel, Field, model_validator

MAX_CSV_BYTES = 256_000
MAX_ROWS = 200
FIELDS = ("symbol", "exchange", "quantity", "unit_price", "market_value", "currency", "snapshot_date")
SYMBOL_RE = re.compile(r"^[A-Z0-9.\-]{1,32}$")
EXCHANGE_RE = re.compile(r"^[A-Z0-9_\-]{1,32}$")
CENT = Decimal("0.01")


class RawRow(BaseModel):
    symbol: str = Field(default="", max_length=64)
    exchange: str = Field(default="", max_length=64)
    quantity: str = Field(default="", max_length=80)
    unit_price: str = Field(default="", max_length=80)
    market_value: str = Field(default="", max_length=80)
    currency: str = Field(default="USD", max_length=12)
    snapshot_date: str = Field(default="", max_length=32)

    @model_validator(mode="before")
    @classmethod
    def stringify(cls, value: Any):
        if isinstance(value, dict):
            return {key: "" if val is None else str(val) for key, val in value.items()}
        return value


class PreviewRequest(BaseModel):
    rows: list[RawRow] | None = None
    csv_text: str | None = None

    @model_validator(mode="after")
    def exactly_one_source(self):
        if (self.rows is None) == (self.csv_text is None):
            raise ValueError("Provide rows or csv_text, but not both")
        return self


class CommitRequest(BaseModel):
    rows: list[RawRow] = Field(min_length=1, max_length=MAX_ROWS)


def parse_csv(content: str) -> list[RawRow]:
    if len(content.encode("utf-8")) > MAX_CSV_BYTES:
        raise ValueError("CSV exceeds 256 KB")
    try:
        reader = csv.DictReader(io.StringIO(content, newline=""), strict=True)
        if not reader.fieldnames:
            raise ValueError("CSV is empty")
        headers = [h.strip().lstrip("\ufeff").lower() for h in reader.fieldnames]
        if len(headers) != len(set(headers)):
            raise ValueError("Duplicate CSV header")
        missing = {"symbol", "exchange", "quantity", "currency", "snapshot_date"} - set(headers)
        if missing:
            raise ValueError("Missing columns: " + ", ".join(sorted(missing)))
        if not ({"unit_price", "market_value"} & set(headers)):
            raise ValueError("CSV needs unit_price or market_value column")
        if set(headers) - set(FIELDS):
            raise ValueError("Unknown columns: " + ", ".join(sorted(set(headers) - set(FIELDS))))
        rows = []
        for raw in reader:
            if len(rows) >= MAX_ROWS:
                raise ValueError("Maximum 200 positions per import")
            if None in raw:
                raise ValueError("CSV row has too many columns")
            rows.append(RawRow(**{headers[i]: raw.get(reader.fieldnames[i], "") for i in range(len(headers))}))
        return rows
    except csv.Error as exc:
        raise ValueError("Malformed CSV: " + str(exc)) from exc


def decimal_value(raw: str, field: str, errors: list[str], required: bool = False) -> Decimal | None:
    value = raw.strip()
    if not value:
        if required:
            errors.append(f"{field} is required")
        return None
    try:
        number = Decimal(value)
    except InvalidOperation:
        errors.append(f"{field} must be numeric")
        return None
    if not number.is_finite() or number <= 0:
        errors.append(f"{field} must be a positive finite number")
        return None
    if number.adjusted() > 13 or -number.as_tuple().exponent > 8:
        errors.append(f"{field} is out of supported precision")
        return None
    return number


def normalize(rows: list[RawRow]):
    if not 1 <= len(rows) <= MAX_ROWS:
        raise ValueError("Import must contain 1 to 200 rows")
    normalized = []
    dates: set[date] = set()
    seen: set[tuple[str, str]] = set()
    for index, entry in enumerate(rows, 1):
        raw = entry.model_dump()
        symbol = raw["symbol"].strip().upper()
        exchange = raw["exchange"].strip().upper()
        currency = raw["currency"].strip().upper()
        errors: list[str] = []
        if not SYMBOL_RE.fullmatch(symbol):
            errors.append("Valid symbol required")
        if not EXCHANGE_RE.fullmatch(exchange):
            errors.append("Valid exchange required")
        if currency != "USD":
            errors.append("MVP supports USD valuation only (no automatic FX)")
        quantity = decimal_value(raw["quantity"], "quantity", errors, required=True)
        price = decimal_value(raw["unit_price"], "unit_price", errors)
        market_value = decimal_value(raw["market_value"], "market_value", errors)
        if price is None and market_value is None:
            errors.append("unit_price or market_value is required")
        if raw["snapshot_date"].strip():
            try:
                as_of = date.fromisoformat(raw["snapshot_date"].strip())
                if as_of > date.today():
                    errors.append("snapshot_date cannot be in the future")
                dates.add(as_of)
            except ValueError:
                errors.append("snapshot_date must be YYYY-MM-DD")
        else:
            errors.append("snapshot_date is required")
        instrument_key = (symbol, exchange)
        if symbol and exchange and instrument_key in seen:
            errors.append("Duplicate instrument in this snapshot")
        seen.add(instrument_key)
        if market_value is None and quantity is not None and price is not None:
            market_value = (quantity * price).quantize(CENT, rounding=ROUND_HALF_UP)
        if market_value is not None:
            if market_value <= 0:
                errors.append("market_value must be positive after rounding")
            if market_value != market_value.quantize(CENT):
                errors.append("market_value supports at most two decimal places")
            if quantity is not None and price is not None:
                expected = (quantity * price).quantize(CENT, rounding=ROUND_HALF_UP)
                if abs(expected - market_value) > CENT:
                    errors.append("market_value does not reconcile with quantity x unit_price")
        normalized.append({
            "row": index,
            "symbol": symbol,
            "exchange": exchange,
            "quantity": str(quantity) if quantity is not None else raw["quantity"],
            "unit_price": str(price) if price is not None else raw["unit_price"],
            "market_value": str(market_value) if market_value is not None else raw["market_value"],
            "currency": currency,
            "snapshot_date": raw["snapshot_date"].strip(),
            "errors": errors,
            "status": "invalid" if errors else "valid",
        })
    if len(dates) > 1:
        for record in normalized:
            record["errors"].append("All rows in one snapshot must have the same date")
            record["status"] = "invalid"
    return normalized
