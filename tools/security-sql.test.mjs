import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();after(()=>db.close());
const read=name=>fs.readFileSync(new URL('../backend/sql/supabase/'+name,import.meta.url),'utf8');
await db.exec('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE gymbro_backend;');
await db.exec(read('01-bootstrap.sql'));await db.exec(read('08-nombres-espanol.sql'));await db.exec(read('09-seguridad.sql'));
test('seguridad SQL: migración repetible agrega solo la tabla técnica y conserva 190 ejercicios',async()=>{
 await db.exec(read('09-seguridad.sql'));
 assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='gymbro' AND table_type='BASE TABLE'")).rows[0].n,17);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM gymbro.ejercicios')).rows[0].n,190);
 assert.equal((await db.query("SELECT count(*)::int AS n FROM gymbro.migraciones_esquema WHERE version='20261106_seguridad'")).rows[0].n,1);
});
test('seguridad SQL: anon/authenticated no tienen acceso y RLS queda activa',async()=>{
 const {rows}=await db.query("SELECT has_table_privilege('anon','gymbro.controles_seguridad','SELECT') AS anon,has_table_privilege('authenticated','gymbro.controles_seguridad','INSERT') AS authenticated,(SELECT relrowsecurity FROM pg_class WHERE oid='gymbro.controles_seguridad'::regclass) AS rls");
 assert.deepEqual(rows[0],{anon:false,authenticated:false,rls:true});
});
test('seguridad SQL: backend opera contadores sin permisos para alterar la tabla',async()=>{
 await db.exec('GRANT USAGE ON SCHEMA gymbro TO gymbro_backend;SET ROLE gymbro_backend;');
 try{
  await db.query("INSERT INTO gymbro.controles_seguridad VALUES('test-key','{\"used\":1}',now()+interval '1 minute')");
  assert.equal((await db.query("SELECT datos FROM gymbro.controles_seguridad WHERE clave='test-key'")).rows[0].datos.used,1);
  await db.exec("UPDATE gymbro.controles_seguridad SET datos='{\"used\":2}' WHERE clave='test-key';DELETE FROM gymbro.controles_seguridad WHERE clave='test-key';");
  await assert.rejects(db.exec('ALTER TABLE gymbro.controles_seguridad ADD COLUMN forbidden text'),/owner|permission/i);
 }finally{await db.exec('RESET ROLE');}
});
