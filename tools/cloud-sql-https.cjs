/**
 * Migración por la API HTTPS oficial de Cloud SQL usando IAM.
 * Alternativa al socket TLS cuando el antivirus sustituye su certificado.
 * Mantiene la verificación de certificados HTTPS; nunca desactiva TLS.
 * --setup configura los roles estándar; --clone exige destino vacío y compara
 * el contenido dentro de la misma transacción; --verify consulta sin escribir.
 */
const { createRequire } = require('node:module');
const cli = createRequire(require.resolve('firebase-tools/package.json'));
const { localSnapshot, exportSnapshot, tables } = require('./cloud-postgres.cjs');
const PROJECT = 'gymbro-569e3';
const INSTANCE = 'gymbro-569e3-instance';
const DATABASE = 'gymbro-569e3-database';
const owner = `firebaseowner_${DATABASE}_public`;

/** Devuelve filas normalizadas sin mostrar datos de consultas en los logs. */
function rows(body) {
  return (body.results || []).flatMap(result => (result.rows || []).map(row =>
    Object.fromEntries(result.columns.map((column, index) => [column.name,
      row.values[index].nullValue ? null : row.values[index].value]))));
}

async function main() {
  const mode = process.argv[2];
  if (!['--setup', '--clone', '--verify', '--tables', '--extension'].includes(mode)) throw Error('Usar --setup, --clone, --verify, --tables o --extension.');
  const account = cli('./lib/auth').getProjectDefaultAccount(process.cwd());
  if (!account) throw Error('Primero autorizar Firebase CLI.');
  const options = { project: PROJECT, ...account };
  await cli('./lib/requireAuth').requireAuth(options);
  const client = new (cli('./lib/apiv2').Client)({ urlPrefix: 'https://sqladmin.googleapis.com', apiVersion: 'v1', auth: true });
  async function execute(sql) {
    const payload = { database: DATABASE, sqlStatement: sql, autoIamAuthn: true,
      application: 'gymbro-migration', partialResultMode: 'FAIL_PARTIAL_RESULT' };
    if (Buffer.byteLength(JSON.stringify(payload)) >= 500000) throw Error('El script supera el límite de 0,5 MB de Data API. No se envía.');
    const response = await client.post(`projects/${PROJECT}/instances/${INSTANCE}/executeSql`, payload);
    if (response.body.status?.code) throw Error('SQL: ' + response.body.status.message);
    for (const result of response.body.results || []) {
      if (result.status?.code || result.partialResult) throw Error('Respuesta SQL incompleta o fallida.');
    }
    return response.body;
  }
  const initial = rows(await execute('SELECT current_user AS username; SELECT tablename FROM pg_tables WHERE schemaname=\'public\';'));
  const username = initial.find(row => row.username)?.username;
  if (!username || username.toLowerCase() !== account.user.email.toLowerCase()) throw Error('La identidad no coincide con la cuenta de Firebase CLI.');
  if (mode === '--tables') { console.log(JSON.stringify(initial.filter(row => row.tablename))); return; }
  if (mode === '--extension') {
    await execute(`SET ROLE "${owner}"; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    console.log('OK: extensión UUID requerida por SQL Connect disponible.');
    return;
  }
  if (mode === '--setup') {
    if (initial.some(row => row.tablename)) throw Error('La configuración inicial requiere esquema público vacío.');
    const permissions = cli('./lib/gcp/cloudsql/permissions');
    const { getIAMUser, getDataConnectP4SA, toDatabaseUser } = cli('./lib/gcp/cloudsql/connect');
    const lower = (await getIAMUser(options)).user;
    const projectNumber = await cli('./lib/projectUtils').needProjectNumber(options);
    const serviceUser = toDatabaseUser(getDataConnectP4SA(projectNumber)).user;
    const commands = [
      ...permissions.ownerRolePermissions(DATABASE, username, 'public'),
      ...permissions.writerRolePermissions(DATABASE, username, 'public'),
      ...permissions.readerRolePermissions(DATABASE, username, 'public'),
      `GRANT "${owner}" TO "${username}"`,
      ...(lower !== username ? [`GRANT "${owner}" TO "${lower}"`] : []),
      `GRANT "${permissions.firebasewriter(DATABASE, 'public')}" TO "${serviceUser}"`,
      ...permissions.defaultPermissions(DATABASE, 'public', owner),
    ];
    await execute('BEGIN;\n' + commands.join(';\n') + ';\nCOMMIT;');
    console.log('OK: roles estándar de SQL Connect configurados por HTTPS con IAM.');
    return;
  }
  if (mode === '--clone' && initial.some(row => row.tablename)) throw Error('El destino ya tiene tablas; no se sobrescriben datos.');
  const { local, snapshot, expected } = await localSnapshot();
  try {
    if (mode === '--clone') {
      const { sql, backup } = exportSnapshot(snapshot, expected);
      // La comprobación del contenido ocurre en PostgreSQL antes del COMMIT.
      const assertions = tables.map(table => {
        const { digest, rows: count } = expected[table];
        if (!/^[a-f0-9]{32}$/.test(digest) || !Number.isInteger(count)) throw Error('Huella inesperada.');
        return `IF (SELECT count(*) FROM public."${table}") <> ${count}
          OR (SELECT md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY ${table === 'schema_migrations' ? 'version' : 'id'}), '')) FROM public."${table}" t) <> '${digest}'
          THEN RAISE EXCEPTION 'Diferencia en ${table}'; END IF;`;
      }).join('\n');
      const transaction = `BEGIN; SET LOCAL TIME ZONE 'UTC'; SET LOCAL ROLE "${owner}";
        DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public')
        THEN RAISE EXCEPTION 'Destino no vacío'; END IF; END $guard$;
        ${sql}
        DO $verify$ BEGIN ${assertions} END $verify$; COMMIT;`;
      await execute(transaction);
      console.log(JSON.stringify({ imported: true, verifiedBeforeCommit: true, backup,
        tables: Object.fromEntries(tables.map(table => [table, expected[table].rows])) }, null, 2));
    } else {
      const query = tables.map(table => `SELECT '${table}' AS name, count(*)::text AS rows,
        md5(COALESCE(string_agg(row_to_json(t)::text, E'\\n' ORDER BY ${table === 'schema_migrations' ? 'version' : 'id'}), '')) AS digest FROM public."${table}" t`).join(' UNION ALL ');
      const actual = rows(await execute("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL TIME ZONE 'UTC'; " + query + '; COMMIT;'));
      if (actual.length !== tables.length) throw Error('Respuesta de verificación incompleta.');
      for (const row of actual) {
        if (Number(row.rows) !== expected[row.name].rows || row.digest !== expected[row.name].digest) throw Error('Diferencia en ' + row.name);
      }
      console.log('OK: las once tablas en Cloud SQL coinciden con la instantánea local.');
    }
    await local.query('COMMIT');
  } finally { await local.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
