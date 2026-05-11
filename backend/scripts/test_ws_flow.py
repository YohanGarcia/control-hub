import asyncio
import hashlib
import hmac
import json
import time
from urllib import request

import pyotp
import websockets


BASE = "http://127.0.0.1:8016/api/v1"
WS_BASE = "ws://127.0.0.1:8016/api/v1"
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


def get_token() -> str:
    code = pyotp.TOTP(TOTP_SECRET).now()
    payload = {"email": EMAIL, "password": PASSWORD, "totp_code": code}
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(f"{BASE}/auth/login", data=data, headers={"Content-Type": "application/json"}, method="POST")
    with request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body["access_token"]


async def run_agent() -> None:
    uri = build_agent_ws_uri(WS_BASE, DEVICE_ID, AGENT_KEY)
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({"type": "agent.heartbeat"}))
        await ws.recv()
        await ws.send(
            json.dumps(
                {
                    "type": "agent.metrics.push",
                    "data": {
                        "cpu_percent": 15.5,
                        "ram_percent": 32.2,
                        "disk_percent": 44.1,
                        "uptime_seconds": 12345,
                    },
                }
            )
        )
        await ws.recv()


def fetch_status(token: str) -> dict:
    req = request.Request(
        f"{BASE}/devices/{DEVICE_ID}/status",
        headers={"Authorization": f"Bearer {token}"},
        method="GET",
    )
    with request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    token = get_token()
    before = fetch_status(token)
    asyncio.run(run_agent())
    after = fetch_status(token)
    print(
        json.dumps(
            {
                "before_online": before["device"]["is_online"],
                "after_online": after["device"]["is_online"],
                "metric_exists": after["latest_metric"] is not None,
            }
        )
    )


if __name__ == "__main__":
    main()
