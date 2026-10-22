# Backend de Gymbro en Render

Rama exclusiva: `render`. Android permanece en `codex/android`.
La base ya está en Cloud SQL de Firebase, con 15 tablas y 190 ejercicios.
Render solo ejecutará Express; no debe crear otra base, migrar ni cargar semillas.

## 1. Identidad del backend en Google Cloud

En el proyecto `gymbro-569e3`, crear una cuenta de servicio llamada
`gymbro-render`. Asignar únicamente los roles **Cloud SQL Client**
(`roles/cloudsql.client`) y **Cloud SQL Instance User**
(`roles/cloudsql.instanceUser`). La API Cloud SQL Admin debe estar habilitada.

En Cloud SQL, instancia `gymbro-569e3-instance`, agregar esa cuenta como usuario
de base de datos con autenticación IAM. La instancia debe tener habilitada la
autenticación IAM. El correo completo de la cuenta de servicio es
`gymbro-render@gymbro-569e3.iam.gserviceaccount.com`; el nombre del usuario
PostgreSQL es `gymbro-render@gymbro-569e3.iam`.

Desde el editor SQL de Cloud SQL, con una identidad administradora, ejecutar
en `gymbro-569e3-database`:

```sql
GRANT CONNECT ON DATABASE "gymbro-569e3-database"
TO "gymbro-render@gymbro-569e3.iam";
GRANT USAGE ON SCHEMA public TO "gymbro-render@gymbro-569e3.iam";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.users, public.exercises, public.routines, public.routine_days,
  public.routine_exercises, public.routine_schedules, public.training_sessions,
  public.performed_exercises, public.performed_sets, public.body_weight_histories,
  public.strength_records, public.user_rest_days, public.session_mutations,
  public.welcome_plans
TO "gymbro-render@gymbro-569e3.iam";
```

No se otorgan permisos para crear/borrar tablas ni modificar schema_migrations.
La aplicación aplica la autorización por usuario en sus rutas, como en la versión local.

Crear una clave JSON de esa cuenta de servicio para este prototipo. Guardarla
fuera del repositorio y cargarla únicamente en Render como **Secret File**.
No compartirla en el chat. No usar la sesión de Firebase CLI ni una clave de
administrador para ejecutar el servidor. Si la organización bloquea claves de
cuentas de servicio, se necesita configurar federación de identidades antes de continuar.

## 2. Crear el Web Service

En Render: **New → Web Service**, conectar el repositorio privado de GitHub.
Permitir a Render acceder a `GonzaloAPU/gymbro` si no aparece en la lista.

| Campo | Valor |
| --- | --- |
| Nombre | `gymbro-api` |
| Rama | `render` |
| Runtime | Node |
| Root Directory | Vacío: usar la raíz del repositorio |
| Build Command | `npm ci --omit=dev --workspace backend` |
| Start Command | `npm run start --workspace backend` |
| Instance Type | Free para el prototipo |
| Health Check Path | `/api/health` |

También se incluye `render.yaml` para quien prefiera crear un Blueprint.
El Blueprint no contiene el archivo secreto; hay que cargarlo en Render.
No configurar un comando de migración automático.

## 3. Variables y archivo secreto

| Variable | Valor |
| --- | --- |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `DB_CONNECTION_MODE` | `CLOUD_SQL` |
| `CLOUD_SQL_INSTANCE` | `gymbro-569e3:southamerica-east1:gymbro-569e3-instance` |
| `DB_NAME` | `gymbro-569e3-database` |
| `DB_USER` | `gymbro-render@gymbro-569e3.iam` |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/google-service-account.json` |
| `FRONTEND_URL` | `https://localhost` |
| `GEMINI_ENABLED` | `false` |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 caracteres |

Para generar JWT_SECRET localmente: `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
El Blueprint puede generarlo automáticamente. No usar el ejemplo de desarrollo.

En **Environment → Secret Files**, agregar `google-service-account.json` y pegar
el JSON descargado. Render lo monta en `/etc/secrets/google-service-account.json`.
No configurar DATABASE_URL, DB_PASSWORD ni direcciones IP autorizadas abiertas:
este modo usa el transporte cifrado del conector y autenticación IAM.

## 4. Desplegar y verificar

Completar la identidad y los secretos antes de desplegar. El proceso comprueba
la base antes de abrir HTTP. Si las credenciales o los permisos fallan, el deploy
no se anuncia como saludable. El mensaje de arranque esperado es
`SmartGymBro API lista en puerto ...`.

Abrir `https://<servicio>.onrender.com/api/health`: debe devolver
`{"status":"ok","service":"smartgymbro-api"}`. Después probar un inicio de sesión
desde el APK apuntando a `https://<servicio>.onrender.com`, usando la pantalla
Conexión. Comprobar rutinas y perfil, y crear una rutina de prueba.

Render Free puede suspenderse por inactividad; la primera petición posterior
puede tardar. La cola local del APK no convierte el servidor en un servicio siempre activo.

## Estado de verificación

Se verifican con pruebas las opciones locales, los campos obligatorios de nube,
la inyección del stream en Sequelize y el rechazo de errores IAM sin conexión
directa alternativa. El arranque contra Google desde Render requiere la cuenta
de servicio y una verificación real después del deploy. Esta preparación no crea
la cuenta de servicio, su clave ni el servicio Render por cuenta del usuario.

Fuentes: [conector oficial](https://github.com/GoogleCloudPlatform/cloud-sql-nodejs-connector),
[secretos de Render](https://render.com/docs/configure-environment-variables),
[despliegue de Express](https://render.com/docs/deploy-node-express-app).
