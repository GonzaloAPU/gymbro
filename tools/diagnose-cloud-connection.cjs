/** Diagnóstico de TLS del conector oficial: no desactiva verificaciones ni modifica la base. */
const { createRequire } = require('node:module');
const cli = createRequire(require.resolve('firebase-tools/package.json'));
const { Connector, IpAddressTypes, AuthTypes } = cli('@google-cloud/cloud-sql-connector');
const { Client } = require('pg');
async function main() {
  const account = cli('./lib/auth').getProjectDefaultAccount(process.cwd());
  const options = { project: 'gymbro-569e3', ...account };
  await cli('./lib/requireAuth').requireAuth(options);
  const { user } = await cli('./lib/gcp/cloudsql/connect').getIAMUser(options);
  const connector = new Connector({ auth: new (cli('./lib/gcp/cloudsql/fbToolsAuthClient').FBToolsAuthClient)() });
  let client;
  try {
    const connection = await connector.getOptions({ instanceConnectionName: 'gymbro-569e3:southamerica-east1:gymbro-569e3-instance', ipType: IpAddressTypes.PUBLIC, authType: AuthTypes.IAM });
    const originalStream = connection.stream;
    connection.stream = () => {
      const socket = originalStream();
      // Lee únicamente los datos públicos del certificado antes de la validación
      // del handshake; no modifica el socket ni el resultado de esa validación.
      socket.prependOnceListener('secure', () => {
        const cert = socket.getPeerCertificate();
        console.log(JSON.stringify({ subject: cert?.subject, issuer: cert?.issuer }));
      });
      socket.once('secureConnect', () => console.log(JSON.stringify({ tlsAuthorized: socket.authorized })));
      socket.once('error', error => {
        const cert = socket.getPeerCertificate();
        console.log(JSON.stringify({ code: error.code, subject: cert?.subject, issuer: cert?.issuer }));
      });
      return socket;
    };
    client = new Client({ ...connection, user, database: 'gymbro-569e3-database', connectionTimeoutMillis: 15000 });
    await client.connect();
    console.log(JSON.stringify((await client.query('SELECT 1 AS connected')).rows));
  } finally {
    if (client) await client.end();
    connector.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
