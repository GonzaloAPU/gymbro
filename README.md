# SmartGymBro

Aplicación Android para planificar rutinas, registrar entrenamientos y medir progreso.

La aplicación Android está en `frontend/android`, integrada con Capacitor. Consultar
[la guía Android](docs/ANDROID.md) para compilar el APK y conectarlo al backend de pruebas.

Para estudiar el código comentado en español, comenzar por la
[guía de estudio](docs/GUIA-DE-ESTUDIO.md): incluye orden de lectura, conceptos,
mapa de tablas y el recorrido de una acción desde Angular hasta PostgreSQL.

La configuración de la base en la nube y las opciones de backend se documentan en
[Firebase Cloud](docs/FIREBASE-CLOUD.md). La prueba local sigue separada del destino real.

## Stack

- App Android: Capacitor 8 + Angular 19.2 standalone + TypeScript + SCSS
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

`npm test` ejecuta 145 pruebas del backend, las nueve verificaciones de interfaz
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

La rama `render` incluye conexión IAM a Cloud SQL y `render.yaml`. La configuración de la cuenta de servicio, los secretos y el despliegue manual se describe en [docs/RENDER.md](docs/RENDER.md).
