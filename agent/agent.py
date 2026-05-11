"""
Control Hub Agent
Agente ligero para Windows y Ubuntu.
"""
import argparse
import re
import hashlib
import hmac
import json
import logging
import platform
import signal
import subprocess
import sys
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import psutil
import websocket

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("agent")


@dataclass
class Config:
    server_url: str
    device_id: int
    agent_key: str
    heartbeat_interval: int = 15
    metrics_interval: int = 30


@dataclass
class AiPtySession:
    provider: str
    process: subprocess.Popen[str] | None = None
    history: list[tuple[str, str]] | None = None


def compute_handshake_signature(device_id: int, agent_key: str, timestamp: int, nonce: str) -> str:
    msg = f"{device_id}:{timestamp}:{nonce}"
    return hmac.new(agent_key.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).hexdigest()


def get_system_metrics() -> dict[str, Any]:
    cpu = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    boot_time = datetime.fromtimestamp(psutil.boot_time(), tz=timezone.utc)
    uptime = int((datetime.now(timezone.utc) - boot_time).total_seconds())

    return {
        "cpu_percent": round(cpu, 1),
        "ram_percent": round(mem.percent, 1),
        "disk_percent": round(disk.percent, 1),
        "uptime_seconds": uptime,
    }


def execute_action(action: str, params: dict[str, Any]) -> dict[str, Any]:
    import subprocess

    log.info(f"Executing action: {action} with params: {params}")

    if action == "restart_service":
        service = params.get("service", "")
        if not service:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": "No service specified"}
        try:
            if platform.system() == "Windows":
                result = subprocess.run(["net", "stop", service], capture_output=True, text=True, timeout=60)
                if result.returncode != 0:
                    return {"status": "failed", "exit_code": result.returncode, "output_text": result.stdout, "error_text": result.stderr}
                result = subprocess.run(["net", "start", service], capture_output=True, text=True, timeout=60)
                return {"status": "completed", "exit_code": result.returncode, "output_text": result.stdout, "error_text": result.stderr}
            else:
                result = subprocess.run(["sudo", "systemctl", "restart", service], capture_output=True, text=True, timeout=60)
                return {"status": "completed", "exit_code": result.returncode, "output_text": result.stdout, "error_text": result.stderr}
        except subprocess.TimeoutExpired:
            return {"status": "failed", "exit_code": 124, "output_text": "", "error_text": "Command timeout"}
        except Exception as e:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": str(e)}

    elif action == "update_system":
        try:
            if platform.system() == "Windows":
                result = subprocess.run(["powershell", "-Command", "Install-Module -Name PSWindowsUpdate -Force; Import-Module PSWindowsUpdate; Get-WindowsUpdate -Install -AcceptAll -AutoReboot:$false"], capture_output=True, text=True, timeout=300)
            else:
                result = subprocess.run(["sudo", "apt-get", "update", "&&", "sudo", "apt-get", "upgrade", "-y"], capture_output=True, text=True, timeout=300)
            return {"status": "succeeded", "exit_code": result.returncode, "output_text": result.stdout[:2000], "error_text": result.stderr[:2000]}
        except subprocess.TimeoutExpired:
            return {"status": "failed", "exit_code": 124, "output_text": "", "error_text": "Command timeout"}
        except Exception as e:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": str(e)}

    elif action == "run_backup":
        source = params.get("source", "")
        destination = params.get("destination", "")
        if not source or not destination:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": "source and destination required"}
        try:
            if platform.system() == "Windows":
                cmd = ["powershell", "-Command", f"Copy-Item -Path '{source}' -Destination '{destination}' -Recurse"]
            else:
                cmd = ["sudo", "rsync", "-av", source, destination]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            return {"status": "succeeded", "exit_code": result.returncode, "output_text": result.stdout[:2000], "error_text": result.stderr[:2000]}
        except subprocess.TimeoutExpired:
            return {"status": "failed", "exit_code": 124, "output_text": "", "error_text": "Command timeout"}
        except Exception as e:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": str(e)}

    elif action == "cleanup_tmp":
        try:
            if platform.system() == "Windows":
                result = subprocess.run(["powershell", "-Command", "Remove-Item -Path 'C:\\Windows\\Temp\\*' -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue"], capture_output=True, text=True, timeout=120)
            else:
                result = subprocess.run(["sudo", "rm", "-rf", "/tmp/*"], capture_output=True, text=True, timeout=120)
            return {"status": "completed", "exit_code": result.returncode, "output_text": result.stdout or "Cleanup done", "error_text": result.stderr}
        except subprocess.TimeoutExpired:
            return {"status": "failed", "exit_code": 124, "output_text": "", "error_text": "Command timeout"}
        except Exception as e:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": str(e)}

    elif action == "check_docker":
        try:
            if platform.system() == "Windows":
                result = subprocess.run(["docker", "ps"], capture_output=True, text=True, timeout=30)
            else:
                result = subprocess.run(["sudo", "docker", "ps"], capture_output=True, text=True, timeout=30)
            return {"status": "succeeded", "exit_code": result.returncode, "output_text": result.stdout[:2000], "error_text": result.stderr[:2000]}
        except Exception as e:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": str(e)}

    elif action == "list_files":
        try:
            if platform.system() == "Windows":
                result = subprocess.run(["cmd", "/c", "dir"], capture_output=True, text=True, timeout=30)
            else:
                result = subprocess.run(["ls", "-la"], capture_output=True, text=True, timeout=30)
            return {"status": "succeeded", "exit_code": result.returncode, "output_text": result.stdout[:2000], "error_text": result.stderr[:2000]}
        except Exception as e:
            return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": str(e)}

    return {"status": "failed", "exit_code": 1, "output_text": "", "error_text": f"Unknown action: {action}"}


