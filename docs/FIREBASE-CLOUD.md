# Gymbro: PostgreSQL en Firebase SQL Connect

## Destino real

- Rama: `prototype-firebase`.
- Proyecto: `gymbro-569e3` (Gymbro).
- Plan: Spark, prueba de Cloud SQL sin activar facturación.
- Región: `southamerica-east1` (São Paulo).
- Servicio SQL Connect: `gymbro-569e3-service`.
- Instancia: `gymbro-569e3-instance`.
- Base: `gymbro-569e3-database`.
- Conexión de instancia: `gymbro-569e3:southamerica-east1:gymbro-569e3-instance`.
- La consola indica que debe actualizarse el plan antes del **17 de enero de 2027**
  para evitar el archivado de la prueba.

## Resultado de la migración

La instancia está RUNNABLE. Se copiaron y verificaron las once tablas completas:

| Tabla | Filas |
| --- | ---: |
| users | 6 |
| exercises | 7 |
| routines | 8 |
| routine_days | 15 |
| routine_exercises | 45 |
| routine_schedules | 2 |
| training_sessions | 101 |
| performed_exercises | 273 |
| performed_sets | 960 |
| body_weight_histories | 42 |
| strength_records | 31 |

El respaldo utilizado se encuentra en
`backups/firebase-migration-2026-10-20T00-56-56-209Z/`. El nombre contiene la hora UTC;
el despliegue se realizó el 19 de octubre de 2026 en Argentina.
Una comprobación posterior en otra conexión confirmó la persistencia y la igualdad
del contenido. Las cantidades describen esa instantánea, no son métricas fijas.

## Conexión HTTPS utilizada en esta PC

AVG sustituye el certificado del socket del conector por uno emitido como
`AVG Web/Mail Shield Untrusted Root`. El conector lo rechaza correctamente.
No se desactivaron el antivirus ni las verificaciones de TLS para continuar.

Se habilitó la **Cloud SQL Data API** y se utilizó su endpoint HTTPS oficial con
autenticación IAM. Fue necesario conservar las mayúsculas del identificador de
cuenta devuelto por Google para que esa API autenticara correctamente al propietario.
Los roles de SQL Connect se configuraron para la misma cuenta y su agente de servicio.
No se crearon claves JSON de cuentas de servicio ni contraseñas de ejecución.

El script efectivo de migración es `tools/cloud-sql-https.cjs`:

```powershell
# Consulta las tablas, sin escribir.
npm.cmd run firebase:cloud:tables
# Compara todas las tablas con una instantánea del PostgreSQL local.
npm.cmd run firebase:cloud:verify
```

Los modos `--setup` y `--clone` se usaron una sola vez sobre el destino vacío.
Ahora rechazan un destino que ya contiene tablas. Cada importación se envía como
una única transacción, con una comprobación del contenido antes del COMMIT.
La API limita cada solicitud a 0,5 MB: se agruparon las inserciones del dump y el
script comprueba el tamaño antes de enviarlo. No se usa como capa de datos habitual
del backend; es una herramienta administrativa para esta migración pequeña.

## Separación del experimento local

`firebase.json` y `dataconnect/` conservan la prueba local. La configuración de nube
es `firebase.cloud.json` y `dataconnect-cloud/`. `.firebaserc` conserva el proyecto
demo como predeterminado y agrega el alias `cloud`. Los comandos de nube indican
el proyecto explícitamente para evitar confusiones.

No se cambia `backend/.env` automáticamente. Crear la base en Cloud SQL y desplegar
el backend son pasos distintos. La web sigue utilizando el backend y la conexión
configurados hasta que se haga ese cambio de forma explícita.

## Estrategia de compatibilidad

La base de la aplicación tiene once tablas Sequelize. Se copia su estructura SQL
completa, incluidos tipos numéricos, JSON, horas, claves y restricciones. Así se
conserva el formato de datos esperado por el backend actual.

SQL Connect describe inicialmente solo `exercises`, con los nombres de columnas
existentes. No se exponen usuarios, hashes de contraseña, fotografías ni historiales
mediante operaciones cliente. `ListExercises` usa `NO_ACCESS`, por lo que requiere
acceso administrativo autenticado. Esto no sustituye la autorización del backend.

Las tablas se administran con Sequelize, no con migraciones de SQL Connect.
Se utiliza `schemaValidation: NONE` en la API al publicar la interfaz GraphQL sobre la base
importada. La prueba con COMPATIBLE pidió eliminar el enum existente de estados
de sesiones, por lo que no se aplicó esa migración. NONE no cambia la autenticación:
el conector conserva NO_ACCESS. La publicación comprueba las once tablas por
separado y luego ejecuta una consulta real del catálogo. No cambiar a STRICT ni
aplicar automáticamente las migraciones sugeridas por SQL Connect. La CLI solo
admite STRICT/COMPATIBLE en YAML; por eso el archivo omite ese campo y el script
de publicación establece NONE explícitamente en la solicitud a la API.

