# Control Hub Flutter

Cliente Flutter inicial para Web, Desktop y Movil.

## Estado actual

- Login con email/password/totp.
- Dashboard de dispositivos con listado, estado y actualizacion en vivo por WebSocket.
- Persistencia de sesion segura (`flutter_secure_storage`).
- Detalle de dispositivo con metricas recientes.
- Ejecucion de acciones y historial de runs.
- Cliente HTTP conectado al backend (`/api/v1`).

## Estructura

- `lib/core`: tema, cliente API, sesion.
- `lib/features/auth`: login y servicio de auth.
- `lib/features/devices`: listado, detalle y metricas.
- `lib/features/actions`: modelos y servicio de acciones/runs.

## Ejecutar

1. Instala Flutter SDK en tu maquina.
2. Desde `app_flutter/` ejecuta:

```bash
flutter pub get
flutter run -d chrome
```

Con entorno custom (API):

```bash
flutter run -d edge --dart-define=API_BASE_URL=http://127.0.0.1:8001/api/v1
```

## Scripts rapidos (PowerShell)

Desde `app_flutter/`:

```powershell
./scripts/run_web.ps1
./scripts/run_windows.ps1
./scripts/run_android.ps1 -DeviceId emulator-5554
```

Con API personalizada:

```powershell
./scripts/run_web.ps1 -ApiBaseUrl "http://127.0.0.1:8001/api/v1"
```

Build release:

```powershell
./scripts/build_release.ps1 -Target web -ApiBaseUrl "https://tu-dominio/api/v1"
./scripts/build_release.ps1 -Target windows -ApiBaseUrl "https://tu-dominio/api/v1"
./scripts/build_release.ps1 -Target apk -ApiBaseUrl "https://tu-dominio/api/v1"
./scripts/build_release.ps1 -Target appbundle -ApiBaseUrl "https://tu-dominio/api/v1"
```

Si pruebas en Windows desktop:

```bash
flutter config --enable-windows-desktop
flutter run -d windows
```

## Nota de API

La URL base esta en `lib/core/app_config.dart`:

- `http://127.0.0.1:8001/api/v1`

Cambiala por la IP/host de tu backend cuando pruebes desde movil.

## Como iniciar sesion

1. Levanta backend en `http://127.0.0.1:8001`.
2. En la app usa:
   - Email: `admin@controlhub.app`
   - Password: la que configuraste (ej. `UltraSecurePass123!`)
   - Codigo 2FA: TOTP de 6 digitos.

Si necesitas generar TOTP local para pruebas:

```powershell
uv run python -c "import pyotp; print(pyotp.TOTP('JBSWY3DPEHPK3PXP').now())"
```

## Nota Windows

Para plugins nativos (secure storage en desktop), habilita Developer Mode:

```powershell
start ms-settings:developers
```
