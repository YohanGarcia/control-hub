import asyncio
import hashlib
import hmac
import json
import time
from urllib import error, request

import pyotp
import websockets


BASE = "http://127.0.0.1:8019/api/v1"
WS_BASE = "ws://127.0.0.1:8019/api/v1"
EMAIL = "admin@controlhub.app"
PASSWORD = "UltraSecurePass123!"
TOTP_SECRET = "JBSWY3DPEHPK3PXP"
DEVICE_ID = 1
AGENT_KEY = "this-is-a-very-strong-agent-key-123456"


def build_agent_ws_uri(base: str, device_id: int, agent_key: str) -> str:
    ts = int(time.time())
    nonce = f"n{ts}"
    sig = hmac.new(agent_key.encode("utf-8"), f"{device_id}:{ts}:{nonce}".encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{base}/ws/agent?device_id={device_id}&agent_key={agent_key}&ts={ts}&nonce={nonce}&sig={sig}"


def request_json(method: str, url: str, token: str | None = None, body: dict | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def request_status(method: str, url: str, token: str | None = None, body: dict | None = None) -> int:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=10):
            return 200
    except error.HTTPError as exc:
        return exc.code


def get_token() -> str:
    code = pyotp.TOTP(TOTP_SECRET).now()
    payload = {"email": EMAIL, "password": PASSWORD, "totp_code": code}
    body = request_json("POST", f"{BASE}/auth/login", body=payload)
    return body["access_token"]


async def main() -> None:
    token = get_token()
    actions = request_json("GET", f"{BASE}/devices/{DEVICE_ID}/actions", token=token)
    restart_action = next(a for a in actions if a["slug"] == "restart_service")

    invalid_status = request_status(
        "POST",
        f"{BASE}/devices/{DEVICE_ID}/actions/{restart_action['id']}/run",
        token=token,
        body={"params": {}},
    )

    agent_uri = build_agent_ws_uri(WS_BASE, DEVICE_ID, AGENT_KEY)
    async with websockets.connect(agent_uri) as agent_ws:
        run = request_json(
            "POST",
            f"{BASE}/devices/{DEVICE_ID}/actions/{restart_action['id']}/run",
            token=token,
            body={"params": {"service_name": "ssh"}},
        )
        dispatch = json.loads(await asyncio.wait_for(agent_ws.recv(), timeout=5))
        await asyncio.sleep(2)

    run_after = request_json("GET", f"{BASE}/runs/{run['id']}", token=token)
    audit = request_json("GET", f"{BASE}/audit/events?offset=0&limit=20", token=token)
    has_dispatch_audit = any(e["event_type"] == "action.run.dispatched" for e in audit)

    print(
        json.dumps(
            {
                "invalid_status": invalid_status,
                "dispatch_type": dispatch.get("type"),
                "timeout_status": run_after.get("status"),
                "has_dispatch_audit": has_dispatch_audit,
            }
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
