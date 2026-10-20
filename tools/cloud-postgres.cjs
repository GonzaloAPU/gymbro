/**
 * Copia la base PostgreSQL local al destino fijo de Gymbro en Google Cloud SQL.
 * Usa el conector oficial y la sesión autorizada de Firebase CLI; no imprime tokens.
 * --clone exige destino vacío, crea un respaldo y restaura todo en una transacción.
 * --status solo consulta aprovisionamiento; --wait espera a que esté lista;
 * --verify solo compara los datos; --backup respalda únicamente el origen local.
 * No cambia DATABASE_URL ni detiene el PostgreSQL local.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const cliRequire = createRequire(require.resolve('firebase-tools/package.json'));
const auth = cliRequire('./lib/auth');
const { requireAuth } = cliRequire('./lib/requireAuth');
const admin = cliRequire('./lib/gcp/cloudsql/cloudsqladmin');
const { getIAMUser } = cliRequire('./lib/gcp/cloudsql/connect');
const { FBToolsAuthClient } = cliRequire('./lib/gcp/cloudsql/fbToolsAuthClient');
const { Connector, IpAddressTypes, AuthTypes } = cliRequire('@google-cloud/cloud-sql-connector');
const { Client, Pool } = require('pg');
const PROJECT = 'gymbro-569e3';
const INSTANCE = 'gymbro-569e3-instance';
const DATABASE = 'gymbro-569e3-database';
const tables = ['users', 'exercises', 'routines', 'routine_days', 'routine_exercises',
  'routine_schedules', 'training_sessions', 'performed_exercises', 'performed_sets',
  'body_weight_histories', 'strength_records'];

/** Resume cada tabla con cantidad y huella del contenido; no devuelve datos personales. */
async function fingerprint(connection) {
  const result = {};
  for (const table of tables) {
    const response = await connection.query(`SELECT count(*)::int AS rows,
      md5(COALESCE(string_agg(row_to_json(t)::text, E'\n' ORDER BY id), '')) AS digest
      FROM public."${table}" t`);
    result[table] = response.rows[0];
  }
  return result;
}

/** Respalda una instantánea local. El caller conserva abierta la transacción de lectura. */
function exportSnapshot(snapshot, expected) {
  const dump = execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'pg_dump',
    '-U', 'smartgymbro', '-d', 'smartgymbro', '--no-owner', '--no-privileges',
    '--inserts', '--snapshot', snapshot], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (!dump.includes('PostgreSQL database dump complete')) throw Error('Dump incompleto.');
  const backup = path.join(root, 'backups', 'firebase-migration-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backup, { recursive: true });
  fs.writeFileSync(path.join(backup, 'postgres.sql'), dump);
  fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify({ project: PROJECT, database: DATABASE,
    sha256: createHash('sha256').update(dump).digest('hex'), tables: expected }, null, 2));
  // Las líneas restrict son instrucciones de psql; no son SQL para el driver pg.
  const sql = dump.replace(/^\\(?:un)?restrict [A-Za-z0-9]+\r?\n/gm, '');
  if (/^\\/m.test(sql)) throw Error('El dump contiene instrucciones psql no admitidas.');
  return { sql, backup };
}