La interfaz del catálogo y el conector `admin` ya fueron publicados y se consultaron
los siete ejercicios. El resto de las tablas está en PostgreSQL, aunque no aparezca
en el explorador GraphQL de SQL Connect. La aplicación continúa usando su API Express.

## Operaciones

Desde la raíz del repositorio, usando la cuenta propietaria autorizada en Firebase CLI:

```powershell
node --use-system-ca tools/cloud-postgres.cjs --status
node --use-system-ca node_modules/firebase-tools/lib/bin/firebase.js dataconnect:compile --config firebase.cloud.json --project gymbro-569e3 --non-interactive
```

También están disponibles `npm run firebase:cloud:status`,
`npm run firebase:cloud:compile` y `npm run firebase:cloud:verify`.

Después de que la instancia esté RUNNABLE, la configuración inicial de permisos es:

```powershell
node --use-system-ca node_modules/firebase-tools/lib/bin/firebase.js dataconnect:sql:setup --config firebase.cloud.json --project gymbro-569e3 --non-interactive
```

Solo sobre un destino vacío, la copia es:

```powershell
node --use-system-ca tools/cloud-postgres.cjs --clone
```

El script comprueba el destino, abre una instantánea de lectura del PostgreSQL
local y genera un dump SQL con INSERT. Guarda el respaldo y su SHA-256 dentro de
`backups/firebase-migration-*`, que está ignorado por Git. Esos respaldos contienen
datos de cuentas y no deben publicarse en el repositorio.

`node --use-system-ca tools/cloud-postgres.cjs --backup` permite respaldar solo el
origen, incluso mientras se aprovisiona Cloud SQL. La restauración local de prueba
se ejecuta con `node tools/verify-cloud-backup.cjs backups/<carpeta-del-respaldo>`.
Esta última crea y elimina una base temporal propia y no modifica smartgymbro.

La restauración se realiza en una transacción y se compara cantidad y huella del
contenido de cada tabla antes de confirmar. Si encuentra tablas en destino o una
diferencia de contenido, rechaza la operación; no borra tablas para continuar.

Una verificación posterior de solo lectura es:

```powershell
node --use-system-ca tools/cloud-sql-https.cjs --verify
```

La herramienta reutiliza módulos de `firebase-tools` instalados en el proyecto;
puede necesitar adaptación si cambia su API interna en una actualización de la CLI.
No guardar tokens de la CLI dentro del repositorio.

En esta PC se publica con:

```powershell
npm.cmd run firebase:cloud:compile
node --use-system-ca tools/publish-cloud-schema.cjs
```

El segundo comando valida la igualdad de las tablas, publica esquema y conector
por HTTPS y consulta el catálogo. El comando genérico `firebase deploy --only
dataconnect` intenta inspeccionar la base por el socket interceptado por AVG y falla
en esta máquina; no es necesario desactivar certificados para publicar.

## Próximo paso: backend

La base admite el backend Express/Sequelize existente. Para una conexión de servidor
se debe usar el conector de Cloud SQL o Auth Proxy y una identidad con permisos
limitados. No publicar PostgreSQL a cualquier IP ni distribuir credenciales SQL
en Angular. Las credenciales administrativas de migración no son las de ejecución.

| Opción | Ventaja para Gymbro | Costo o límite relevante |
| --- | --- | --- |
| Google Cloud Run, en São Paulo | Misma región que Cloud SQL y conexión administrada; permite conservar Express | Requiere facturación habilitada y cobra uso fuera de las cuotas gratuitas |
| Render | Publicación sencilla desde GitHub con Node | El servicio web gratuito duerme tras 15 minutos sin tráfico; el arranque siguiente puede tardar aproximadamente un minuto |
| Railway | Publicación sencilla del backend y variables de entorno | Hobby cuesta USD 5/mes e incluye USD 5 de uso; el exceso se cobra aparte |
| Servidor Windows propio | Aprovecha el equipo disponible | Hay que mantener proceso, HTTPS, túnel, actualizaciones y copias; depende de electricidad y conexión doméstica |

Con Cloud SQL, Cloud Run en la misma región es la opción de integración más directa.
Antes de habilitarlo hay que evaluar el efecto de pasar este proyecto Spark a Blaze:
la documentación de SQL Connect indica que la instancia Spark pasa a una instancia
Cloud SQL de pago al actualizar el plan. La cuota gratuita de Cloud Run no convierte
Cloud SQL en una base gratuita permanente.

## Fuentes consultadas

- [Precios y prueba Spark de SQL Connect](https://firebase.google.com/docs/sql-connect/pricing)
- [Administración de servicios y bases](https://firebase.google.com/docs/sql-connect/manage-services-and-databases)
- [Cloud SQL Data API](https://docs.cloud.google.com/sql/docs/postgres/executesql-instance)
- [Conexión desde Cloud Run](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Precios de Cloud Run](https://cloud.google.com/run/pricing)
- [Límites de Render Free](https://render.com/docs/free)
- [Planes de Railway](https://docs.railway.com/pricing/plans)
- [Facturación y uso en Railway](https://docs.railway.com/pricing/faqs)
