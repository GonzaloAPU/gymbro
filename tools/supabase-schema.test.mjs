/** Ejecuta el SQL entregable en PostgreSQL embebido. No requiere cuenta ni conexiones externas. */
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {exerciseData} from '../backend/src/data/exercise-catalog.js';
const db=new PGlite();
after(()=>db.close());
await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
const sql=fs.readFileSync(new URL('../backend/sql/supabase/01-bootstrap.sql',import.meta.url),'utf8');
await db.exec(sql);
const roleSql=fs.readFileSync(new URL('../backend/sql/supabase/02-backend-role.sql',import.meta.url),'utf8');
const user=randomUUID();
await db.query("INSERT INTO gymbro.users(id,email,password_hash,name,created_at,updated_at) VALUES ($1,'test@example.invalid','not-a-real-hash','Prueba',now(),now())",[user]);
test('Supabase: 15 tablas y 190 ejercicios oficiales',async()=>{
  const rows=(await db.query("SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='gymbro' AND table_type='BASE TABLE'")).rows;
  assert.equal(rows[0].total,15);
  const names=(await db.query('SELECT name FROM gymbro.exercises')).rows.map(e=>e.name).sort();
  assert.deepEqual(names,exerciseData.map(e=>e.name).sort());
});
test('Supabase: no copia datos personales al instalador',()=>{assert.ok(!sql.includes('passwordHash'));assert.ok(!/INSERT INTO [^;]*users/i.test(sql));assert.ok(!sql.includes('data:image/'));});
test('Supabase: tres migraciones registradas',async()=>assert.equal((await db.query('SELECT count(*)::int AS total FROM gymbro.schema_migrations')).rows[0].total,3));
test('Supabase: no modifica tablas de public',async()=>assert.equal((await db.query("SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows[0].total,0));
test('Supabase: anon y authenticated no pueden acceder al esquema',async()=>{
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_schema_privilege($1,'gymbro','USAGE') AS allowed",[role])).rows[0].allowed,false);
});
test('Supabase: reejecutar aborta sin borrar registros',async()=>{await assert.rejects(db.exec(sql),/ya existe/);await db.exec('ROLLBACK');assert.equal((await db.query('SELECT count(*)::int AS total FROM gymbro.users')).rows[0].total,1);});
test('Supabase: contraseña de ejemplo no crea un usuario SQL',async()=>{await assert.rejects(db.exec(roleSql),/contraseña/);await db.exec('ROLLBACK');assert.equal((await db.query("SELECT count(*)::int AS total FROM pg_roles WHERE rolname='gymbro_backend'")).rows[0].total,0);});
test('Supabase: usuario backend puede operar pero no crear ni borrar tablas',async()=>{
  await db.exec(roleSql.replaceAll('REEMPLAZAR_POR_UNA_CONTRASENA_ALEATORIA','temporary-test-password-1234567890123456789'));
  await db.exec('SET ROLE gymbro_backend;SET search_path TO gymbro, public;');
  assert.equal((await db.query('SELECT count(*)::int AS total FROM exercises')).rows[0].total,190);
  await assert.rejects(db.exec('CREATE TABLE gymbro.forbidden(id int)'),/permission denied/);
  await assert.rejects(db.exec('DROP TABLE gymbro.welcome_plans'),/owner/);
  await assert.rejects(db.exec("INSERT INTO gymbro.schema_migrations(version) VALUES ('forbidden')"),/permission denied/);
  await db.query('UPDATE users SET gym_name=$1 WHERE id=$2',['Gimnasio de prueba',user]);
  assert.equal((await db.query('SELECT gym_name FROM users WHERE id=$1',[user])).rows[0].gym_name,'Gimnasio de prueba');
  await db.exec('RESET ROLE;');
});
test('Supabase: protege duplicados y normaliza ejercicios privados',async()=>{
  await db.exec('SET ROLE gymbro_backend;SET search_path TO gymbro, public;');
  await assert.rejects(db.query("INSERT INTO exercises(id,name,muscle_group,equipment,training_type) VALUES ($1,'  SENTADILLA  ','Piernas','Barra','POWER')",[randomUUID()]),/ya existe/);
  await db.query("INSERT INTO exercises(id,name,muscle_group,equipment,training_type,created_by_user_id) VALUES ($1,'  Mi ejercicio de PRUEBA  ','Core','Peso corporal','POWER',$2)",[randomUUID(),user]);
  assert.equal((await db.query('SELECT normalized_name FROM exercises WHERE created_by_user_id=$1',[user])).rows[0].normalized_name,'mi ejercicio de prueba');
  await db.exec('RESET ROLE;');
});
test('Supabase: FK y validación de días siguen activas',async()=>{
  await assert.rejects(db.query('INSERT INTO gymbro.user_rest_days(id,user_id,weekday) VALUES ($1,$2,9)',[randomUUID(),user]),/check constraint/);
  await assert.rejects(db.query('INSERT INTO gymbro.user_rest_days(id,user_id,weekday) VALUES ($1,$2,1)',[randomUUID(),randomUUID()]),/foreign key/);
});
