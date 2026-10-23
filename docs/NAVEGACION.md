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

## Caché de lectura

`read-cache.interceptor.ts`, antes del interceptor de autenticación, reutiliza solo
respuestas JSON correctas de rutas conocidas. La caché está **en memoria**, con un máximo
de 100 entradas, aislada por sesión y servidor. Se vacía al cambiar de sesión/servidor
en la próxima solicitud. No crea una copia persistente de la base ni sustituye a Supabase.
Al cerrar el proceso se pierde esta caché; el respaldo y la cola offline del entrenamiento
siguen usando el mecanismo existente, separado de estas lecturas.

| Datos | Vigencia máxima |
|---|---|
| Perfil y rutinas | 60 segundos |
| Catálogo de ejercicios | 5 minutos |
| Resumen de progreso | 30 segundos |
| Ranking | 15 segundos |
| Estado de permisos | 30 segundos |
| Estado de bienvenida | 60 segundos |

Al vencer una entrada, la siguiente consulta va al servidor. No hay actualización
en segundo plano ni persistencia IndexedDB en esta etapa. Los cambios hechos en otro
dispositivo pueden tardar hasta esa vigencia en aparecer.

Una escritura invalida antes y después las lecturas afectadas: horarios y favoritos
invalidan rutinas; series invalidan progreso; peso invalida perfil/progreso; consentimientos
invalidan permisos, perfil y ranking. No se cachean escrituras ni errores. Las solicitudes
simultáneas iguales comparten la red y una respuesta anterior a una edición no vuelve a
llenar la caché. Cada consumidor recibe su propia copia para no alterar los datos ajenos.

El backend mantiene la validación de cuenta y consentimiento en cada operación;
la caché de permisos solo acelera la navegación. El primer acceso aún depende de la red
y de que Render esté activo: no se promete eliminar su tiempo de arranque.

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
