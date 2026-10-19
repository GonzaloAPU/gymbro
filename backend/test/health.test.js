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
