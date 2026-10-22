/** Aplica versiones de esquema en transacción; no usa alter ni force, ni recrea tablas existentes. */
import 'dotenv/config';
import { sequelize } from '../src/db.js';
import { migrateOfflineSessions } from './migrations/20261020-offline-sessions.js';
import { normalizeSchema } from './migrations/20261020-normalize.js';
import { migrateWelcome } from './migrations/20261021-welcome.js';
try {
 await sequelize.authenticate();
 await normalizeSchema();
 await migrateOfflineSessions();
 await migrateWelcome();
 console.log('Migraciones verificadas: esquema normalizado.');
} finally { await sequelize.close(); }
