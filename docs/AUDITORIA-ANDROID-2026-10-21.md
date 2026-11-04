# Auditoría y limpieza para Android · 21/10/2026

El producto se distribuye como APK con la interfaz Angular instalada dentro de Capacitor. No necesita publicar el frontend como un sitio web. DOM, CSS, canvas, rutas y almacenamiento local siguen siendo parte de esta arquitectura y no deben eliminarse por considerarlos web.

## Limpieza aplicada

- Retiradas 138 reglas CSS sin referencias en los componentes: tarjetas antiguas del perfil en Inicio, gráficos reemplazados, selector de días anterior y controles/tablas de entrenamiento retirados.
- Ingreso y registro centrados en el formulario, sin columnas promocionales de escritorio, métricas demo ni botón con credenciales públicas. Se retiró el indicador de tres pasos que no representaba el flujo vigente.
- Eliminada la navegación superior duplicada de escritorio. La navegación inferior sirve también para tablets; se conserva el acceso flotante a Entrenar.
- Retirados cinco tests de creación de servicios sin runner configurado. El comando de pruebas de interfaz ahora ejecuta nueve verificaciones existentes de comportamiento; el comando raíz ejecuta backend e interfaz.
- Activadas las comprobaciones TypeScript de declaraciones y parámetros sin uso. Los efectos que mantienen alarmas y respaldo se registran en los constructores, sin referencias privadas innecesarias; conservan su ciclo de vida de Angular.
- Retirada la configuración opcional de Google Services del proyecto Android: las alarmas actuales son locales y no requieren notificaciones push remotas.
- Retirado el test Android de ejemplo de Capacitor que no verificaba Gymbro. No se presenta como cobertura nativa.
- Desactivada la telemetría del CLI Angular y actualizada la documentación de JDK 21, perfil, pruebas, recuperación y alarmas.

## Partes conservadas y motivo

- El servidor Express/PostgreSQL: una APK sigue necesitando API para autenticación y datos compartidos.
- La pantalla Conexión: el prototipo todavía necesita configurar el backend de pruebas. Cuando exista una dirección HTTPS definitiva podrá sustituirse por configuración de distribución.
- `ng serve` y el proxy: permiten desarrollar y revisar cambios en PC sin reinstalar el APK; no añaden un servidor al paquete Android.
- Semillas, migraciones, pruebas y herramientas: son infraestructura del proyecto, no código incluido en el bundle de la app. No se eliminaron datos, respaldos ni proyectos de base de datos.
- Diseños adaptables: Android también se usa en tablets y horizontal. No se fijó toda la interfaz a un único ancho de teléfono.
- Respaldo local, cola offline y alarmas: funciones vigentes con verificaciones de recuperación y aislamiento por cuenta/servidor.

## Alcance y pendientes de distribución

La revisión combina referencias estáticas, comprobación de tipos, verificaciones de comportamiento y compilación. No sustituye una auditoría de seguridad exhaustiva ni pruebas instrumentadas en un dispositivo real.

- El APK sigue siendo debug. Faltan firma release propia y preparación de distribución.
- Configurar un backend HTTPS definitivo y un `JWT_SECRET` fuerte; `backend/src/config.js` aún tiene un valor por defecto de desarrollo y no debe desplegarse con él.
- Las credenciales se mantienen en el almacenamiento local actual. Evaluar almacenamiento protegido de tokens antes de una distribución pública.
- Validar físicamente permisos, Doze, botón Atrás, teclado y selector de fotos. No hay una suite instrumentada nativa propia todavía.
- La generación de planes mediante IA continúa en análisis; esta limpieza no agrega llamadas a proveedores ni envía perfiles.

## Resultados de verificación

- `npm run typecheck`: correcto con detección de declaraciones y parámetros sin uso.
- `npm test`: 80 pruebas backend aprobadas y nueve verificaciones de interfaz aprobadas.
- Build Angular de producción: correcto. Paquete inicial de 491,58 kB, frente a 508,21 kB antes de la limpieza (aproximadamente 3,3 % menos). Es el bundle inicial, no el tamaño total del APK.
- APK debug: generado correctamente. Gradle presentó errores al mover archivos temporales de su caché; la compilación se completó usando `assembleDebug --no-daemon --no-watch-fs --max-workers=1`, con JDK 21 y el SDK configurados. No se comprobó en un teléfono físico.

## Ampliación de pruebas posterior a la limpieza

Se agregaron y ejecutaron 50 casos: 25 de backend (validación de pesajes, autorización,
aislamiento de consultas del resumen y respuesta de rankings) y 25 de frontend
(direcciones de conexión, cambio de día/semana/año, asignaciones independientes,
identificadores de alarmas y archivos de sonido de tres segundos).

`npm test` terminó correctamente: 105 pruebas backend, las nueve verificaciones
previas de interfaz y los 25 casos nuevos frontend. Los modelos y servicios externos
se simulan; no es una prueba de concurrencia real de PostgreSQL ni de entrega de
notificaciones en el teléfono. No se cambió código funcional de la APK.

## Segunda ampliación: 50 casos adicionales de frontend

Se agregaron 20 casos del constructor de rutinas, 12 de ingreso y registro, ocho
de edición de perfil y diez de errores y recursos de fotos. Detectaron dos envíos
duplicados posibles en ingreso/registro: ambos formularios ahora rechazan un segundo
envío mientras esperan al servidor. La suite de interfaz incluye las nueve
verificaciones originales y 75 casos individuales adicionales. Se usan servicios,
canvas e imágenes simulados, sin sustituir pruebas visuales o de teclado en Android.
