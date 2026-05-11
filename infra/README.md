# Infra local

## Levantar entorno (Docker)

Desde `infra/`:

```bash
docker compose up -d --build
```

API: `http://127.0.0.1:8000`

## Produccion simple (mismo servidor: web + api + db)

Este flujo deja Flutter Web, FastAPI, Postgres y Redis en el mismo host usando Nginx.

1) En el servidor, ajustar dominio Nginx:

- Edita `infra/nginx/default.prod.conf`
- Cambia `server_name _;` por tu dominio real (opcional).

2) Configurar entorno backend:

```bash
cd backend
cp .env.example .env
```

Actualiza al menos:

- `JWT_SECRET_KEY`
- `CORS_ALLOW_ORIGIN_REGEX` (tu dominio)

3) Levantar stack de produccion:

```bash
cd infra
docker compose -f docker-compose.prod.yml up -d --build
```

Para Raspberry Pi (mas ligero y sin build web manual):

```bash
docker compose -f docker-compose.rpi.yml up -d --build
```

Este perfil reduce consumo en Raspberry:

- Redis sin persistencia AOF
- limite de memoria en Redis
- API con `--workers 1`
- Web Flutter se compila dentro de Docker (`app_flutter/Dockerfile.web`)

Servicios expuestos:

- Web + API via Nginx: `http://<tu-dominio>`
- API docs: `http://<tu-dominio>/docs`

Notas:

- La API corre migraciones al iniciar (`alembic upgrade head`).
- En perfil Raspberry no necesitas `flutter build web` manual en el host.
- Para SSL, agrega Certbot/Nginx luego de validar HTTP.

## Ejecutar migraciones

Desde `backend/`:

```bash
alembic upgrade head
```

Si quieres correr migraciones dentro del contenedor:

```bash
docker compose run --rm api alembic upgrade head
```
