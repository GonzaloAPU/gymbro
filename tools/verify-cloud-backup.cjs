/**
 * Prueba de restauración real en una base temporal del PostgreSQL LOCAL.
 * Compara las huellas con el manifest del respaldo y elimina solo la base creada
 * por esta ejecución. No conecta a Firebase ni modifica smartgymbro.
 */
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env'), quiet: true });

async function main() {
  const backup = path.resolve(process.argv[2] || '');
  const allowedRoot = path.resolve(__dirname, '../backups') + path.sep;
  assert.ok(backup.startsWith(allowedRoot), 'El respaldo debe estar dentro de backups/.');
  const manifest = JSON.parse(fs.readFileSync(path.join(backup, 'manifest.json'), 'utf8'));
  const dump = fs.readFileSync(path.join(backup, 'postgres.sql'), 'utf8');
  assert.equal(createHash('sha256').update(dump).digest('hex'), manifest.sha256);
  const source = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost', '127.0.0.1'].includes(source.hostname) && source.port === '5433');
  const temporaryName = 'gymbro_restore_check_' + randomUUID().replaceAll('-', '');
  assert.match(temporaryName, /^gymbro_restore_check_[a-f0-9]{32}$/);
  const admin = new Client({ connectionString: source.toString() });
  let destination, created = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${temporaryName}"`);
    created = true;
    source.pathname = '/' + temporaryName;
    destination = new Client({ connectionString: source.toString() });
    await destination.connect();
    await destination.query("SET TIME ZONE 'UTC'");
    await destination.query('BEGIN');
    const sql = dump.replace(/^\\(?:un)?restrict [A-Za-z0-9]+\r?\n/gm, '');
    assert.ok(!/^\\/m.test(sql));
    await destination.query(sql);
    for (const [table, expected] of Object.entries(manifest.tables)) {
      assert.match(table, /^[a-z_]+$/);
      const result = await destination.query(`SELECT count(*)::int AS rows,
        md5(COALESCE(string_agg(row_to_json(t)::text, E'\n' ORDER BY id), '')) AS digest
        FROM public."${table}" t`);
      assert.deepEqual(result.rows[0], expected, table);
    }
    await destination.query('COMMIT');
    console.log('OK: SHA-256, restauración y contenido de las 11 tablas verificados en PostgreSQL local.');
  } finally {
    if (destination) await destination.end();
    if (created) await admin.query(`DROP DATABASE "${temporaryName}"`);
    await admin.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
