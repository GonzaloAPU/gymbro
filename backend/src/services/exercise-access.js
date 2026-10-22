/** Normaliza nombres y centraliza el acceso: catálogo oficial más ejercicios propios. */
import { Op } from 'sequelize';
import { Exercise } from '../models/index.js';
export {normalizeExerciseName} from './exercise-name.js';
export function exerciseScope(userId) { return {[Op.or]:[{createdByUserId:null},{createdByUserId:userId}]}; }
export async function assertExercisesAccessible(ids, userId, transaction) {
  const unique = [...new Set(ids)];
  const found = await Exercise.count({where:{id:unique,...exerciseScope(userId)},transaction});
  if (found !== unique.length) throw Object.assign(new Error('Uno de los ejercicios no existe o es privado de otra cuenta.'),{status:404});
}
