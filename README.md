# SmartGymBro

MVP full stack para planificar rutinas, registrar entrenamientos y medir progreso.

## Stack

- Frontend: Angular 19.2 standalone + TypeScript + SCSS
- Backend: Node.js + Express en JavaScript ESM
- Base de datos: PostgreSQL
- ORM: Sequelize
- Administracion de base de datos: pgAdmin 4
- Infraestructura local: Docker Compose

## Inicio rapido

```powershell
Copy-Item backend/.env.example backend/.env
docker compose up -d
npm.cmd install
npm.cmd run db:migrate -- --name init
npm.cmd run db:seed
npm.cmd run dev
```

Frontend: `http://localhost:4200`  
API: `http://localhost:3000/api`  
Health check: `http://localhost:3000/api/health`
pgAdmin: `http://localhost:5050`
PostgreSQL del proyecto: `localhost:5433`

Usuario demo: `demo@smartgymbro.app` / `Demo1234!`

## Cuenta de usuario

- `/registro`: alta de una cuenta nueva.
- `/login`: inicio de sesion y acceso a la cuenta demo.
- `/perfil`: edicion de nombre, objetivo, altura, peso y gimnasio.
- `/rutinas/nueva`: constructor de rutinas con catálogo precargado de fuerza, aeróbico y anaeróbico.
- Inicio, entrenamiento y progreso requieren un JWT valido.

## Estructura

- `frontend/`: dashboard, entrenamiento con cronometro y progreso.
- `backend/`: API REST, autenticacion JWT y reglas de sesiones.
- `backend/src/models/`: modelos y relaciones Sequelize.
- `backend/scripts/`: sincronizacion del esquema y datos demo.
- `docker-compose.yml`: PostgreSQL local persistente.

Autenticacion, perfil, rutinas, sesiones, series y progreso consumen la API real mediante servicios Angular tipados en `frontend/src/app/services/`.

### Estructura Angular

- `src/app/components/`: componentes y pantallas.
- `src/app/services/`: servicios HTTP y sus archivos `.spec.ts`.
- `src/app/guards/`: proteccion de rutas.
- `src/app/interceptors/`: agregado automatico del JWT.

## pgAdmin

Inicio de sesion: `admin@smartgymbro.com` / `smartgymbro`.

Para registrar PostgreSQL dentro de pgAdmin usa:

- Host: `postgres`
- Puerto: `5432`
- Base: `smartgymbro`
- Usuario: `smartgymbro`
- Contrasena: `smartgymbro`
