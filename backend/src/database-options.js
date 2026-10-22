/** Separa la configuración local de la conexión IAM usada por Render. No lee ni imprime claves. */
export function databaseOptions(env) {
  const common={dialect:'postgres',logging:env.SQL_LOGGING==='true'?console.log:false,define:{underscored:true},pool:{max:3,min:0,idle:10000,acquire:60000}};
  if(env.DB_CONNECTION_MODE && !['LOCAL','CLOUD_SQL'].includes(env.DB_CONNECTION_MODE))throw Error('DB_CONNECTION_MODE inválido');
  if(env.DB_CONNECTION_MODE!=='CLOUD_SQL') {
    if(!env.DATABASE_URL)throw Error('DATABASE_URL no esta configurada');
    return {url:env.DATABASE_URL,options:common};
  }
  for(const key of ['CLOUD_SQL_INSTANCE','DB_NAME','DB_USER','GOOGLE_APPLICATION_CREDENTIALS'])if(!env[key]?.trim())throw Error(`Falta configurar ${key}`);
  if(!/^[^:]+:[^:]+:[^:]+$/.test(env.CLOUD_SQL_INSTANCE))throw Error('CLOUD_SQL_INSTANCE debe ser proyecto:región:instancia');
  if(!env.DB_USER.endsWith('.iam')||env.DB_USER.endsWith('.gserviceaccount.com'))throw Error('DB_USER debe ser el usuario PostgreSQL de la cuenta de servicio, terminado en .iam');
  return {options:common,database:env.DB_NAME,user:env.DB_USER,connector:{instanceConnectionName:env.CLOUD_SQL_INSTANCE,ipType:'PUBLIC',authType:'IAM'}};
}

/** Cada conexión obtiene un stream cifrado del conector; no cae a PostgreSQL directo si falla IAM. */
export function cloudSqlHook(connector,options) {
  return async config=>{
    const transport=await connector.getOptions(options);
    config.dialectOptions={...config.dialectOptions,...transport,connectionTimeoutMillis:30000};
    delete config.password;
  };
}
