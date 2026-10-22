/** Ensaya las migraciones reales en una copia temporal y captura su SQL parametrizado. */
import fs from 'node:fs';
import {sequelize} from '../backend/src/db.js';
import {Exercise} from '../backend/src/models/index.js';
import {exerciseData} from '../backend/src/data/exercise-catalog.js';
import {normalizeExerciseName} from '../backend/src/services/exercise-name.js';
import {normalizeSchema} from '../backend/scripts/migrations/20261020-normalize.js';
import {migrateOfflineSessions} from '../backend/scripts/migrations/20261020-offline-sessions.js';
import {migrateWelcome} from '../backend/scripts/migrations/20261021-welcome.js';
if(!/^\/gymbro_cloud_upgrade_[a-f0-9]+$/.test(new URL(process.env.DATABASE_URL).pathname)) throw Error('Solo se permite una base temporal propia.');
const commands=[];
const Query=sequelize.dialect.Query, original=Query.prototype.run;
Query.prototype.run=async function(sql,parameters) {
  const result=await original.call(this,sql,parameters);
  if(!/^(?:START TRANSACTION|BEGIN|COMMIT|ROLLBACK);?$/i.test(sql.trim())) {
    // pg recibe los JSON ya serializados; escape conserva comillas, UUID y números.
    commands.push(parameters?.length ? sql.replace(/\$(\d+)\b/g,(_match,index)=>sequelize.escape(parameters[Number(index)-1])) : sql);
  }
  return result;
};
try {
  await normalizeSchema();await migrateOfflineSessions();await migrateWelcome();
  await sequelize.transaction(async transaction=>{
    const existing=new Set((await Exercise.findAll({where:{createdByUserId:null},transaction})).map(e=>normalizeExerciseName(e.name)));
    for(const item of exerciseData) if(!existing.has(normalizeExerciseName(item.name))) {
      await Exercise.create(item,{transaction});existing.add(normalizeExerciseName(item.name));
    }
  });
  fs.writeFileSync(process.argv[2],commands.join('\n;\n')+';\n');
  console.log('OK: migraciones y catálogo ensayados sobre copia temporal.');
} finally {await sequelize.close();}
