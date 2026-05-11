# Arquitectura tecnica

## Componentes

- `backend` (FastAPI): autenticacion, autorizacion, gestion de dispositivos, acciones y auditoria.
- `agent` (Python): ejecuta en cada host, envia metricas y procesa acciones permitidas.
- `app_flutter` (Flutter): UI unica para Web, escritorio y movil.
- `postgres` (persistencia): usuarios, dispositivos, acciones, auditoria.
- `redis` (sesiones/eventos): soporte para tokens, rate limiting y pub/sub.

## Flujo principal

1. Usuario inicia sesion en Flutter con password + TOTP.
2. Flutter obtiene access token y refresh token.
3. Flutter consume REST para listar dispositivos y abre WebSocket cliente.
4. Agente abre WebSocket saliente hacia backend y se autentica con `agent_key`.
5. Backend enruta eventos de metricas y resultados a clientes suscritos.
6. Usuario dispara accion permitida; backend la despacha al agente.
7. Agente ejecuta con reglas de seguridad, responde resultado y backend audita.

## Fronteras de seguridad

- No exponer shell libre en MVP.
- Toda accion pasa por catalogo whitelist.
- Parametros validados por esquema y saneados.
- Tiempo maximo de ejecucion por accion.
- Salida truncada y sanitizada.
- Auditoria de actor, origen, objetivo y resultado.

## Mensajeria WebSocket (version 1)

### Mensajes agente -> servidor

- `agent.hello`
- `agent.metrics.push`
- `agent.action.result`
- `agent.heartbeat`

### Mensajes servidor -> agente

- `server.action.dispatch`
- `server.ack`

### Mensajes servidor -> cliente Flutter

- `client.device.status.updated`
- `client.action.run.updated`
- `client.audit.event`
