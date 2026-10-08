from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from httpx import ASGITransport, AsyncClient
from beisawa.main import app


@pytest.fixture
def auth_environment(monkeypatch):
    key = Ed25519PrivateKey.generate()
    monkeypatch.setenv('BEISAWA_ENGINE_REQUIRE_AUTH', '1')
    monkeypatch.setenv('NEON_AUTH_BASE_URL', 'https://auth.example.test/neondb/auth')
    monkeypatch.setenv('NEON_AUTH_JWKS_URL', 'https://auth.example.test/neondb/auth/jwks')
    monkeypatch.setattr('beisawa.auth.jwks_client', lambda _: SimpleNamespace(get_signing_key_from_jwt=lambda _: SimpleNamespace(key=key.public_key())))
    return key


def token(key, **changes):
    return jwt.encode({'sub': 'reviewer-a', 'iss': 'https://auth.example.test', 'iat': datetime.now(UTC), 'exp': datetime.now(UTC) + timedelta(minutes=5), **changes}, key, algorithm='EdDSA')


@pytest.mark.asyncio
async def test_engine_independently_verifies_reviewer_and_hides_aggregate_audit(auth_environment):
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        assert (await client.get('/api/v1/health')).status_code == 401
        assert (await client.get('/api/v1/health', headers={'Authorization': 'Bearer forged'})).status_code == 401
        headers = {'Authorization': f'Bearer {token(auth_environment)}'}
        assert (await client.get('/api/v1/health', headers=headers)).status_code == 200
        assert (await client.get('/api/v1/audit', headers=headers)).status_code == 404


@pytest.mark.asyncio
@pytest.mark.parametrize('changes', [{'iss': 'https://attacker.test'}, {'exp': datetime.now(UTC) - timedelta(minutes=1)}, {'role': 'anonymous'}])
async def test_engine_rejects_invalid_identity_claims(auth_environment, changes):
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        assert (await client.get('/api/v1/health', headers={'Authorization': f'Bearer {token(auth_environment, **changes)}'})).status_code == 401


@pytest.mark.asyncio
async def test_engine_fails_closed_when_auth_configuration_is_missing(monkeypatch):
    monkeypatch.delenv('NEON_AUTH_BASE_URL', raising=False)
    monkeypatch.setenv('BEISAWA_ENGINE_REQUIRE_AUTH', '1')
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        assert (await client.get('/api/v1/health')).status_code == 503
