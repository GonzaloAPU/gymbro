/**
 * Prueba aislada de SQL Connect: crea ejercicio, rutina, relación y horario en el emulador local, verifica las respuestas y limpia sus registros al terminar. No apunta a Google Cloud.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Endpoint demo fijo: este script no puede apuntar a un proyecto de pago en la nube.
const endpoint = 'http://127.0.0.1:9399/v1/projects/demo-gymbro-local/locations/us-central1/services/gymbro-local:executeGraphql';
/** Envía GraphQL al endpoint fijo del emulador y comprueba tanto HTTP como los errores devueltos por GraphQL. */
async function graphql(query) {
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }), signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.ok(response.ok, JSON.stringify(result));
  assert.equal(result.errors?.length ?? 0, 0, JSON.stringify(result.errors));
  return result.data;
}
const exerciseId = randomUUID();
const routineId = randomUUID();
try {
  await graphql(`mutation { exercise_insert(data: {id: "${exerciseId}", name: "Press banca prueba", muscleGroup: "Pecho", equipment: "Barra", trainingType: "Fuerza"}) }`);
  await graphql(`mutation { routine_insert(data: {id: "${routineId}", name: "Rutina local de prueba", goal: "Fuerza"}) }`);
  await graphql(`mutation { routineItem_insert(data: {routineId: "${routineId}", exerciseId: "${exerciseId}", position: 1, sets: 4, minReps: 6, maxReps: 8}) }`);
  await graphql(`mutation { routineSchedule_insert(data: {routineId: "${routineId}", weekday: 1, start: "18:00", end: "19:00"}) }`);
  const data = await graphql(`query { routines(where: {id: {eq: "${routineId}"}}) { name routineItems_on_routine { sets exercise { name } } routineSchedules_on_routine { weekday start end } } }`);
  assert.equal(data.routines.length, 1);
  const routine = data.routines[0];
  assert.equal(routine.routineItems_on_routine[0].exercise.name, 'Press banca prueba');
  assert.equal(routine.routineItems_on_routine[0].sets, 4);
  assert.deepEqual(routine.routineSchedules_on_routine[0], { weekday: 1, start: '18:00', end: '19:00' });
  console.log('SQL Connect local OK: ejercicio, rutina, relación y horario guardados y consultados.');
} finally {
  await graphql(`mutation { routine_delete(key: {id: "${routineId}"}) }`);
  await graphql(`mutation { exercise_delete(key: {id: "${exerciseId}"}) }`);
}
