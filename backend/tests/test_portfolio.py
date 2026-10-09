import pytest
from datetime import date, timedelta
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


def register(client, email="user@example.com"):
    r = client.post('/api/auth/register', json={"email": email, "password": "safePassword1234"})
    assert r.status_code == 201, r.text
    csrf = client.get('/api/auth/me').json()['csrf_token']
    return {'X-CSRF-Token': csrf}


def create(client, headers):
    r = client.post('/api/portfolios', json={'name': 'My Investments', 'base_currency': 'USD'}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()['id']


TODAY = date.today().isoformat()
YESTERDAY = (date.today() - timedelta(days=1)).isoformat()


def sample_rows():
    return [
        {'symbol': 'NVDA', 'exchange': 'NASDAQ', 'quantity': '10', 'unit_price': '130', 'market_value': '', 'currency': 'USD', 'snapshot_date': TODAY},
        {'symbol': 'AVGO', 'exchange': 'NASDAQ', 'quantity': '2', 'unit_price': '', 'market_value': '900.00', 'currency': 'USD', 'snapshot_date': TODAY},
    ]


def test_full_flow_and_idempotent_import(client):
    headers = register(client)
    pid = create(client, headers)
    path = f'/api/portfolios/{pid}'
    preview = client.post(path+'/imports/preview', json={'rows':sample_rows()}, headers=headers)
    assert preview.status_code == 200, preview.text
    assert preview.json()['valid'] is True
    assert preview.json()['rows'][0]['market_value'] == '1300.00'
    normalized_rows = [{k:v for k,v in row.items() if k in sample_rows()[0]} for row in preview.json()['rows']]
    commit = client.post(path+'/snapshots', json={'rows':normalized_rows}, headers=headers)
    assert commit.status_code == 201, commit.text
    duplicate = client.post(path+'/snapshots', json={'rows':normalized_rows}, headers=headers)
    assert duplicate.status_code == 201
    assert duplicate.json()['reused'] is True
    dash = client.get(path+'/dashboard')
    assert dash.status_code == 200, dash.text
    data = dash.json()
    assert data['total_value'] == '2200.00'
    assert data['positions'][0]['symbol'] == 'NVDA'
    assert data['positions'][0]['weight_pct'] == '59.09'
    assert 'pnl' in data['metrics_unavailable']
    assert data['snapshot']['as_of'] == TODAY


def test_reject_mismatch_and_no_auto_inferred_values(client):
    headers = register(client)
    pid = create(client, headers)
    bad = sample_rows()
    bad[0]['market_value'] = '2000'  # 10*130 != 2000
    bad[1]['market_value'] = ''       # quantity alone cannot value without price
    r = client.post(f'/api/portfolios/{pid}/imports/preview', json={'rows':bad}, headers=headers)
    assert r.status_code == 200
    assert not r.json()['valid']
    errors = str([record['errors'] for record in r.json()['rows']])
    assert 'does not reconcile' in errors
    assert 'unit_price or market_value is required' in errors
    refused = client.post(f'/api/portfolios/{pid}/snapshots', json={'rows':bad}, headers=headers)
    assert refused.status_code == 422
    assert client.get(f'/api/portfolios/{pid}/dashboard').json()['snapshot'] is None


def test_duplicate_instrument_and_inconsistent_date(client):
    headers = register(client)
    pid = create(client, headers)
    values = sample_rows()
    values.append({**values[0], 'snapshot_date': YESTERDAY})
    r = client.post(f'/api/portfolios/{pid}/imports/preview', json={'rows':values}, headers=headers)
    assert r.status_code == 200
    assert all(row['status'] == 'invalid' for row in r.json()['rows'])
    assert 'Duplicate instrument' in str(r.json())


def test_csrf_and_user_isolation(client):
    headers = register(client, 'first@example.com')
    pid = create(client, headers)
    assert client.post('/api/portfolios', json={'name': 'bad'}).status_code == 403
    assert client.post('/api/auth/logout', headers=headers).status_code == 200
    other = register(client, 'second@example.com')
    assert client.get('/api/portfolios').json() == []
    assert client.get(f'/api/portfolios/{pid}/dashboard').status_code == 404
    assert client.post(f'/api/portfolios/{pid}/snapshots', json={'rows':sample_rows()}, headers=other).status_code == 404


def test_csv_template_preview_and_unsupported_currency(client):
    headers = register(client)
    pid = create(client, headers)
    template = client.get('/api/templates/holdings.csv')
    assert template.status_code == 200 and 'symbol,exchange,quantity' in template.text
    r = client.post(f'/api/portfolios/{pid}/imports/preview', headers=headers, json={'csv_text':template.text})
    assert r.status_code == 200 and r.json()['valid']
    rows = sample_rows()
    rows[0]['currency'] = 'THB'
    r = client.post(f'/api/portfolios/{pid}/imports/preview', headers=headers, json={'rows':rows})
    assert not r.json()['valid']
    assert 'USD' in str(r.json())


def test_password_and_origin_protection(client):
    blocked = client.post('/api/auth/register', json={'email':'a@example.com','password':'short'})
    assert blocked.status_code == 422
    bad_origin = client.post('/api/auth/register', headers={'Origin':'https://evil.example'}, json={'email':'a@example.com','password':'very-long-pass123'})
    assert bad_origin.status_code == 403


def test_input_limits_and_nonfinite_numbers(client):
    headers = register(client)
    pid = create(client, headers)
    for bad_num in ('NaN', 'Infinity', '-1', '0'):
        rows = sample_rows()
        rows[0]['quantity'] = bad_num
        result = client.post(f'/api/portfolios/{pid}/imports/preview', json={'rows':rows}, headers=headers)
        assert result.status_code == 200 and not result.json()['valid']
    big = 'a' * 260_000
    r = client.post(f'/api/portfolios/{pid}/imports/preview', headers=headers, json={'csv_text':big})
    assert r.status_code == 422
