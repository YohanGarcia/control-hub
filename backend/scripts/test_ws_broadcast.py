import asyncio
import hashlib
import hmac
import json
import time
from urllib import request

import pyotp
import websockets


BASE = "http://127.0.0.1:8017/api/v1"
WS_BASE = "ws://127.0.0.1:8017/api/v1"
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


async def run() -> None:
    token = get_token()
    client_uri = f"{WS_BASE}/ws/client?token={token}"
    agent_uri = build_agent_ws_uri(WS_BASE, DEVICE_ID, AGENT_KEY)

    async with websockets.connect(client_uri) as client_ws:
        async with websockets.connect(agent_uri) as agent_ws:
            await agent_ws.send(json.dumps({"type": "agent.heartbeat"}))
            await agent_ws.recv()
            msg = await asyncio.wait_for(client_ws.recv(), timeout=5)
            payload = json.loads(msg)
            print(json.dumps({"client_event": payload.get("type"), "device_id": payload.get("device_id")}))


if __name__ == "__main__":
    asyncio.run(run())
