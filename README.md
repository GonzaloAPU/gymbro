# Gymbro AI

Aplicación Android y web para planificar rutinas, registrar entrenamientos y medir progreso.

La versión web para GitHub Pages se prepara en la rama `web`: ver [despliegue web](docs/WEB.md).
Compilar con `npm run build:web`; el backend sigue en Render y los datos en Supabase.

La aplicación Android está en `frontend/android`, integrada con Capacitor. Consultar
[la guía Android](docs/ANDROID.md) para compilar el APK y conectarlo al backend de pruebas.

Para estudiar el código comentado en español, comenzar por la
[guía de estudio](docs/GUIA-DE-ESTUDIO.md): incluye orden de lectura, conceptos,
mapa de tablas y el recorrido de una acción desde Angular hasta PostgreSQL.

La aplicación usa PostgreSQL en Supabase y el backend en Render. Consultar
[la guía de despliegue](docs/RENDER.md). Docker Compose conserva la opción de PostgreSQL local.

## Stack

- App Android: Capacitor 8 + Angular 22.2.4 standalone + TypeScript + SCSS
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

Vista de desarrollo en PC: `http://localhost:4200` (no es el destino de distribución).

`npm run dev:frontend` usa los certificados de confianza del sistema operativo
para que el proxy HTTPS hacia Render funcione también con certificados locales
de antivirus o redes corporativas. La verificación HTTPS permanece activada.

API: `http://localhost:3000/api`  
Health check: `http://localhost:3000/api/health`
pgAdmin: `http://localhost:5050`
PostgreSQL del proyecto: `localhost:5433`

Las cuentas de demostración pertenecen a los datos de prueba del backend; el ingreso
de la app no incluye un botón con credenciales públicas.

## Cuenta de usuario

- `/registro`: alta de una cuenta nueva.
- `/login`: inicio de sesión.
- `/perfil`: vista del perfil; `/perfil/editar` permite modificarlo.
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
- `src/app/services/`: servicios HTTP, alarmas y recuperación local del entrenamiento.
- `src/app/guards/`: proteccion de rutas.
- `src/app/interceptors/`: agregado automatico del JWT.

## Verificación

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run android:apk
```

`npm test` ejecuta 165 pruebas del backend, las nueve verificaciones de interfaz
y 98 casos adicionales de conexión, planificación, sonidos, formularios, fotos y bienvenida.
Estas últimas también se pueden ejecutar con `npm run test:frontend`; usan servicios
simulados y no modifican la base real. El APK debug se genera en
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

La limpieza y los límites revisados se documentan en [la auditoría Android](docs/AUDITORIA-ANDROID-2026-10-21.md).

La [bienvenida](docs/BIENVENIDA.md) prepara un plan local o con Gemini, muestra su semana
y guarda rutinas/horarios/descansos al aceptar. Funciona sin configurar IA en modo local.

## pgAdmin

Inicio de sesion: `admin@smartgymbro.com` / `smartgymbro`.

Para registrar PostgreSQL dentro de pgAdmin usa:

- Host: `postgres`
- Puerto: `5432`
- Base: `smartgymbro`
- Usuario: `smartgymbro`
- Contrasena: `smartgymbro`

## Backend en Render

La rama `render` usa PostgreSQL de Supabase y el backend Express en Render. Incluye SQL para crear 15 tablas y 190 ejercicios, un usuario de ejecución con permisos limitados y `render.yaml`. Seguí la guía de aprendizaje [docs/RENDER.md](docs/RENDER.md). `npm run supabase:test` verifica el instalador en PostgreSQL embebido sin credenciales ni servicios externos.
