import asyncio
import hashlib
import hmac
import json
import time
from urllib import request

import pyotp
import websockets


BASE = "http://127.0.0.1:8018/api/v1"
WS_BASE = "ws://127.0.0.1:8018/api/v1"
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


def _request_json(method: str, url: str, token: str | None = None, body: dict | None = None) -> dict:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = request.Request(url, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_token() -> str:
    code = pyotp.TOTP(TOTP_SECRET).now()
    payload = {"email": EMAIL, "password": PASSWORD, "totp_code": code}
    body = _request_json("POST", f"{BASE}/auth/login", body=payload)
    return body["access_token"]


async def run_flow() -> None:
    token = get_token()
    actions = _request_json("GET", f"{BASE}/devices/{DEVICE_ID}/actions", token=token)
    restart_action = next(a for a in actions if a["slug"] == "restart_service")

    agent_uri = build_agent_ws_uri(WS_BASE, DEVICE_ID, AGENT_KEY)
    client_uri = f"{WS_BASE}/ws/client?token={token}"

    async with websockets.connect(client_uri) as client_ws:
        async with websockets.connect(agent_uri) as agent_ws:
            run_payload = {"params": {"service_name": "nginx"}}
            run = _request_json(
                "POST",
                f"{BASE}/devices/{DEVICE_ID}/actions/{restart_action['id']}/run",
                token=token,
                body=run_payload,
            )

            dispatch_msg = json.loads(await asyncio.wait_for(agent_ws.recv(), timeout=5))
            await agent_ws.send(
                json.dumps(
                    {
                        "type": "agent.action.result",
                        "data": {
                            "request_id": dispatch_msg["request_id"],
                            "status": "succeeded",
                            "exit_code": 0,
                            "output_text": "service restarted",
                            "error_text": None,
                        },
                    }
                )
            )
            await asyncio.wait_for(agent_ws.recv(), timeout=5)

            broadcast = None
            for _ in range(4):
                msg = json.loads(await asyncio.wait_for(client_ws.recv(), timeout=5))
                if msg.get("type") == "client.action.run.updated":
                    broadcast = msg
                    break
            run_after = _request_json("GET", f"{BASE}/runs/{run['id']}", token=token)

            print(
                json.dumps(
                    {
                        "dispatch_type": dispatch_msg.get("type"),
                        "broadcast_type": broadcast.get("type") if broadcast else None,
                        "run_status": run_after.get("status"),
                        "run_exit_code": run_after.get("exit_code"),
                    }
                )
            )


if __name__ == "__main__":
    asyncio.run(run_flow())
