# Prueba local de Firebase SQL Connect

Rama: `codex/firebase-sql-prototype`.
Base recuperable: `master`, etiqueta `backup/pre-firebase-2026-10-19`, commit `5ec110d`.
El directorio local `backups/` contiene el ZIP del proyecto, la exportación PostgreSQL,
el bundle de Git y las instrucciones de restauración.

## Alcance

Esta rama prepara un experimento local de SQL Connect sobre PostgreSQL/PGlite.
No es una migración completa de Gymbro. El backend Express/Sequelize y su base
PostgreSQL continúan disponibles. El experimento usa datos ficticios separados.
Permite evaluar catálogo de ejercicios, rutinas, relaciones y asignación de horarios.

## Servicios

- Proyecto ficticio: `demo-gymbro-local`. No corresponde a un proyecto de Google Cloud.
- Emulador SQL Connect: `127.0.0.1:9399`.
- PostgreSQL interno del emulador: `127.0.0.1:55432`, separado de PostgreSQL de Gymbro.
- Esquema: `dataconnect/schema/schema.gql`.
- No hay despliegues ni activación de Blaze ni instancias Cloud SQL de pago.
- Las operaciones del conector están cerradas con `NO_ACCESS`; no publicar la API
  administrativa local ni tratar esta prueba como un sistema de permisos terminado.

## Inicio

Instalar las dependencias con `npm.cmd install`, y ejecutar:

```powershell
npm.cmd run firebase:emulators
```

La CLI descarga el emulador la primera vez. No requiere Java para SQL Connect,
pero sí conexión para descargar sus binarios. No se debe deshabilitar la validación
TLS si la red presenta problemas de certificados.

En otra terminal, ejecutar `npm.cmd run firebase:test`. La prueba inserta un
ejercicio, una rutina, una relación y un horario; consulta las relaciones y elimina
sus datos de prueba al finalizar. Validada correctamente en esta rama.

El emulador exporta sus datos a `.firebase/local-data` al salir con Ctrl+C y los
importa al volver a iniciar. El primer arranque puede avisar que no existe una
exportación todavía. No cerrar la terminal a la fuerza si se quiere exportar.
Esta carpeta está ignorada por Git. La prueba automática limpia sus propios datos.

No hay una nueva interfaz ni un cambio del frontend: se prueba la capa de datos.
Para probar la aplicación existente, se mantienen sus comandos habituales.

## Volver al código original

Guardar primero cualquier cambio pendiente de la rama experimental y ejecutar
`git switch master`. Los datos actuales de PostgreSQL no son modificados por el
emulador. La instalación local de herramientas y los respaldos ignorados por Git
permanecen en disco al cambiar de rama.

## Antes de una migración completa

Hay que evaluar identidad/autorización, transacciones, restricciones de horarios,
registros de entrenamientos, rankings y equivalencias del esquema. No importar
contraseñas ni perfiles reales al experimento. Desplegar Cloud SQL requiere una
decisión independiente sobre el proyecto y los costos.

Documentación oficial:
https://firebase.google.com/docs/sql-connect/data-connect-emulator-suite
https://firebase.google.com/docs/sql-connect/configuration-reference
