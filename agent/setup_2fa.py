import requests

BASE_URL = "http://127.0.0.1:8001/api/v1"

email = input("Email: ").strip() or "admin@controlhub.app"
password = input("Password actual: ").strip()

if not password:
    print("Debes ingresar password actual")
    raise SystemExit(1)

print("\n--- Configurando 2FA ---")
resp = requests.post(
    f"{BASE_URL}/auth/setup-2fa",
    json={"email": email, "password": password},
)
if resp.status_code != 200:
    print(f"Error setup-2fa: {resp.status_code} {resp.text}")
    exit(1)

data = resp.json()
print(f"\n¡2FA configurado!")
print(f"\nURI TOTP: {data['otp_uri']}")
print(f"Secret manual: {data['secret']}")
print("\nUsa cualquier app de autenticador (Google Auth, Authy, etc.)")
print("Escanea el QR o ingresa el secret manualmente.")
print("\nLuego genera un código y ejecuta register_device.py para probar.")
