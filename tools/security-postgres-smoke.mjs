/** Prueba contra PostgreSQL real desechable; no usa .env ni servicios externos. */
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import pg from 'pg';
import {securitySchemaSql} from '../backend/src/services/security-schema.js';
import {PostgresSecurityStore} from '../backend/src/services/security-store.js';
import {IpRateLimiter} from '../backend/src/middleware/ip-rate-limit.js';
import {GeminiBudget} from '../backend/src/services/gemini-safety.js';
const name='gymbro-security-'+randomBytes(6).toString('hex'),password=randomBytes(24).toString('hex');
const pools=new Set();let started=false,admin;
function docker(args){const result=spawnSync('docker',args,{encoding:'utf8'});if(result.status!==0)throw Error('Docker no pudo completar la prueba local. Revisar que esté iniciado.');return result.stdout.trim();}
try{
 docker(['run','--detach','--rm','--name',name,'--env','POSTGRES_DB=gymbro_security_test','--env','POSTGRES_PASSWORD='+password,'--publish','127.0.0.1::5432','postgres:17-alpine']);started=true;
 const address=docker(['port',name,'5432/tcp']),port=Number(address.match(/:(\d+)$/)[1]);
 const url=new URL(`postgresql://postgres:${password}@127.0.0.1:${port}/gymbro_security_test`);
 for(let attempt=0;attempt<30;attempt++){
  admin=new pg.Client({connectionString:url.toString()});
  try{await admin.connect();break;}catch(error){await admin.end().catch(()=>{});admin=null;if(attempt===29)throw Error('PostgreSQL temporal no inició.');await new Promise(resolve=>setTimeout(resolve,500));}
 }
 await admin.query(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE gymbro_backend LOGIN PASSWORD '${password}';`);
 await admin.query(securitySchemaSql('public'));await admin.query('GRANT USAGE ON SCHEMA public TO gymbro_backend');
 url.username='gymbro_backend';
 const env={DB_CONNECTION_MODE:'LOCAL',DATABASE_URL:url.toString()};
 const makeStore=()=>{const store=new PostgresSecurityStore(env);pools.add(store);return store;};
 const a=makeStore(),b=makeStore(),now=Date.now();await Promise.all([a.ready(),b.ready()]);
 const ip=[new IpRateLimiter(a,()=>now,'test-only'),new IpRateLimiter(b,()=>now,'test-only')];
 const calls=await Promise.all(Array.from({length:40},(_,i)=>ip[i%2].consume('192.0.2.123')));
 assert.equal(calls.filter(r=>r.allowed).length,10);assert.equal(calls.filter(r=>!r.allowed).length,30);
 await a.close();pools.delete(a);
 const fresh=makeStore();assert.equal((await new IpRateLimiter(fresh,()=>now,'test-only').consume('192.0.2.123')).allowed,false);
 const budgets=[new GeminiBudget(b,()=>now),new GeminiBudget(fresh,()=>now)];
 const ai=await Promise.allSettled(Array.from({length:20},(_,i)=>budgets[i%2].reserve({daily:3,monthly:5})));
 assert.equal(ai.filter(r=>r.status==='fulfilled').length,3);
 assert.ok(ai.filter(r=>r.status==='rejected').every(r=>r.reason.status===429));
 await assert.rejects(b.pool.query('ALTER TABLE public.controles_seguridad ADD COLUMN forbidden text'),/owner|permission/i);
 const persisted=await admin.query('SELECT clave,datos FROM public.controles_seguridad');assert.ok(!JSON.stringify(persisted.rows).includes('192.0.2.123'));
 console.log(JSON.stringify({ok:true,ipPermitidas:10,ipBloqueadas:30,llamadasIaPermitidas:3,llamadasIaRechazadas:17,persistenciaEntreInstancias:true,rolBackendSinDDL:true,datosPersonalesPersistidos:false},null,2));
}finally{
 for(const pool of pools)await pool.close().catch(()=>{});
 if(admin)await admin.end().catch(()=>{});
 if(started&&/^gymbro-security-[a-f0-9]{12}$/.test(name))docker(['rm','--force',name]);
}
