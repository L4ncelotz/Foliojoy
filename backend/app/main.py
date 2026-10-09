"""Portfolio foundation API: private USD snapshots with explicit review/confirmation."""
import csv
import hashlib
import io
import json
import os
import secrets
from datetime import timedelta
from decimal import Decimal
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from .imports import CommitRequest, PreviewRequest, normalize, parse_csv
from .models import Portfolio, Position, Snapshot, User, UserSession, utcnow

app = FastAPI(title="Portfolio Intelligence API", version="0.1.0", docs_url="/api/docs", openapi_url="/api/openapi.json")
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-CSRF-Token"])
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_NAME = "portfolio_session"
SESSION_DAYS = 7
hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class PortfolioCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    base_currency: str = "USD"


def same_origin(request: Request):
    origin = request.headers.get("origin")
    if origin is not None and origin not in ALLOWED_ORIGINS:
        raise HTTPException(403, "Untrusted origin")


def new_session(db: Session, user: User, response: Response):
    raw = secrets.token_urlsafe(48)
    db.add(UserSession(
        user_id=user.id,
        token_hash=hashlib.sha256(raw.encode()).hexdigest(),
        csrf_token=secrets.token_urlsafe(32),
        expires_at=utcnow() + timedelta(days=SESSION_DAYS),
    ))
    db.commit()
    response.set_cookie(COOKIE_NAME, raw, httponly=True, secure=COOKIE_SECURE, samesite="lax", max_age=SESSION_DAYS * 86400, path="/")


def get_session(request: Request, db: Annotated[Session, Depends(get_db)]) -> UserSession:
    raw = request.cookies.get(COOKIE_NAME)
    if not raw:
        raise HTTPException(401, "Sign in required")
    record = db.scalar(select(UserSession).where(UserSession.token_hash == hashlib.sha256(raw.encode()).hexdigest()))
    if record is None or record.expires_at < utcnow():
        raise HTTPException(401, "Session expired")
    return record


def check_csrf(
    request: Request,
    session: Annotated[UserSession, Depends(get_session)],
    x_csrf_token: Annotated[str | None, Header()] = None,
) -> UserSession:
    same_origin(request)
    if not x_csrf_token or not secrets.compare_digest(x_csrf_token, session.csrf_token):
        raise HTTPException(403, "Invalid CSRF token")
    return session


def owned_portfolio(portfolio_id: int, user_id: int, db: Session) -> Portfolio:
    record = db.scalar(select(Portfolio).where(Portfolio.id == portfolio_id, Portfolio.owner_id == user_id))
    if record is None:
        raise HTTPException(404, "Portfolio not found")
    return record


def portfolio_dict(portfolio: Portfolio):
    return {"id": portfolio.id, "name": portfolio.name, "base_currency": portfolio.base_currency}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=201)
