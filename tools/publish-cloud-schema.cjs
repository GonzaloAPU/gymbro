/**
 * Publica por HTTPS la interfaz del catálogo sobre una base existente.
 * Las tablas son administradas por Sequelize: no ejecuta migraciones SQL.
 * Antes exige que los datos de las once tablas coincidan con la copia local.
 * Después comprueba una consulta real del catálogo; conserva NO_ACCESS.
 */
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const cli = createRequire(require.resolve('firebase-tools/package.json'));
async function main() {
  const project = 'gymbro-569e3';
  const account = cli('./lib/auth').getProjectDefaultAccount(process.cwd());
  await cli('./lib/requireAuth').requireAuth({ project, ...account });
  const config = cli('./lib/config').Config.load({ cwd: process.cwd(), configPath: 'firebase.cloud.json' });
  const [service] = await cli('./lib/dataconnect/load').loadAll(project, config);
  if (service.serviceName !== 'projects/gymbro-569e3/locations/southamerica-east1/services/gymbro-569e3-service') throw Error('Destino inesperado.');
  const api = cli('./lib/dataconnect/client');
  execFileSync(process.execPath, ['--use-system-ca', 'tools/cloud-sql-https.cjs', '--verify'], { stdio: 'inherit' });
  for (const schema of service.schemas) {
    // NONE omite migraciones del esquema SQL importado, no la autorización de
    // consultas. Se conserva la base completa y el conector sigue siendo privado.
    for (const datasource of schema.datasources) if (datasource.postgresql) datasource.postgresql.schemaValidation = 'NONE';
    await api.upsertSchema(schema, true);
    await api.upsertSchema(schema);
  }
  for (const info of service.connectorInfo) await api.upsertConnector(info.connector);
  const dataplane = cli('./lib/dataconnect/dataplaneClient');
  const response = await dataplane.executeGraphQL(dataplane.dataconnectDataplaneClient(), service.serviceName,
    { query: 'query { exercises { id name } }' });
  if (response.body.errors?.length || !Array.isArray(response.body.data?.exercises)) throw Error('El catálogo publicado no responde correctamente.');
  console.log('OK: interfaz GraphQL del catálogo publicada sin migraciones; ' + response.body.data.exercises.length + ' ejercicios consultados.');
}
main().catch(error => {
  const diff = cli('./lib/dataconnect/errors').getIncompatibleSchemaError(error);
  console.error(diff ? JSON.stringify(diff, null, 2) : error.message);
  process.exitCode = 1;
});
