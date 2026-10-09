"""Transaction ledger API tests: validation matrix, identity, isolation.

No P&L or cost basis is computed anywhere here; cash_balance is a stored
Decimal sum surfaced with the commit response only.
"""
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def client():
    engine = create_engine("sqlite+pysqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def db_override():
        with TestSession() as db:
            yield db

    app.dependency_overrides[get_db] = db_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def register(client, email="ledger@example.com"):
    r = client.post("/api/auth/register", json={"email": email, "password": "safePassword1234"})
    assert r.status_code == 201, r.text
    csrf = client.get("/api/auth/me").json()["csrf_token"]
    return {"X-CSRF-Token": csrf}


def create(client, headers, name="Ledger"):
    r = client.post("/api/portfolios", json={"name": name, "base_currency": "USD"}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()["id"]


TODAY_UTC = datetime.now(timezone.utc).date().isoformat()


def row(action, key, **overrides):
    base = {"date": "2026-03-01", "action": action, "symbol": "", "exchange": "",
            "quantity": "", "unit_price": "", "cash_amount": "", "currency": "USD",
            "fee_amount": "", "entry_key": key, "notes": ""}
    base.update(overrides)
    return base


def buy(key="buy-1", **overrides):
    base = {"symbol": "NVDA", "exchange": "NASDAQ", "quantity": "10", "unit_price": "130.00"}
    base.update(overrides)
    return row("BUY", key, **base)


def preview(client, pid, headers, rows):
    r = client.post(f"/api/portfolios/{pid}/transactions/preview", json={"rows": rows}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def commit(client, pid, headers, rows):
    return client.post(f"/api/portfolios/{pid}/transactions", json={"rows": rows}, headers=headers)


def listed(client, pid, headers):
    r = client.get(f"/api/portfolios/{pid}/transactions", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_preview_matrix_valid_shapes(client):
    headers = register(client)
    pid = create(client, headers)
    rows = [
        buy("buy-1"),
        row("SELL", "sell-1", symbol="NVDA", exchange="NASDAQ", quantity="5", unit_price="140.00", fee_amount="5.00"),
        row("DIVIDEND", "div-1", symbol="NVDA", exchange="NASDAQ", quantity="15", unit_price="2.00", cash_amount="30.00"),
        row("DIVIDEND", "div-2", symbol="NVDA", exchange="NASDAQ", cash_amount="12.50"),
        row("FEE", "fee-1", fee_amount="9.95"),
        row("DEPOSIT", "dep-1", cash_amount="5000.00"),
        row("WITHDRAW", "wd-1", cash_amount="100.00", fee_amount="1.00"),
    ]
    result = preview(client, pid, headers, rows)
    assert result["valid"] is True, result["rows"]


def test_preview_rejects_violations(client):
    headers = register(client)
    pid = create(client, headers)
    rows = [
        buy("k1", quantity="-5"),  # SELL -5 style negatives invalid
        buy("k2", date="2999-01-01"),  # future date rejected
        buy("k3", date="03/01/2026"),  # non ISO date rejected
        row("SPLIT", "k4", symbol="NVDA", exchange="NASDAQ", quantity="2", unit_price="1.00"),  # unsupported action
        row("FEE", "k5", quantity="1", fee_amount="2.00"),  # FEE carries amount in fee only
        row("DEPOSIT", "k6", symbol="USD", exchange="CASH", cash_amount="5.00"),  # cash rows name no instrument
        row("DEPOSIT", "k7", quantity="5", unit_price="1", cash_amount=""),  # no artificial unit price
        buy("k8", cash_amount="10.00"),  # trades carry no cash_amount
        row("DIVIDEND", "k9", symbol="NVDA", exchange="NASDAQ", quantity="15", unit_price="2.00", cash_amount="31.00"),  # dividend mismatch
        row("DIVIDEND", "k10", symbol="NVDA", exchange="NASDAQ", cash_amount=""),  # dividend needs payout
        buy("k11", currency="EUR"),  # USD only
        row("BUY", "k12", symbol="nvda!", exchange="NASDAQ", quantity="1", unit_price="1.00"),  # symbol syntax
    ]
    result = preview(client, pid, headers, rows)
    assert result["valid"] is False
    assert all(item["status"] == "invalid" for item in result["rows"]), result["rows"]
    dup = preview(client, pid, headers, [buy("same"), buy("same", quantity="1")])
    assert dup["valid"] is False
    assert "Duplicate entry_key" in str(dup["rows"])


def test_preview_proposes_keys_for_keyless_rows(client):
    headers = register(client)
    pid = create(client, headers)
    keyless = buy("ignored")
    keyless["entry_key"] = ""
    result = preview(client, pid, headers, [keyless])
    assert result["valid"] is True
    assert result["rows"][0]["entry_key"], "preview must propose a key"
    assert result["rows"][0]["key_proposed"] is True


def test_commit_requires_keys_and_rejects_invalid(client):
    headers = register(client)
    pid = create(client, headers)
    keyless = buy("ignored")
    keyless["entry_key"] = ""
    assert commit(client, pid, headers, [keyless]).status_code == 422
    assert commit(client, pid, headers, [buy("bad", quantity="-5")]).status_code == 422
    assert listed(client, pid, headers) == []


def test_commit_list_idempotent_retry_and_repeats(client):
    headers = register(client)
    pid = create(client, headers)
    first = commit(client, pid, headers, [buy("buy-1"), buy("buy-2")])
    assert first.status_code == 201, first.text
    assert first.json()["reused"] is False
    assert len(first.json()["transaction_ids"]) == 2
    again = commit(client, pid, headers, [buy("buy-1"), buy("buy-2")])
    assert again.status_code == 201
    assert again.json()["reused"] is True
    assert len(listed(client, pid, headers)) == 2, "retry must not duplicate"
    # Identical content under a new key is a legitimate new entry.
    repeat = commit(client, pid, headers, [buy("buy-3")])
    assert repeat.status_code == 201 and repeat.json()["reused"] is False
    amounts = listed(client, pid, headers)
    assert len(amounts) == 3
    assert amounts[0]["quantity"] == "10" and amounts[0]["unit_price"] == "130"


def test_commit_conflict_rolls_back_entire_batch(client):
    headers = register(client)
    pid = create(client, headers)
    assert commit(client, pid, headers, [buy("buy-1")]).status_code == 201
    changed = buy("buy-1", quantity="99")
    fresh = buy("buy-9")
    r = commit(client, pid, headers, [fresh, changed])
    assert r.status_code == 409, r.text
    body = r.json()["detail"]
    assert body["recorded"] == []
    assert "nothing was recorded" in body["message"]
    assert [t["entry_key"] for t in listed(client, pid, headers)] == ["buy-1"], "conflicted batch leaves zero new rows"


def test_cash_balance_and_negative_warning(client):
    headers = register(client)
    pid = create(client, headers)
    r = commit(client, pid, headers, [row("DEPOSIT", "dep-1", cash_amount="100.00")])
    assert r.json()["cash_balance"] == "100.00"
    assert r.json()["negative_cash_warning"] is False
    r = commit(client, pid, headers, [row("WITHDRAW", "wd-1", cash_amount="250.00")])
    assert r.status_code == 201, "overdraft is allowed"
    assert r.json()["cash_balance"] == "-150.00", "negative cash stored as computed"
    assert r.json()["negative_cash_warning"] is True


def test_ledger_isolated_and_snapshot_untouched(client):
    headers = register(client, "owner@example.com")
    pid = create(client, headers)
    snap_rows = [{"symbol": "NVDA", "exchange": "NASDAQ", "quantity": "10", "unit_price": "130",
                   "market_value": "", "currency": "USD", "snapshot_date": TODAY_UTC}]
    assert client.post(f"/api/portfolios/{pid}/snapshots", json={"rows": snap_rows}, headers=headers).status_code == 201
    before = client.get(f"/api/portfolios/{pid}/dashboard").json()
    assert commit(client, pid, headers, [buy("buy-1")]).status_code == 201
    after = client.get(f"/api/portfolios/{pid}/dashboard").json()
    assert after["total_value"] == before["total_value"] == "1300.00"
    assert after["metrics_unavailable"] == before["metrics_unavailable"]
    assert client.post(f"/api/portfolios/{pid}/transactions", json={"rows": [buy("x")]}).status_code == 403
    other = register(client, "stranger@example.com")
    assert client.get(f"/api/portfolios/{pid}/transactions", headers=other).status_code == 404
    client.cookies.clear()
    assert client.get(f"/api/portfolios/{pid}/transactions").status_code == 401


def test_ledger_csv_preview_and_limits(client):
    headers = register(client)
    pid = create(client, headers)
    csv_text = ("date,action,symbol,exchange,quantity,unit_price,cash_amount,currency,"
                "fee_amount,entry_key,notes\n"
                "2026-03-01,BUY,NVDA,NASDAQ,10,130.00,,USD,0.00,csv-1,\n")
    r = client.post(f"/api/portfolios/{pid}/transactions/preview", json={"csv_text": csv_text}, headers=headers)
    assert r.status_code == 200 and r.json()["valid"], r.text
    bad = client.post(f"/api/portfolios/{pid}/transactions/preview", headers=headers, json={"csv_text": "date,action\n2026-01-01,BUY\n"})
    assert bad.status_code == 422
