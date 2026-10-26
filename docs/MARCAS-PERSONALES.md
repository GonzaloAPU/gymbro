# Marcas personales y ranking

«Mejores marcas» se calcula directamente desde las series de fuerza de sesiones completadas de la cuenta. La tabla `strength_records` no era actualizada por el cierre de sesión, por lo que consultarla dejaba la tarjeta vacía aunque hubiera volumen y entrenamientos completados.

El resumen ahora selecciona una serie por ejercicio: mayor carga, más repeticiones en empate y primera fecha para empates exactos. Devuelve hasta ocho ejercicios. Se usa el historial completo, no solo las doce sesiones recientes. Solo cuentan peso y repeticiones positivos; se excluyen sesiones sin finalizar, registros anulados y datos de otros usuarios. Los ejercicios propios o archivados conservan sus marcas personales históricas.

No se insertan registros duplicados ni se requiere backfill o migración. La API obtiene las marcas de sesiones que ya estaban guardadas. La tabla antigua se conserva sin borrar sus filas. El campo estimado de 1RM se mantiene por compatibilidad del contrato, pero la tarjeta compara la carga real, no esa estimación.

El ranking público tiene condiciones distintas: participación voluntaria, ejercicios oficiales, sesiones completadas y las categorías de barra admitidas (banca, sentadilla, peso muerto convencional y rumano por separado). No se activa el permiso de publicación automáticamente ni se mezclan variantes con mancuernas o peso corporal. La pantalla informa cuando la participación está desactivada.

Pruebas: `node --test tools/personal-records-sql.test.mjs` ejecuta SQL real en PostgreSQL embebido para comprobar selección de marcas, empates, propietarios, registros anulados y ejercicios archivados. Está incluido en `npm run supabase:test`. Las rutas del resumen tienen pruebas adicionales y `tools/verify-profile-flow.cjs` comprueba que la interfaz priorice la carga real.
