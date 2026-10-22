# Casa, parque y carrera

El catálogo oficial contiene 190 ejercicios. La primera ampliación incorporó 26 y la segunda 50 para casa, parque, bandas elásticas, barras, cuerda y carrera. Bird dog, Dead bug y Saltar cuerda reutilizan sus entradas existentes.

En Crear rutina aparecen cuatro propuestas editables: Casa sin equipo, Parque con banco y barra, Trote y técnica de carrera y Circuito con cuerda. Se resuelven usando los identificadores oficiales recibidos del backend. No se crean rutinas en la cuenta hasta pulsar Guardar mi rutina, ni se reemplaza un borrador con ejercicios.

Las propuestas son puntos de partida generales; no reemplazan la evaluación personalizada de bienvenida. El usuario puede modificar ejercicios, series, minutos e intensidad y asignar días después de guardarlas.

Los bloques de cardio usan targetDurationMinutes para configurar su reloj, con el límite actual de una hora por bloque. El historial muestra su duración. Por compatibilidad con performed_sets se registra peso 0 y una repetición técnica que representa un bloque, sin mostrar kilos ni repeticiones en la ficha del historial. El usuario finaliza el bloque manualmente, igual que las otras series.

Para actualizar otra instalación de PostgreSQL ejecutar `npm run db:seed:exercises --workspace backend`. La precarga es incremental y no altera sesiones, rutinas ni ejercicios personales. Repetirla no duplica ejercicios.
