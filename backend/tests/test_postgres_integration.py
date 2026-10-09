"""PostgreSQL integration verification (minimal): connects, creates tables, asserts schema."""
import os
from sqlalchemy import create_engine, inspect
from app.database import Base

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./portfolio_local.db")

def test_postgres_connection_and_schema():
    if not DB_URL.startswith("postgresql"):
        # Skip if PostgreSQL service is unavailable (local SQLite fallback)
        return
    engine = create_engine(DB_URL)
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert "users" in tables
    assert "portfolios" in tables
    assert "holding_snapshots" in tables
    assert "snapshot_positions" in tables
