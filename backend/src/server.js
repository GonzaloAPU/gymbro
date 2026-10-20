/**
 * Punto de entrada del backend: abre el puerto HTTP y libera la conexión a la base al recibir una señal de cierre. Importar app.js por sí solo no inicia un servidor.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";

const server = app.listen(config.port, () => {
  console.log(`SmartGymBro API listening on http://localhost:${config.port}`);
});

/** Cierra el servidor HTTP y el pool de conexiones al terminar el proceso. */
async function shutdown() {
  server.close();
  await sequelize.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