class Agent:
    def __init__(self, config: Config):
        self.config = config
        self.ws: websocket.WebSocketApp | None = None
        self.running = True
        self.last_heartbeat = 0
        self._send_lock = threading.Lock()
        self._terminal_sessions: dict[str, subprocess.Popen[str]] = {}
        self._ai_processes: dict[str, subprocess.Popen[str]] = {}
        self._ai_pty_sessions: dict[str, AiPtySession] = {}

    def _sanitize_ai_chunk(self, text: str) -> str:
        if not text:
            return text
        out = text
        out = re.sub(r"<system-reminder>[\s\S]*?</system-reminder>", "", out, flags=re.IGNORECASE)
        out = re.sub(r"Warning:\s*no stdin data received[^\n]*\n?", "", out, flags=re.IGNORECASE)
        out = re.sub(r"\x1B\[[0-?]*[ -/]*[@-~]", "", out)
        return out

    def _send_json(self, payload: dict[str, Any]) -> None:
        if not self.ws:
            return
        with self._send_lock:
            self.ws.send(json.dumps(payload))

    def _stream_terminal(self, session_id: str, stream_name: str, pipe: Any) -> None:
        try:
            for line in iter(pipe.readline, ""):
                if not line:
                    break
                self._send_json(
                    {
                        "type": "agent.terminal.output",
                        "data": {
                            "session_id": session_id,
                            "stream": stream_name,
                            "chunk": line,
                        },
                    }
                )
        except Exception as exc:
            log.error(f"Terminal stream error ({session_id}/{stream_name}): {exc}")

    def _watch_terminal_exit(self, session_id: str, process: subprocess.Popen[str]) -> None:
        try:
            exit_code = process.wait()
        except Exception:
            exit_code = None
        self._terminal_sessions.pop(session_id, None)
        self._send_json(
            {
                "type": "agent.terminal.exit",
                "data": {
                    "session_id": session_id,
                    "exit_code": exit_code,
                },
            }
        )

    def _start_terminal_session(self, session_id: str, shell: str) -> None:
        if session_id in self._terminal_sessions:
            return
        if platform.system() == "Windows":
            cmd = ["powershell", "-NoLogo", "-NoProfile"]
        else:
            cmd = ["/bin/bash", "-i"]

        process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self._terminal_sessions[session_id] = process

        if process.stdout:
            t_out = threading.Thread(target=self._stream_terminal, args=(session_id, "stdout", process.stdout), daemon=True)
            t_out.start()
        if process.stderr:
            t_err = threading.Thread(target=self._stream_terminal, args=(session_id, "stderr", process.stderr), daemon=True)
            t_err.start()

        t_exit = threading.Thread(target=self._watch_terminal_exit, args=(session_id, process), daemon=True)
        t_exit.start()

    def _write_terminal_input(self, session_id: str, text: str) -> None:
        process = self._terminal_sessions.get(session_id)
        if not process or not process.stdin:
            return
        process.stdin.write(text)
        process.stdin.flush()

    def _stop_terminal_session(self, session_id: str) -> None:
        process = self._terminal_sessions.pop(session_id, None)
        if not process:
            return
        try:
            process.terminate()
            process.wait(timeout=3)
        except Exception:
            try:
                process.kill()
            except Exception:
                pass

    def _stream_ai_output(self, session_id: str, process: subprocess.Popen[str]) -> None:
        seq = 0
        try:
            if process.stdout:
                for line in iter(process.stdout.readline, ""):
                    if not line:
                        break
                    line = self._sanitize_ai_chunk(line)
                    if not line:
                        continue
                    seq += 1
                    self._send_json(
                        {
                            "type": "agent.ai.delta",
                            "data": {
                                "session_id": session_id,
                                "chunk": line,
                                "seq": seq,
                            },
                        }
                    )
            if process.stderr:
                err_text = process.stderr.read()
                if err_text:
                    err_text = self._sanitize_ai_chunk(err_text)
                if err_text:
                    seq += 1
                    self._send_json(
                        {
                            "type": "agent.ai.delta",
                            "data": {
                                "session_id": session_id,
                                "chunk": err_text,
                                "seq": seq,
                            },
                        }
                    )
        except Exception as exc:
            self._send_json(
                {
                    "type": "agent.ai.error",
                    "data": {
                        "session_id": session_id,
                        "detail": str(exc),
                    },
                }
            )
        finally:
            try:
                exit_code = process.wait(timeout=1)
            except Exception:
                exit_code = process.poll()
            self._ai_processes.pop(session_id, None)
            self._ai_pty_sessions.pop(session_id, None)
            self._send_json(
                {
                    "type": "agent.ai.done",
                    "data": {
                        "session_id": session_id,
                        "exit_code": exit_code,
                    },
                }
            )

    def _run_ai(self, session_id: str, provider: str, prompt: str) -> None:
        if session_id in self._ai_processes:
            self._stop_ai(session_id)
        if provider == "claude":
            cmd = ["claude", prompt]
        elif provider == "opencode":
            cmd = ["opencode", "run", prompt]
        else:
            self._send_json(
                {
                    "type": "agent.ai.error",
                    "data": {
                        "session_id": session_id,
                        "detail": f"Unsupported provider: {provider}",
                    },
                }
            )
            return

        process = subprocess.Popen(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
        self._ai_processes[session_id] = process
        t = threading.Thread(target=self._stream_ai_output, args=(session_id, process), daemon=True)
        t.start()

    def _start_ai_pty(self, session_id: str, provider: str) -> None:
        if session_id in self._ai_pty_sessions:
            return
        if provider in {"claude", "opencode"}:
            # PTY emulation via persistent history per session.
            self._ai_pty_sessions[session_id] = AiPtySession(provider="claude", process=None, history=[])
            self._ai_pty_sessions[session_id].provider = provider
            self._send_json({"type": "agent.ai.pty.ready", "data": {"session_id": session_id}})
            return
        else:
            self._send_json({"type": "agent.ai.error", "data": {"session_id": session_id, "detail": f"Unsupported provider: {provider}"}})
            return

    def _run_persistent_turn(self, session_id: str, user_prompt: str) -> None:
        session = self._ai_pty_sessions.get(session_id)
        if not session:
            return
        if session.history is None:
            session.history = []
        prompt = user_prompt.strip()
        if not prompt:
            return
        session.history.append(("user", prompt))

        # Build conversation context for persistent behavior.
        turns = session.history[-20:]
        context_lines: list[str] = [
            "You are continuing an ongoing conversation. Reply as assistant.",
            "Conversation so far:",
        ]
        for role, text in turns:
            prefix = "User" if role == "user" else "Assistant"
            context_lines.append(f"{prefix}: {text}")
        context_lines.append("Assistant:")
        full_prompt = "\n".join(context_lines)

        if session.provider == "claude":
            cmd = ["claude", full_prompt]
        elif session.provider == "opencode":
            cmd = ["opencode", "run", full_prompt]
        else:
            self._send_json({"type": "agent.ai.error", "data": {"session_id": session_id, "detail": f"Unsupported provider: {session.provider}"}})
            return

        process = subprocess.Popen(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
        session.process = process

        seq = 0
        chunks: list[str] = []
        try:
            if process.stdout:
                for line in iter(process.stdout.readline, ""):
                    if not line:
                        break
                    line = self._sanitize_ai_chunk(line)
                    if not line:
                        continue
                    seq += 1
                    chunks.append(line)
                    self._send_json(
                        {
                            "type": "agent.ai.delta",
                            "data": {"session_id": session_id, "chunk": line, "seq": seq},
                        }
                    )
            if process.stderr:
                err_text = process.stderr.read()
                if err_text:
                    err_text = self._sanitize_ai_chunk(err_text)
                if err_text:
                    seq += 1
                    chunks.append(err_text)
                    self._send_json(
                        {
                            "type": "agent.ai.delta",
                            "data": {"session_id": session_id, "chunk": err_text, "seq": seq},
                        }
                    )
            try:
                exit_code = process.wait(timeout=1)
            except Exception:
                exit_code = process.poll()

            assistant_text = "".join(chunks).strip()
            if assistant_text:
                session.history.append(("assistant", assistant_text))
            self._send_json({"type": "agent.ai.done", "data": {"session_id": session_id, "exit_code": exit_code}})
        except Exception as exc:
            self._send_json({"type": "agent.ai.error", "data": {"session_id": session_id, "detail": str(exc)}})
        finally:
            session.process = None

    def _write_ai_pty_input(self, session_id: str, text: str) -> None:
        session = self._ai_pty_sessions.get(session_id)
        if not session:
            self._send_json({"type": "agent.ai.error", "data": {"session_id": session_id, "detail": "AI PTY session not ready"}})
            return
        if session.provider in {"claude", "opencode"}:
            t = threading.Thread(target=self._run_persistent_turn, args=(session_id, text), daemon=True)
            t.start()
            return

        process = session.process
        if not process or not process.stdin:
            self._send_json({"type": "agent.ai.error", "data": {"session_id": session_id, "detail": "AI PTY process not ready"}})
            return
        process.stdin.write(text)
        process.stdin.flush()

    def _stop_ai_pty(self, session_id: str) -> None:
        session = self._ai_pty_sessions.pop(session_id, None)
        if not session:
            return
        process = session.process
        if not process:
            return
        try:
            process.terminate()
            process.wait(timeout=3)
        except Exception:
            try:
                process.kill()
            except Exception:
                pass

    def _stop_ai(self, session_id: str) -> None:
        process = self._ai_processes.pop(session_id, None)
        if not process:
            return
        try:
            process.terminate()
            process.wait(timeout=3)
        except Exception:
            try:
                process.kill()
            except Exception:
                pass

    def build_ws_url(self) -> str:
        ts = int(time.time())
        nonce = str(uuid.uuid4())
        sig = compute_handshake_signature(self.config.device_id, self.config.agent_key, ts, nonce)
        params = f"device_id={self.config.device_id}&agent_key={self.config.agent_key}&ts={ts}&nonce={nonce}&sig={sig}"
        base = self.config.server_url.rstrip("/")
        return f"{base}/api/v1/ws/agent?{params}"

    def send_heartbeat(self) -> None:
        if not self.ws or not self.running:
            return
        try:
            msg = {
                "type": "agent.heartbeat",
                "timestamp": int(time.time()),
            }
            self.ws.send(json.dumps(msg))
            log.info("Heartbeat sent")
        except Exception as e:
            log.error(f"Heartbeat failed: {e}")

    def send_metrics(self) -> None:
        if not self.ws or not self.running:
            return
        try:
            metrics = get_system_metrics()
            msg = {
                "type": "agent.metrics.push",
                "timestamp": int(time.time()),
                "data": metrics,
            }
            self.ws.send(json.dumps(msg))
            log.info(f"Metrics sent: {metrics}")
        except Exception as e:
            log.error(f"Metrics failed: {e}")

    def on_message(self, ws: websocket.WebSocketApp, raw: str) -> None:
        try:
            msg = json.loads(raw)
        except Exception:
            log.warning(f"Invalid JSON: {raw}")
            return

        msg_type = msg.get("type")
        log.info(f"Received: {msg_type}")

        if msg_type == "server.action.dispatch":
            request_id = msg.get("request_id", "")
            action_data = msg.get("action", {})
            slug = action_data.get("slug", "")
            params = msg.get("params", {})
            log.info(f"Dispatch: {action_data} (request_id={request_id})")
            result = execute_action(slug, params)
            response = {
                "type": "agent.action.result",
                "data": {
                    "request_id": request_id,
                    "status": "succeeded" if result["exit_code"] == 0 else "failed",
                    "exit_code": result["exit_code"],
                    "output_text": result.get("output_text", ""),
                    "error_text": result.get("error_text", ""),
                },
            }
            try:
                ws.send(json.dumps(response))
                log.info(f"Result sent for request_id={request_id}")
            except Exception as e:
                log.error(f"Failed to send result: {e}")

        elif msg_type == "server.ping":
            ws.send(json.dumps({"type": "server.pong", "timestamp": int(time.time())}))
        elif msg_type == "server.terminal.start":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            shell = data.get("shell", "default")
            if not session_id:
                self._send_json({"type": "server.error", "detail": "Missing session_id"})
                return
            self._start_terminal_session(session_id, shell)
        elif msg_type == "server.terminal.input":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            text = data.get("input", "")
            if not session_id:
                self._send_json({"type": "server.error", "detail": "Missing session_id"})
                return
            self._write_terminal_input(session_id, text)
        elif msg_type == "server.terminal.stop":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            if not session_id:
                self._send_json({"type": "server.error", "detail": "Missing session_id"})
                return
            self._stop_terminal_session(session_id)
        elif msg_type == "server.ai.run":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            provider = data.get("provider", "claude")
            prompt = data.get("prompt", "")
            if not session_id:
                self._send_json({"type": "agent.ai.error", "data": {"session_id": "", "detail": "Missing session_id"}})
                return
            if not prompt:
                self._send_json({"type": "agent.ai.error", "data": {"session_id": session_id, "detail": "Empty prompt"}})
                return
            self._run_ai(session_id, provider, prompt)
        elif msg_type == "server.ai.stop":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            if not session_id:
                return
            self._stop_ai(session_id)
        elif msg_type == "server.ai.pty.start":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            provider = data.get("provider", "claude")
            if not session_id:
                return
            self._start_ai_pty(session_id, provider)
        elif msg_type == "server.ai.pty.input":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            text = data.get("input", "")
            if not session_id:
                return
            self._write_ai_pty_input(session_id, text)
        elif msg_type == "server.ai.pty.stop":
            data = msg.get("data", {})
            session_id = data.get("session_id", "")
            if not session_id:
                return
            self._stop_ai_pty(session_id)

    def on_open(self, ws: websocket.WebSocketApp) -> None:
        log.info("Connected to server")
        self.send_heartbeat()
        self.send_metrics()

    def on_close(self, ws: websocket.WebSocketApp, code: int, reason: str) -> None:
        log.warning(f"Disconnected: code={code} reason={reason}")
        self.running = False

    def on_error(self, ws: websocket.WebSocketApp, err: Exception) -> None:
        log.error(f"WebSocket error: {err}")

    def run_loop(self) -> None:
        ws_url = self.build_ws_url()
        log.info(f"Connecting to: {ws_url[:80]}...")

        self.ws = websocket.WebSocketApp(
            ws_url,
            on_message=lambda ws, msg: self.on_message(ws, msg),
            on_open=lambda ws: self.on_open(ws),
            on_close=lambda ws, code, reason: self.on_close(ws, code, reason),
            on_error=lambda ws, err: self.on_error(ws, err),
        )

        def heartbeat_timer() -> None:
            if self.running:
                self.send_heartbeat()

        def metrics_timer() -> None:
            if self.running:
                self.send_metrics()

        import threading
        hb_timer = threading.Timer(self.config.heartbeat_interval, heartbeat_timer)
        hb_timer.daemon = True
        hb_timer.start()

        mt_timer = threading.Timer(self.config.metrics_interval, metrics_timer)
        mt_timer.daemon = True
        mt_timer.start()

        self.ws.run_forever(ping_interval=30, ping_timeout=10)


def main() -> None:
    parser = argparse.ArgumentParser(description="Control Hub Agent")
    parser.add_argument("--server", required=True, help="Server URL (e.g., http://127.0.0.1:8001)")
    parser.add_argument("--device-id", type=int, required=True, help="Device ID registered in the server")
    parser.add_argument("--agent-key", required=True, help="Agent key for authentication")
    parser.add_argument("--heartbeat-interval", type=int, default=15, help="Heartbeat interval in seconds")
    parser.add_argument("--metrics-interval", type=int, default=30, help="Metrics interval in seconds")
    args = parser.parse_args()

    ws_url = args.server.replace("http://", "ws://").replace("https://", "wss://")
    ws_url = ws_url.rstrip("/")

    config = Config(
        server_url=ws_url,
        device_id=args.device_id,
        agent_key=args.agent_key,
        heartbeat_interval=args.heartbeat_interval,
        metrics_interval=args.metrics_interval,
    )

    agent = Agent(config)

    def signal_handler(sig: int, frame: Any) -> None:
        log.info("Shutting down...")
        agent.running = False
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    log.info("Control Hub Agent starting...")
    log.info(f"Device ID: {config.device_id}")
    log.info(f"Server: {args.server}")

    while agent.running:
        try:
            agent.run_loop()
        except Exception as e:
            log.error(f"Connection error: {e}")
            log.info("Reconnecting in 10 seconds...")
            time.sleep(10)


if __name__ == "__main__":
    main()
