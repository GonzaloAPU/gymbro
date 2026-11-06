/** Publica únicamente el catálogo oficial, sin consultar usuarios ni la base remota. */
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {exerciseData} from '../backend/src/data/exercise-catalog.js';
const catalog=exerciseData.map(e=>({id:`guest-exercise-${createHash('sha256').update(e.name).digest('hex').slice(0,20)}`,name:e.name,muscleGroup:e.muscleGroup,equipment:e.equipment,movementPattern:e.movementPattern,trainingType:e.trainingType,description:e.description||null,videoUrl:e.videoUrl||null}));
await writeFile(new URL('../frontend/src/app/services/guest-catalog.ts',import.meta.url),`// Generado con node tools/build-guest-catalog.mjs. Solo catálogo público.\nimport type {Exercise} from './routine.service';\nexport const guestCatalog:Exercise[]=${JSON.stringify(catalog,null,2)};\n`);
console.log(`Catálogo invitado: ${catalog.length} ejercicios.`);
