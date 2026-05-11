import secrets

import requests

BASE_URL = "http://127.0.0.1:8001/api/v1"


def main() -> None:
    print("Crear dispositivo de agente")
    email = input("Email admin: ").strip()
    password = input("Password admin: ").strip()
    totp_code = input("TOTP code: ").strip()
    name = input("Nombre del dispositivo [Mi dispositivo]: ").strip() or "Mi dispositivo"
    host_type = input("Host type [windows/linux] (default windows): ").strip() or "windows"
    os_name = input("OS name [Windows/Ubuntu]: ").strip() or "Windows"
    agent_version = input("Agent version [1.0.0]: ").strip() or "1.0.0"
    agent_key = "controlhub-agent-" + secrets.token_hex(16)

    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password, "totp_code": totp_code},
        timeout=20,
    )
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        raise SystemExit(1)

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create = requests.post(
        f"{BASE_URL}/devices",
        headers=headers,
        json={
            "name": name,
            "host_type": host_type,
            "os_name": os_name,
            "agent_version": agent_version,
            "agent_key": agent_key,
        },
        timeout=20,
    )

    if create.status_code != 201:
        print(f"Error creating device: {create.status_code} {create.text}")
        raise SystemExit(1)

    d = create.json()
    print(f"\nDispositivo ID: {d['id']}")
    print(f"Nombre: {d['name']}")
    print("\nGuarda esta clave en un lugar seguro (no se puede recuperar en texto plano):")
    print(f"Agent key: {agent_key}")
    print("\nComando para iniciar agente:")
    print(f"python agent.py --server http://127.0.0.1:8001 --device-id {d['id']} --agent-key {agent_key}")


if __name__ == "__main__":
    main()
