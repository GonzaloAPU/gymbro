/**
 * Prueba automatizada del backend: prepara dependencias o datos simulados, ejecuta una operación y usa assert para comprobar el comportamiento. No forma parte del servidor que usa el usuario.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";

test("health endpoint responds without database access", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "smartgymbro-api" });
});
