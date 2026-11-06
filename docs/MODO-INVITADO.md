# Entrenamiento sin cuenta

La entrada principal y /entrenamiento muestran el formulario local cuando no hay una cuenta iniciada. /entrenar-libre permite abrirlo directamente. Las pantallas privadas conservan sus guardas y la API mantiene la autenticación.

El formulario permite elegir grupos musculares, lugar, equipamiento, experiencia y tiempo disponible. Genera al menos cuatro ejercicios distintos, tres series por ejercicio y seis ejercicios desde 60 minutos, si el catálogo permite esa combinación. Si falta equipamiento o variedad suficiente informa qué debe cambiarse. El tiempo disponible orienta la cantidad; no promete una duración exacta.

Se utiliza el catálogo oficial incluido en la compilación, con sus descripciones y enlaces a videos. Actualizarlo con `node tools/build-guest-catalog.mjs` cuando cambien los datos de backend/src/data. Los identificadores locales son estables por nombre y no corresponden a filas de Supabase. No se descarga ni se guarda ningún video.

Los reemplazos conservan el grupo elegido y el equipamiento disponible, evitan duplicados y se bloquean durante series, descansos y rondas encadenadas. Los ejercicios con series registradas no se sustituyen para proteger esos datos.

La misma pantalla WorkoutComponent controla cronómetros, pausas, descansos, edición de series, repeticiones y finalización. Solo en esta ruta se sustituyen sus servicios de rutinas y persistencia por proveedores locales. No hay peticiones a Gemini ni a la API de entrenamientos.

La clave gymbro.guest.workout.v1 conserva un único entrenamiento, su estado y las acciones pendientes de reflejar en el estado. Recargar recupera relojes y series. Preparar otro entrenamiento requiere confirmar que reemplaza el actual; no se acumula historial. No se mezclan estos datos con una cuenta ni se importan automáticamente al registrarse. Crear una cuenta permite llevar el historial de los entrenamientos que se registren con esa cuenta.

El registro local requiere almacenamiento habilitado. Si falla, no se confirma la serie. Un respaldo dañado se conserva y se ofrece borrarlo explícitamente. Borrar datos del navegador o cambiar de dispositivo elimina este respaldo local. Los sonidos del invitado tienen su propio ámbito; las limitaciones de alarmas de la web siguen requiriendo mantener abierta la página.

No se modifican tablas ni endpoints. Esta función se publica con el frontend; el backend no necesita otro despliegue.
