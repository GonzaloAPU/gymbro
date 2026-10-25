# Persistencia local y arranque

## Experiencia

Gymbro abre las consultas guardadas en el dispositivo y las renueva cuando corresponde,
sin interrumpir el uso por fallos de red. El guardado del entrenamiento sigue siendo
local primero: series, relojes y cierre se conservan antes de intentar el envío.
No se muestran contadores de cambios pendientes, botones de sincronización ni estados
distintos por serie. Solo se muestran errores que requieren intervención: almacenamiento
sin espacio/dañado, acceso vencido o cambios rechazados por el servidor.

La pantalla «Preparando tu espacio…» cubre el arranque y la primera navegación.
No agrega un tiempo mínimo de espera, no contiene anuncios y no se activa entre pestañas.
Si falla la primera navegación, ofrece reintentar.

## Lecturas

IndexedDB (`gymbro-local-reads`, versión 1, almacén `reads`) conserva cuerpos JSON,
fecha de actualización, grupo y clave de consulta. El ámbito es servidor + ID de cuenta;
los tokens no forman parte de las claves persistentes. Cada consumidor recibe una copia.

| Consulta | Tiempo antes de renovar | Persistente |
|---|---|---|
| Perfil | 60 s | Sí |
| Rutinas con días, horarios y ejercicios | 60 s | Sí |
| Catálogo consultado | 5 min | Sí |
| Resumen de progreso | 30 s | Sí |
| Estado de bienvenida | 60 s | Sí |
| Ranking | 15 s | Solo memoria |

Vencer ese plazo no elimina los datos: se entregan inmediatamente y se consulta la red
en segundo plano. Las consultas iguales simultáneas comparten un envío. Una actualización
fallida conserva la copia y limita los reintentos de lectura a una vez cada 30 segundos
por consulta; recuperar conexión o volver al primer plano permite renovar sin esperar.
Al volver al primer plano se renuevan perfil y rutinas; al recuperar conexión se renuevan
las lecturas utilizadas durante la apertura actual.

Las respuestas confirmadas de perfil, horarios, favoritos, rutinas y ejercicios actualizan
sus respaldos. Las revisiones impiden que una consulta anterior a una escritura restituya
datos viejos. Los cambios de sesión descartan respuestas tardías para la interfaz y el disco.
La sincronización de series no renueva progreso por cada serie; se hace al confirmar el cierre.

Los permisos se conservan por separado, por cuenta/servidor y versión legal vigente,
durante un máximo de siete días. Un recibo confirmado permite navegar inmediatamente;
su revisión se hace en segundo plano. El servidor sigue autorizando todas las escrituras.

## Alcance y límites

- La primera descarga y el ingreso con credenciales nuevas requieren conexión.
- Las rutinas incluyen los datos de sus ejercicios: no se descarga todo el catálogo para entrenar.
- Se mantiene la cola existente del entrenamiento con reintentos automáticos e IDs estables.
- Editar perfil/horarios, crear rutinas y registrar peso aún requieren confirmación del servidor.
- No se cambió el código de gestos, captura de puntero ni desplazamiento del carrusel.
- En Android los archivos de la interfaz están incluidos en la APK. En una web normal, esta
  persistencia de datos no sustituye un service worker para descargar la interfaz sin conexión.
- Borrar los datos de la aplicación o desinstalarla puede eliminar los datos locales aún no enviados.

## Verificación

`npm run test:frontend` incluye recuperación tras cierre, fallos de red/disco, copia inmediata,
renovación de fondo incluso con `firstValueFrom`, deduplicación, aislamiento de cuentas y
servidores, respuestas tardías y persistencia de horarios confirmados. También conserva
las pruebas de recuperación de entrenamiento, idempotencia y gestos de la versión anterior.

Se comprobó además la compilación en el navegador con cuenta y API ficticias: descargar rutina,
simular respuestas 503 del backend, reabrir Inicio y Entrenar, registrar una serie sin servidor
y recargar conservando serie y relojes, sin mensajes de sincronización.
Queda comprobar el ciclo completo en un teléfono con la nueva APK.