async function localSnapshot() {
  require('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
  const source = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(source.hostname) || source.port !== '5433' || source.pathname !== '/smartgymbro') {
    throw Error('La base de origen debe ser smartgymbro en localhost:5433.');
  }
  const local = new Client({ connectionString: source.toString(), connectionTimeoutMillis: 10000 });
  try {
    await local.connect();
    await local.query("SET TIME ZONE 'UTC'");
    await local.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const snapshot = (await local.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
    return { local, snapshot, expected: await fingerprint(local) };
  } catch (error) { await local.end(); throw error; }
}

async function main() {
  const mode = process.argv[2];
  if (!['--status', '--wait', '--clone', '--verify', '--backup'].includes(mode)) throw Error('Usar --status, --wait, --backup, --clone o --verify.');
  if (mode === '--backup') {
    const { local, snapshot, expected } = await localSnapshot();
    try {
      const { backup } = exportSnapshot(snapshot, expected);
      await local.query('COMMIT');
      console.log(JSON.stringify({ backup, tables: Object.fromEntries(Object.entries(expected).map(([name, data]) => [name, data.rows])) }, null, 2));
    } finally { await local.end(); }
    return;
  }
  const account = auth.getProjectDefaultAccount(root);
  if (!account) throw Error('Primero ejecutar firebase login con la cuenta propietaria de Gymbro.');
  const options = { project: PROJECT, projectRoot: root, ...account };
  await requireAuth(options);
  let instance = await admin.getInstance(PROJECT, INSTANCE);
  if (mode === '--wait') {
    const deadline = Date.now() + 20 * 60 * 1000;
    while (instance.state === 'PENDING_CREATE' && Date.now() < deadline) {
      console.log('PostgreSQL: ' + instance.state);
      await new Promise(resolve => setTimeout(resolve, 30000));
      instance = await admin.getInstance(PROJECT, INSTANCE);
    }
    console.log('PostgreSQL: ' + instance.state);
    if (instance.state !== 'RUNNABLE') throw Error('El aprovisionamiento aún no terminó; no se cambia la configuración.');
    return;
  }
  console.log(JSON.stringify({ project: PROJECT, instance: INSTANCE, state: instance.state, region: instance.region, databaseVersion: instance.databaseVersion }));
  if (mode === '--status') return;
  if (instance.state !== 'RUNNABLE') throw Error('La instancia todavía no está lista; no se modifica ningún dato.');
  if (instance.region !== 'southamerica-east1') throw Error('La región no coincide con el destino esperado.');

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  let pool, cloud, local;
  try {
    const { user } = await getIAMUser(options);
    const connection = await connector.getOptions({ instanceConnectionName: instance.connectionName,
      ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
    pool = new Pool({ ...connection, user, database: DATABASE, connectionTimeoutMillis: 20000 });
    cloud = await pool.connect();
    await cloud.query("SET TIME ZONE 'UTC'");
    const target = await cloud.query('SELECT current_database() AS name');
    if (target.rows[0].name !== DATABASE) throw Error('Base de destino inesperada.');
    if (mode === '--clone') {
      const existing = await cloud.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
      if (existing.rows.length) throw Error('El destino ya tiene tablas. Se rechaza la restauración para no sobrescribir datos.');
    }
    // Mantiene la misma instantánea durante el dump y la comparación de huellas.
    const source = await localSnapshot();
    local = source.local;
    const { snapshot, expected } = source;
    let backup;
    if (mode === '--clone') {
      const exported = exportSnapshot(snapshot, expected);
      backup = exported.backup;
      const { sql } = exported;
      await cloud.query('BEGIN');
      await cloud.query(`SET LOCAL ROLE "firebaseowner_${DATABASE}_public"`);
      await cloud.query(sql);
      const actual = await fingerprint(cloud);
      for (const table of tables) {
        if (JSON.stringify(expected[table]) !== JSON.stringify(actual[table])) throw Error('Verificación diferente en ' + table);
      }
      await cloud.query('COMMIT');
    } else {
      await cloud.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const actual = await fingerprint(cloud);
      for (const table of tables) {
        if (JSON.stringify(expected[table]) !== JSON.stringify(actual[table])) throw Error('Verificación diferente en ' + table);
      }
      await cloud.query('COMMIT');
    }
    await local.query('COMMIT');
    console.log(JSON.stringify({ verified: true, tables: Object.fromEntries(Object.entries(expected).map(([name, data]) => [name, data.rows])), ...(backup ? { backup } : {}) }, null, 2));
  } catch (error) {
    if (cloud) await cloud.query('ROLLBACK').catch(() => {});
    if (local) await local.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    if (cloud) cloud.release();
    if (pool) await pool.end();
    connector.close();
    if (local) await local.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
