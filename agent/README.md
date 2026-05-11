# Control Hub Agent

Agente ligero para Windows y Ubuntu que se conecta al servidor Control Hub via WebSocket.

## Instalacion

```bash
uv venv
uv pip install -r requirements.txt
```

## Registro de dispositivo

Usa la API del backend para registrar un dispositivo y obtener la clave del agente:

```bash
# Login
curl -X POST http://127.0.0.1:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin-email>","password":"<admin-password>","totp_code":"<totp-code>"}'

# Registrar dispositivo
curl -X POST http://127.0.0.1:8001/api/v1/devices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Mi PC","host_type":"windows","os_name":"Windows 11","agent_key":"<generated-strong-key>"}'
```

## Ejecucion

```bash
# Windows
python agent.py --server http://127.0.0.1:8001 --device-id 1 --agent-key <clave>

# Ubuntu
python agent.py --server http://tu-servidor.com --device-id 1 --agent-key <clave>
```

## Acciones disponibles

- `restart_service` - Reinicia un servicio del sistema
- `update_system` - Actualiza el sistema operativo
- `run_backup` - Ejecuta backup de archivos
- `cleanup_tmp` - Limpia archivos temporales
- `check_docker` - Verifica estado de Docker

## Parametros

| Parametro | Default | Descripcion |
|-----------|---------|-------------|
| `--heartbeat-interval` | 15 | Intervalo de heartbeat en segundos |
| `--metrics-interval` | 30 | Intervalo de metricas en segundos |
