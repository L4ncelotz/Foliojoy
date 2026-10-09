from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class UserSession(Base):
    __tablename__ = "user_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    csrf_token: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    user: Mapped[User] = relationship()


class Portfolio(Base):
    __tablename__ = "portfolios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    base_currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class Snapshot(Base):
    __tablename__ = "holding_snapshots"
    __table_args__ = (UniqueConstraint("portfolio_id", "fingerprint", name="uq_portfolio_snapshot_fingerprint"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    as_of: Mapped[date] = mapped_column(Date, nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    positions: Mapped[list["Position"]] = relationship(cascade="all, delete-orphan", order_by="Position.id")


class Position(Base):
    __tablename__ = "snapshot_positions"
    __table_args__ = (UniqueConstraint("snapshot_id", "symbol", "exchange", name="uq_snapshot_instrument"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("holding_snapshots.id", ondelete="CASCADE"), nullable=False)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    exchange: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(24, 8), nullable=True)
    market_value: Mapped[Decimal] = mapped_column(Numeric(24, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)


class Transaction(Base):
    """Ledger entry. Identity is (portfolio_id, entry_key); per-action field
    rules live in app/ledger.py. No P&L or cost basis is derived here."""
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "entry_key", name="uq_transaction_portfolio_key"),
        CheckConstraint("quantity >= 0", name="ck_transaction_quantity_nonneg"),
        CheckConstraint("unit_price >= 0", name="ck_transaction_unit_price_nonneg"),
        CheckConstraint("cash_amount >= 0", name="ck_transaction_cash_amount_nonneg"),
        CheckConstraint("fee_amount >= 0", name="ck_transaction_fee_nonneg"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_key: Mapped[str] = mapped_column(String(64), nullable=False)
    txn_date: Mapped[date] = mapped_column(Date, nullable=False)
    action: Mapped[str] = mapped_column(String(16), nullable=False)
    symbol: Mapped[str | None] = mapped_column(String(32), nullable=True)
    exchange: Mapped[str | None] = mapped_column(String(32), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False, default=Decimal("0"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False, default=Decimal("0"))
    cash_amount: Mapped[Decimal] = mapped_column(Numeric(24, 2), nullable=False, default=Decimal("0"))
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(24, 2), nullable=False, default=Decimal("0"))
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
