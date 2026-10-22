/** Actualiza Cloud SQL conservando sus datos. Exige que el respaldo inicial siga coincidiendo.
 * Ensaya las mismas migraciones del backend en PostgreSQL temporal y aplica el SQL
 * capturado en una sola transacción HTTPS, con huellas antes y después del cambio.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {createRequire}=require('node:module');
const cli=createRequire(require.resolve('firebase-tools/package.json'));
const root=path.resolve(__dirname,'..');
const project='gymbro-569e3',instance='gymbro-569e3-instance',database='gymbro-569e3-database';
const owner=`firebaseowner_${database}_public`;
const {tables,fingerprint}=require('./cloud-postgres.cjs');
function rows(body){return (body.results||[]).flatMap(result=>(result.rows||[]).map(row=>Object.fromEntries(result.columns.map((column,i)=>[column.name,row.values[i].nullValue?null:row.values[i].value]))));}
function assertions(expected){return Object.entries(expected).map(([table,value])=>{
  if(!/^[a-z_]+$/.test(table)||!/^[a-f0-9]{32}$/.test(value.digest)||!Number.isInteger(value.rows))throw Error('Huella inválida');
  return `IF (SELECT count(*) FROM public."${table}") <> ${value.rows} OR (SELECT md5(COALESCE(string_agg(${table==='schema_migrations'?"(to_jsonb(t)-'applied_at')::text":'row_to_json(t)::text'},E'\\n' ORDER BY ${table==='schema_migrations'?'version':'id'}),'')) FROM public."${table}" t) <> '${value.digest}' THEN RAISE EXCEPTION 'Diferencia en ${table}'; END IF;`;
}).join('\n');}
async function main(){
  if(!['--apply','--verify'].includes(process.argv[2]))throw Error('Usar --apply o --verify <manifest>');
  const account=cli('./lib/auth').getProjectDefaultAccount(root);
  if(!account)throw Error('Falta sesión Firebase');
  await cli('./lib/requireAuth').requireAuth({project,...account});
  const api=new (cli('./lib/apiv2').Client)({urlPrefix:'https://sqladmin.googleapis.com',apiVersion:'v1',auth:true});
  async function execute(sql){
    const payload={database,sqlStatement:sql,autoIamAuthn:true,application:'gymbro-upgrade',partialResultMode:'FAIL_PARTIAL_RESULT'};
    if(Buffer.byteLength(JSON.stringify(payload))>=500000)throw Error('SQL supera límite de API');
    const response=await api.post(`projects/${project}/instances/${instance}/executeSql`,payload);
    if(response.body.status?.code)throw Error(response.body.status.message);
    for(const result of response.body.results||[])if(result.status?.code||result.partialResult)throw Error(result.status?.message||'Respuesta incompleta');
    return response.body;
  }
  if(process.argv[2]==='--verify'){
    const file=path.resolve(process.argv[3]||'');
    if(!file.startsWith(path.join(root,'backups')+path.sep))throw Error('El manifiesto debe estar dentro de backups');
    const expected=JSON.parse(fs.readFileSync(file,'utf8'));
    if(expected.project!==project||expected.database!==database)throw Error('Destino inesperado');
    await execute(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL TIME ZONE 'UTC';DO $verify$ BEGIN ${assertions(expected.tables)} END $verify$;COMMIT;`);
    console.log('OK: las 15 tablas remotas coinciden con la migración ensayada.');return;
  }
  const source=path.join(root,'backups/firebase-migration-2026-10-20T00-56-56-209Z');
  const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
  const dump=fs.readFileSync(path.join(source,'postgres.sql'),'utf8');
  if(manifest.project!==project||manifest.database!==database||crypto.createHash('sha256').update(dump).digest('hex')!==manifest.sha256)throw Error('Respaldo no verificado');
  // Una verificación fallida deja la nube intacta, en vez de sobrescribir cuentas nuevas.
  await execute(`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;SET LOCAL TIME ZONE 'UTC';DO $verify$ BEGIN ${assertions(manifest.tables)} END $verify$;COMMIT;`);
  const backup=path.join(root,'backups','cloud-upgrade-'+new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(backup,{recursive:true});
  fs.copyFileSync(path.join(source,'postgres.sql'),path.join(backup,'before.sql'));
  fs.copyFileSync(path.join(source,'manifest.json'),path.join(backup,'before-manifest.json'));
  const temp='gymbro_cloud_upgrade_'+crypto.randomBytes(6).toString('hex');
  const docker=args=>execFileSync('docker',['compose','exec','-T','postgres',...args],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
  let local;
  try {
    docker(['createdb','-U','smartgymbro',temp]);
    execFileSync('docker',['compose','exec','-T','postgres','psql','-X','-v','ON_ERROR_STOP=1','-U','smartgymbro','-d',temp],{cwd:root,input:dump,encoding:'utf8',maxBuffer:16*1024*1024});
    require('dotenv').config({path:path.join(root,'backend/.env'),quiet:true});
    const url=new URL(process.env.DATABASE_URL);
    if(!['localhost','127.0.0.1'].includes(url.hostname)||url.port!=='5433')throw Error('Origen local inesperado');
    url.pathname='/'+temp;
    const capture=path.join(backup,'upgrade.sql');
    execFileSync(process.execPath,['tools/capture-cloud-upgrade.mjs',capture],{cwd:root,env:{...process.env,DATABASE_URL:url.toString()},stdio:'inherit'});
    const {Client}=require('pg');local=new Client({connectionString:url.toString()});await local.connect();await local.query("SET TIME ZONE 'UTC'");
    const expected=await fingerprint(local);
    fs.writeFileSync(path.join(backup,'after-manifest.json'),JSON.stringify({project,database,tables:expected},null,2));
    const sql=fs.readFileSync(capture,'utf8');
    const locked=Object.keys(manifest.tables).map(t=>`public."${t}"`).join(',');
    await execute(`BEGIN;SET LOCAL TIME ZONE 'UTC';SET LOCAL ROLE "${owner}";LOCK TABLE ${locked} IN ACCESS EXCLUSIVE MODE;
      DO $before$ BEGIN ${assertions(manifest.tables)} END $before$;
      ${sql}
      DO $after$ BEGIN ${assertions(expected)} END $after$;COMMIT;`);
    const result=rows(await execute("SELECT tablename FROM pg_tables WHERE schemaname='public';SELECT count(*)::text AS exercises FROM exercises;SELECT version FROM schema_migrations ORDER BY version;"));
    console.log(JSON.stringify({updated:true,backup,result},null,2));
  } finally {
    if(local)await local.end();
    docker(['dropdb','--if-exists','-U','smartgymbro',temp]);
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
