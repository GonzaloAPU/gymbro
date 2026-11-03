/** Aplica versiones de esquema en transacción; no usa alter ni force, ni recrea tablas existentes. */
import 'dotenv/config';
import { sequelize } from '../src/db.js';
import { migrateOfflineSessions } from './migrations/20261020-offline-sessions.js';
import { normalizeSchema } from './migrations/20261020-normalize.js';
import { migrateWelcome } from './migrations/20261021-welcome.js';
import {migrateSoftDelete} from './migrations/20261022-soft-delete.js';
import {migrateLegal} from './migrations/20261022-legal.js';
import {migratePasswordRecovery} from './migrations/20261025-password-recovery.js';
import {migrateExerciseGuides} from './migrations/20261025-exercise-guides.js';
import {migrateAiQuota} from './migrations/20261026-ai-quota.js';
try {
 await sequelize.authenticate();
 await normalizeSchema();
 await migrateOfflineSessions();
 await migrateWelcome();
 await migrateSoftDelete();
 await migrateLegal();
 await migratePasswordRecovery();
 await migrateExerciseGuides();
 await migrateAiQuota();
 console.log('Migraciones verificadas: esquema normalizado.');
} finally { await sequelize.close(); }
