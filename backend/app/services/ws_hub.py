import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WsHub:
    def __init__(self) -> None:
        self.client_connections: set[WebSocket] = set()
        self.agent_connections: dict[int, WebSocket] = {}

    async def connect_client(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.client_connections.add(websocket)

    def disconnect_client(self, websocket: WebSocket) -> None:
        self.client_connections.discard(websocket)

    async def connect_agent(self, device_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.agent_connections[device_id] = websocket

    def disconnect_agent(self, device_id: int) -> None:
        self.agent_connections.pop(device_id, None)

    def is_agent_connected(self, device_id: int) -> bool:
        return device_id in self.agent_connections

    async def send_to_agent(self, device_id: int, payload: dict[str, Any]) -> bool:
        websocket = self.agent_connections.get(device_id)
        if websocket is None:
            return False
        try:
            await websocket.send_text(json.dumps(payload))
            return True
        except Exception:
            self.disconnect_agent(device_id)
            return False

    async def broadcast_to_clients(self, payload: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        message = json.dumps(payload)
        for ws in self.client_connections:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(ws)

        for ws in stale:
            self.client_connections.discard(ws)


ws_hub = WsHub()
