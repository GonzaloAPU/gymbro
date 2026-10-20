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

`schemaValidation: COMPATIBLE` evita que el esquema GraphQL exija borrar las tablas
que no describe. No cambiar a STRICT en esta configuración.

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
node --use-system-ca tools/cloud-postgres.cjs --verify
```

La herramienta reutiliza módulos de `firebase-tools` instalados en el proyecto;
puede necesitar adaptación si cambia su API interna en una actualización de la CLI.
No guardar tokens de la CLI dentro del repositorio.

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
- [Conexión desde Cloud Run](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Precios de Cloud Run](https://cloud.google.com/run/pricing)
- [Límites de Render Free](https://render.com/docs/free)
- [Planes de Railway](https://docs.railway.com/pricing/plans)
- [Facturación y uso en Railway](https://docs.railway.com/pricing/faqs)
