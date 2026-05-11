import hashlib
import hmac
import time

import pyotp
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models.action_catalog import ActionCatalog
from app.models.device import Device
from app.models.user import User


client = TestClient(app)


def _login_token() -> str:
    code = pyotp.TOTP("JBSWY3DPEHPK3PXP").now()
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@controlhub.app", "password": "UltraSecurePass123!", "totp_code": code},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _seed_admin_and_device() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "admin@controlhub.app"))
        if user:
            user.password_hash = hash_password("UltraSecurePass123!")
            user.twofa_enabled = True
            user.twofa_secret = "JBSWY3DPEHPK3PXP"
            user.password_change_required = False

        device = db.get(Device, 1)
        if not device and user:
            from app.services.device_service import create_device
            from app.schemas.device import DeviceCreateRequest

            create_device(
                db,
                DeviceCreateRequest(
                    name="VPS Principal",
                    host_type="ubuntu",
                    os_name="Ubuntu 24.04",
                    agent_version="0.1.0",
                    agent_key="this-is-a-very-strong-agent-key-123456",
                ),
                user,
            )

        action = db.scalar(select(ActionCatalog).where(ActionCatalog.slug == "restart_service"))
        if action:
            action.timeout_seconds = 120

        db.commit()
    finally:
        db.close()


def _agent_ws_query(device_id: int, agent_key: str) -> str:
    ts = int(time.time())
    nonce = f"n{ts}"
    sig = hmac.new(agent_key.encode("utf-8"), f"{device_id}:{ts}:{nonce}".encode("utf-8"), hashlib.sha256).hexdigest()
    return f"/api/v1/ws/agent?device_id={device_id}&agent_key={agent_key}&ts={ts}&nonce={nonce}&sig={sig}"


def test_metrics_endpoint_and_param_validation() -> None:
    _seed_admin_and_device()
    token = _login_token()
    headers = {"Authorization": f"Bearer {token}"}

    metrics_resp = client.get("/api/v1/devices/1/metrics?offset=0&limit=10", headers=headers)
    assert metrics_resp.status_code == 200
    assert isinstance(metrics_resp.json(), list)

    invalid_run = client.post("/api/v1/devices/1/actions/1/run", headers=headers, json={"params": {}})
    assert invalid_run.status_code == 422


def test_ws_agent_handshake_replay_blocked() -> None:
    _seed_admin_and_device()
    query = _agent_ws_query(1, "this-is-a-very-strong-agent-key-123456")

    with client.websocket_connect(query):
        pass

    failed = False
    try:
        with client.websocket_connect(query):
            pass
    except Exception:
        failed = True

    assert failed is True