def register(data: Credentials, request: Request, response: Response, db: Annotated[Session, Depends(get_db)]):
    same_origin(request)
    email = str(data.email).strip().lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    user = User(email=email, password_hash=hasher.hash(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered") from None
    new_session(db, user, response)
    return {"id": user.id, "email": email}


@app.post("/api/auth/login")
def login(data: Credentials, request: Request, response: Response, db: Annotated[Session, Depends(get_db)]):
    same_origin(request)
    user = db.scalar(select(User).where(User.email == str(data.email).strip().lower()))
    try:
        authenticated = user is not None and hasher.verify(user.password_hash, data.password)
    except VerificationError:
        authenticated = False
    if not authenticated:
        raise HTTPException(401, "Invalid credentials")
    new_session(db, user, response)
    return {"id": user.id, "email": user.email}


@app.get("/api/auth/me")
def me(session: Annotated[UserSession, Depends(get_session)]):
    return {"user": {"id": session.user.id, "email": session.user.email}, "csrf_token": session.csrf_token}


@app.post("/api/auth/logout")
def logout(response: Response, session: Annotated[UserSession, Depends(check_csrf)], db: Annotated[Session, Depends(get_db)]):
    db.delete(session)
    db.commit()
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@app.get("/api/portfolios")
def list_portfolios(session: Annotated[UserSession, Depends(get_session)], db: Annotated[Session, Depends(get_db)]):
    records = db.scalars(select(Portfolio).where(Portfolio.owner_id == session.user_id).order_by(Portfolio.id)).all()
    return [portfolio_dict(p) for p in records]


@app.post("/api/portfolios", status_code=201)
def create_portfolio(data: PortfolioCreate, session: Annotated[UserSession, Depends(check_csrf)], db: Annotated[Session, Depends(get_db)]):
    if data.base_currency != "USD":
        raise HTTPException(422, "MVP supports USD portfolios only")
    if not data.name.strip():
        raise HTTPException(422, "Portfolio name required")
    record = Portfolio(name=data.name.strip(), base_currency="USD", owner_id=session.user_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return portfolio_dict(record)


@app.post("/api/portfolios/{portfolio_id}/imports/preview")
def preview(portfolio_id: int, data: PreviewRequest, session: Annotated[UserSession, Depends(check_csrf)], db: Annotated[Session, Depends(get_db)]):
    owned_portfolio(portfolio_id, session.user_id, db)
    try:
        rows = data.rows if data.rows is not None else parse_csv(data.csv_text or "")
        result = normalize(rows)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return {"rows": result, "valid": bool(result) and all(row["status"] == "valid" for row in result)}


@app.post("/api/portfolios/{portfolio_id}/snapshots", status_code=201)
def commit(portfolio_id: int, data: CommitRequest, session: Annotated[UserSession, Depends(check_csrf)], db: Annotated[Session, Depends(get_db)]):
    owned_portfolio(portfolio_id, session.user_id, db)
    try:
        rows = normalize(data.rows)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    if any(row["status"] != "valid" for row in rows):
        raise HTTPException(422, {"message": "Fix validation errors before saving", "rows": rows})
    ordered = sorted(rows, key=lambda row: (row["symbol"], row["exchange"]))
    canonical = [{
        key: (format(Decimal(row[key]).normalize(), "f") if key in ("quantity", "unit_price", "market_value") and row[key] else row[key])
        for key in ("symbol", "exchange", "quantity", "unit_price", "market_value", "currency", "snapshot_date")
    } for row in ordered]
    fingerprint = hashlib.sha256(json.dumps(canonical, sort_keys=True).encode()).hexdigest()
    existing = db.scalar(select(Snapshot).where(Snapshot.portfolio_id == portfolio_id, Snapshot.fingerprint == fingerprint))
    if existing:
        return {"snapshot_id": existing.id, "reused": True}
    from datetime import date
    snapshot = Snapshot(portfolio_id=portfolio_id, fingerprint=fingerprint, as_of=date.fromisoformat(rows[0]["snapshot_date"]))
    snapshot.positions = [Position(
        symbol=row["symbol"], exchange=row["exchange"], quantity=Decimal(row["quantity"]),
        unit_price=Decimal(row["unit_price"]) if row["unit_price"] else None,
        market_value=Decimal(row["market_value"]), currency="USD",
    ) for row in rows]
    db.add(snapshot)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(Snapshot).where(Snapshot.portfolio_id == portfolio_id, Snapshot.fingerprint == fingerprint))
        if existing:
            return {"snapshot_id": existing.id, "reused": True}
        raise
    return {"snapshot_id": snapshot.id, "reused": False}


@app.get("/api/portfolios/{portfolio_id}/dashboard")
def dashboard(portfolio_id: int, session: Annotated[UserSession, Depends(get_session)], db: Annotated[Session, Depends(get_db)]):
    portfolio = owned_portfolio(portfolio_id, session.user_id, db)
    snapshot = db.scalar(select(Snapshot).where(Snapshot.portfolio_id == portfolio_id).order_by(desc(Snapshot.as_of), desc(Snapshot.id)).limit(1))
    if snapshot is None:
        return {"portfolio": portfolio_dict(portfolio), "snapshot": None, "total_value": None, "positions": [], "metrics_unavailable": ["cost_basis", "pnl", "performance", "historical_returns"]}
    total = sum((item.market_value for item in snapshot.positions), Decimal("0.00"))
    positions = []
    for item in sorted(snapshot.positions, key=lambda pos: pos.market_value, reverse=True):
        percent = (item.market_value / total * 100).quantize(Decimal("0.01")) if total else Decimal("0.00")
        positions.append({
            "symbol": item.symbol, "exchange": item.exchange, "quantity": str(item.quantity),
            "unit_price": str(item.unit_price) if item.unit_price is not None else None,
            "market_value": str(item.market_value), "currency": "USD", "weight_pct": str(percent),
        })
    return {
        "portfolio": portfolio_dict(portfolio),
        "snapshot": {"id": snapshot.id, "as_of": snapshot.as_of.isoformat()},
        "total_value": str(total), "positions": positions,
        "metrics_unavailable": ["cost_basis", "pnl", "performance", "historical_returns"],
    }


@app.get("/api/templates/holdings.csv")
def holdings_csv():
    from fastapi.responses import PlainTextResponse
    buff = io.StringIO()
    writer = csv.writer(buff)
    writer.writerow(["symbol", "exchange", "quantity", "unit_price", "market_value", "currency", "snapshot_date"])
    writer.writerow(["NVDA", "NASDAQ", "10", "130.00", "", "USD", "2026-01-15"])
    writer.writerow(["AVGO", "NASDAQ", "5", "", "1500.00", "USD", "2026-01-15"])
    return PlainTextResponse(buff.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="holdings-template.csv"'})
