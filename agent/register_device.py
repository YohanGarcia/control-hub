import secrets

import requests

BASE_URL = "http://127.0.0.1:8001/api/v1"


def main():
    email = input("Email: ").strip()
    password = input("Password: ").strip()
    totp = input("TOTP Code: ").strip()

    if not email or not password or not totp:
        print("Email, password y TOTP son obligatorios")
        return

    print("\n--- Login ---")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password, "totp_code": totp},
    )
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} {resp.text}")
        return

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login OK")

    while True:
        print("\n--- Menu ---")
        print("1. Registrar dispositivo")
        print("2. Listar dispositivos")
        print("3. Salir")
        op = input("Opcion: ").strip()

        if op == "1":
            name = input("Nombre: ").strip()
            if not name:
                name = f"Device-{secrets.token_hex(4)}"
            host_type = input("Host type (windows/linux): ").strip() or "windows"
            os_name = input("OS name: ").strip() or "Windows"
            agent_version = input("Agent version (opcional): ").strip() or "1.0.0"

            agent_key = "controlhub-agent-" + secrets.token_hex(16)

            resp = requests.post(
                f"{BASE_URL}/devices",
                headers=headers,
                json={
                    "name": name,
                    "host_type": host_type,
                    "os_name": os_name,
                    "agent_version": agent_version,
                    "agent_key": agent_key,
                },
            )
            if resp.status_code == 201:
                d = resp.json()
                print(f"\nDispositivo creado:")
                print(f"  ID: {d['id']}")
                print(f"  Nombre: {d['name']}")
                print(f"  Host: {d['host_type']}")
                print(f"\nClave del agente:")
                print(f"  {agent_key}")
                print(f"\nPara ejecutar:")
                print(f"  uv run python agent.py --server http://127.0.0.1:8001 --device-id {d['id']} --agent-key {agent_key}")
            else:
                print(f"Error: {resp.status_code} {resp.text}")

        elif op == "2":
            resp = requests.get(f"{BASE_URL}/devices", headers=headers)
            if resp.status_code == 200:
                devices = resp.json()
                if not devices:
                    print("No hay dispositivos")
                for d in devices:
                    print(f"  [{d['id']}] {d['name']} ({d['host_type']}) - {'online' if d['is_online'] else 'offline'}")
            else:
                print(f"Error: {resp.status_code} {resp.text}")

        elif op == "3":
            break


if __name__ == "__main__":
    main()
