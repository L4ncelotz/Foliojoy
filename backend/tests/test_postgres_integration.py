"""PostgreSQL migration verification: real Alembic upgrade, version stamp, API smoke.

CI provides an isolated PostgreSQL service database (never production) and
runs `alembic upgrade head` before pytest; the upgrade call below is
idempotent, so this test also passes when run directly against a PG database.
SQLite harness: skipped (local runs use create_all in test_portfolio.py).
"""
import os
import uuid
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./portfolio_local.db")
EXPECTED_TABLES = ("users", "portfolios", "holding_snapshots", "snapshot_positions")
HEAD_REVISION = "0001"


def _upgrade_to_head():
    from alembic import command
    from alembic.config import Config

    cfg = Config()
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", DB_URL)
    command.upgrade(cfg, "head")


def test_postgres_alembic_migrations_and_api_smoke():
    if not DB_URL.startswith("postgresql"):
        pytest.skip("PostgreSQL test database unavailable")
    _upgrade_to_head()
    engine = create_engine(DB_URL)
    try:
        with engine.connect() as connection:
            version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
            assert version == HEAD_REVISION, f"expected head {HEAD_REVISION}, got {version!r}"
        tables = inspect(engine).get_table_names()
        for table in EXPECTED_TABLES:
            assert table in tables, f"migrated schema missing {table}"
        TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

        def db_override():
            with TestSession() as db:
                yield db

        app.dependency_overrides[get_db] = db_override
        try:
            email = f"pg-{uuid.uuid4().hex[:8]}@example.com"
            with TestClient(app) as client:
                r = client.post("/api/auth/register", json={"email": email, "password": "safePassword1234"})
                assert r.status_code == 201, r.text
                headers = {"X-CSRF-Token": client.get("/api/auth/me").json()["csrf_token"]}
                p = client.post("/api/portfolios", json={"name": "PG Migration Check", "base_currency": "USD"}, headers=headers)
                assert p.status_code == 201, p.text
                pid = p.json()["id"]
                rows = [{
                    "symbol": "NVDA", "exchange": "NASDAQ", "quantity": "10",
                    "unit_price": "130", "market_value": "", "currency": "USD",
                    "snapshot_date": date.today().isoformat(),
                }]
                preview = client.post(f"/api/portfolios/{pid}/imports/preview", json={"rows": rows}, headers=headers)
                assert preview.status_code == 200 and preview.json()["valid"], preview.text
                commit = client.post(f"/api/portfolios/{pid}/snapshots", json={"rows": rows}, headers=headers)
                assert commit.status_code == 201, commit.text
                dash = client.get(f"/api/portfolios/{pid}/dashboard")
                assert dash.status_code == 200 and dash.json()["total_value"] == "1300.00", dash.text
        finally:
            app.dependency_overrides.clear()
    finally:
        engine.dispose()
