# Navegación y fluidez

Las cuatro pestañas principales se recorren en círculo:
Inicio → Entrenar → Progreso → Perfil → Inicio. Deslizar a la izquierda avanza y
deslizar a la derecha retrocede; los botones inferiores siguen disponibles.

El panel sigue al dedo desde que se reconoce un movimiento horizontal de unos 10 px.
Se muestra el contenido real de la vista vecina; las cuatro vistas se preparan después
del primer acceso autorizado a una pestaña y se conservan, con su scroll independiente.
Preparar Entrenar no inicia una sesión ni un cronómetro.

Para confirmar se requiere aproximadamente el 22 % del ancho, con límites de 60–110 px,
o un gesto rápido de al menos 40 px en menos de 240 ms. Los arrastres lentos no tienen
límite de duración. Soltar antes del umbral, volver con el dedo o una cancelación hace
que el panel vuelva a su posición, sin navegar.

Se utilizan Pointer Events y captura del puntero para no perder el gesto al cruzar
elementos. Se permite comenzar sobre botones o enlaces: un arrastre bloquea el clic
posterior en fase de captura, mientras que un toque normal conserva su acción.
No actúa sobre inputs, selectores, campos editables, panel de alarmas, listas con
desplazamiento horizontal o pantallas secundarias. El scroll vertical y el multitouch
anulan el gesto. Los 12 px de cada borde se reservan para Android.
Perder el foco, bloquear la pantalla, cambiar la orientación o perder la captura del
puntero también devuelve el panel a su posición, para no quedar a medio camino.
En touch, la captura implícita del elemento tocado se transfiere al carrusel.
El `lostpointercapture` del hijo burbujea, pero se ignora: solo cancela una pérdida
real del propio viewport, comprobando además que ya no conserve la captura.
La prueba de regresión reproduce esa transferencia, además del arrastre con mouse.

Al completar o cancelar se acomoda la posición con una transición de 220 ms; durante
el arrastre no hay animación independiente, solo la posición del dedo. Se respeta la
preferencia de movimiento reducido del sistema para las transiciones automáticas.
Las vistas vecinas permanecen inertes y fuera del árbol accesible hasta que su ruta
ha sido autorizada y activada. Los formularios secundarios siguen fuera del carrusel.
El conjunto de paneles se identifica por la cuenta autorizada: cambiar de usuario
recrea sus vistas. Una respuesta tardía de perfil o edición de la sesión anterior
no puede reemplazar el perfil de la cuenta nueva ni reaparecer después de salir.

## Lecturas locales y actualización de fondo

Las rutinas (con sus ejercicios y horarios), el perfil, el catálogo consultado,
el resumen de progreso y el estado de bienvenida se conservan en IndexedDB.
La clave incluye origen del servidor y cuenta, sin guardar tokens ni contraseñas.
Al volver a abrir la app se entrega primero esa copia; si venció su vigencia,
se consulta al servidor en segundo plano. Un fallo de red conserva los datos
anteriores y no sustituye una pantalla útil por un error de sincronización.

Las consultas simultáneas iguales comparten la red. Perfil, rutinas y bienvenida
se renuevan al vencer 60 segundos; catálogo, 5 minutos; progreso, 30 segundos.
Volver al primer plano renueva perfil y rutinas. Recuperar conexión renueva las
lecturas previamente utilizadas. El ranking usa solo caché en memoria de 15 segundos.
Los permisos usan un recibo confirmado de la versión legal actual, limitado a
7 días y separado por cuenta y servidor; su consulta de fondo no bloquea navegar.

Las respuestas confirmadas de horarios, favoritos, perfil, creación de rutinas
y ejercicios actualizan sus copias antes de volver a consultar. La invalidación
impide que una respuesta anterior a la edición repueble el respaldo.
Las series no provocan una consulta de progreso por cada registro: se renueva
al sincronizar la finalización. El entrenamiento conserva su cola durable,
identificadores estables y recuperación de relojes, separados de estas lecturas.

La pantalla inicial aparece mientras arranca Angular y se autoriza la primera
ruta; no introduce una espera artificial ni reaparece entre pestañas.
La primera descarga y el acceso con credenciales nuevas requieren servidor.
No se implementó una cola offline para editar el perfil, crear rutinas o registrar
peso: esas escrituras siguen esperando confirmación del backend.

Ver [PERSISTENCIA-LOCAL.md](PERSISTENCIA-LOCAL.md) para alcance y verificación.

## Entrenamiento oculto

El cronómetro se actualiza cada 16 ms mientras Entrenar está visible y cada 250 ms
cuando está oculto. La medición usa marcas temporales reales, por lo que cambiar de
pestaña no pausa, reinicia ni pierde tiempo. Al volver se actualiza inmediatamente.

## Verificación

`npm run test:frontend` cubre dirección circular, posición durante el arrastre,
cancelación, reversión, arrastres lentos, clics accidentales sobre botones,
recuperación de relojes, TTL, aislamiento, invalidación y solicitudes compartidas.
Probar también el gesto en el teléfono, especialmente con teclado abierto y navegación
de Android por gestos; las pruebas de lógica no sustituyen esa comprobación táctil.
