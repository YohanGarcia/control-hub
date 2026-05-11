# Plan de ejecucion MVP (security-first)

## Objetivo

Construir un MVP funcional para controlar VPS Ubuntu y PC Windows desde una app unica Flutter, con backend FastAPI y enfoque de seguridad desde el dia 1.

## Fase A - Base segura

1. Backend FastAPI base con estructura modular.
2. Base de datos PostgreSQL y migraciones Alembic.
3. Auth con password + 2FA TOTP obligatorio para admin.
4. JWT de acceso (15 min) + refresh token rotativo de un solo uso.
5. RBAC minimo (`admin`, `observer`).
6. Auditoria append-only para eventos criticos.

### Entregables

- Modulos: `auth`, `users`, `roles`, `audit`.
- Esquema DB inicial y migracion base.
- Endpoints de login, refresh, logout y setup 2FA.

## Fase B - Dispositivos y agente

1. Registro seguro de agentes (Windows/Ubuntu) por clave unica.
2. Canal WebSocket agente-servidor con handshake firmado.
3. Ingesta de metricas (CPU, RAM, disco, uptime).
4. Persistencia de estado actual y metrica historica.

### Entregables

- Modulos: `devices`, `metrics`, `ws_agent`.
- Servicio de agente Python con cliente WebSocket y recolector de metricas.

## Fase C - Acciones remotas controladas

1. Catalogo de acciones permitidas (whitelist) inicial:
   - `restart_service`
   - `update_system`
   - `run_backup`
   - `cleanup_tmp`
   - `check_docker`
2. Validacion estricta de parametros por accion.
3. Ejecucion con timeout, limite de salida y codigos normalizados.
4. Trazabilidad completa de ejecucion y resultado.

### Entregables

- Modulos: `actions`, `runs`, `ws_dispatch`.
- Contrato JSON para despacho y resultado.

## Fase D - Cliente Flutter unificado

1. Login + 2FA.
2. Dashboard de dispositivos en tiempo real.
3. Vista detalle con metricas y estado.
4. Ejecucion de acciones permitidas.
5. Historial de acciones y auditoria visual.

### Entregables

- App Flutter con arquitectura por features.
- Integracion API REST + WebSocket.

## Fase E - Hardening y despliegue

1. Reverse proxy con TLS automatico.
2. Rate limiting y bloqueo progresivo.
3. Rotacion de claves de agente y secretos.
4. Backups y monitoreo.
5. Checklist de seguridad pre-produccion.

### Entregables

- `docker-compose` inicial para entorno dev/staging.
- Documentacion operativa en `docs/runbooks`.

## Definition of Done del MVP

- Login seguro con 2FA funcionando.
- 2 agentes conectados (Windows + Ubuntu).
- Dashboard en vivo de estado.
- 5 acciones whitelist ejecutables con auditoria.
- Deploy en VPS con HTTPS y logs centralizados.
