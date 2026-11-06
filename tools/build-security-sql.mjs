import fs from 'node:fs';
import {securitySchemaSql} from '../backend/src/services/security-schema.js';
fs.writeFileSync(new URL('../backend/sql/supabase/09-seguridad.sql',import.meta.url),`-- Aplicar como administrador ANTES del backend de seguridad. Repetible; no borra datos deportivos.\nBEGIN;\nSELECT pg_advisory_xact_lock(20261106);\n${securitySchemaSql('gymbro')}\nCOMMIT;\n`);
console.log('SQL 09 de seguridad generado.');
