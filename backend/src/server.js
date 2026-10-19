import { app } from "./app.js";
import { config } from "./config.js";
import { sequelize } from "./db.js";

const server = app.listen(config.port, () => {
  console.log(`SmartGymBro API listening on http://localhost:${config.port}`);
});

async function shutdown() {
  server.close();
  await sequelize.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
