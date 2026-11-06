/** Contadores compartidos y persistentes. No guarda IP, tokens ni contraseñas. */
import pg from 'pg';
import {databaseOptions} from '../database-options.js';
export const unavailable=()=>Object.assign(Error('La protección del servidor no está disponible. Intentá más tarde.'),{status:503});
export class MemorySecurityStore {
  entries=new Map();tail=Promise.resolve();
  async ready(){} async close(){}
  mutate(keys,operation,now=Date.now()){
    const run=this.tail.then(()=>{
      for(const [key,row]of this.entries)if(row.expiresAt<=now)this.entries.delete(key);
      if(this.entries.size+keys.filter(key=>!this.entries.has(key)).length>10000)throw unavailable();
      const rows=new Map(keys.map(key=>[key,structuredClone(this.entries.get(key)||{value:{},expiresAt:now+60000})]));
      const result=operation(rows);
      for(const [key,row]of rows)this.entries.set(key,row);
      return result;
    });this.tail=run.catch(()=>{});return run;
  }
}
export class PostgresSecurityStore {
  constructor(env=process.env){
    const settings=databaseOptions(env),schema=settings.options.define.schema||'public';
    if(!['public','gymbro'].includes(schema))throw unavailable();
    this.table=`"${schema}"."controles_seguridad"`;
    // Pool independiente: una generación mantiene la transacción de usuario abierta.
    this.pool=new pg.Pool({connectionString:settings.url,ssl:settings.options.dialectOptions?.ssl,max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:5000,statement_timeout:5000});
    this.pool.on('error',()=>{});this.lastSweep=0;
  }
  async ready(){await this.pool.query(`SELECT clave FROM ${this.table} LIMIT 1`);}
  async close(){await this.pool.end();}
  async mutate(keys,operation,now=Date.now()){
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='3s'");
      // Orden fijo para evitar interbloqueos entre los topes diarios y mensuales.
      for(const key of [...keys].sort())await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,20261106))',[key]);
      if(now-this.lastSweep>=60000){
        await client.query(`DELETE FROM ${this.table} WHERE clave IN (SELECT clave FROM ${this.table} WHERE vence_en <= $1 LIMIT 1000)`,[new Date(now)]);this.lastSweep=now;
      }
      const found=await client.query(`SELECT clave,datos,vence_en FROM ${this.table} WHERE clave=ANY($1::text[])`,[keys]);
      const rows=new Map(keys.map(key=>[key,{value:{},expiresAt:now+60000}]));
      for(const row of found.rows)if(new Date(row.vence_en).getTime()>now)rows.set(row.clave,{value:row.datos,expiresAt:new Date(row.vence_en).getTime()});
      if(found.rows.length<keys.length){const count=await client.query(`SELECT count(*)::int AS n FROM ${this.table} WHERE vence_en > $1`,[new Date(now)]);if(count.rows[0].n+keys.length-found.rows.length>10000)throw unavailable();}
      const result=operation(rows);
      for(const [key,row]of rows)await client.query(`INSERT INTO ${this.table}(clave,datos,vence_en) VALUES($1,$2::jsonb,$3) ON CONFLICT(clave) DO UPDATE SET datos=EXCLUDED.datos,vence_en=EXCLUDED.vence_en`,[key,JSON.stringify(row.value),new Date(row.expiresAt)]);
      await client.query('COMMIT');return result;
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
  }
}
if(process.env.NODE_ENV==='production'&&process.env.SECURITY_STORE&&process.env.SECURITY_STORE!=='postgres')throw Error('En producción SECURITY_STORE debe ser postgres.');
export const securityStore=process.env.NODE_ENV==='production'||process.env.SECURITY_STORE==='postgres'?new PostgresSecurityStore():new MemorySecurityStore();
