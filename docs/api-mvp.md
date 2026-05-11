# API MVP (borrador v1)

## Auth

- `POST /auth/login`
  - input: `email`, `password`, `totp_code`
  - output: `access_token`, `refresh_token`, `expires_in`
- `POST /auth/refresh`
  - input: `refresh_token`
  - output: nuevo par de tokens
- `POST /auth/logout`
  - invalida refresh token activo

## Dispositivos

- `GET /devices`
  - lista dispositivos visibles por usuario
- `GET /devices/{device_id}/status`
  - estado actual + ultima metrica
- `GET /devices/{device_id}/metrics`
  - serie temporal paginada

## Acciones

- `GET /devices/{device_id}/actions`
  - catalogo aplicable por tipo de host
- `POST /devices/{device_id}/actions/{action_id}/run`
  - input: parametros validados por accion
  - output: `run_id`, estado inicial
- `GET /devices/{device_id}/actions/history`
  - historial de ejecuciones
- `GET /runs/{run_id}`
  - detalle de ejecucion y resultado

## Auditoria

- `GET /audit/events`
  - feed paginado de eventos auditables

## WebSocket

- `GET /ws/client`
  - canal en vivo para estados/runs/auditoria
- `GET /ws/agent`
  - canal de conexion para agentes
  - query requerida: `device_id`, `agent_key`, `ts`, `nonce`, `sig` (anti-replay)

## Codigos y politicas base

- Respuestas de error con estructura uniforme (`code`, `message`, `details`).
- Rate limiting en endpoints de auth.
- Rechazo de tokens revocados y refresh reuse detection.
