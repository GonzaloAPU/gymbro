/** Generación determinista local: nunca llama a una API ni interpreta texto libre. */
import type {Exercise,Routine} from './routine.service';
export const guestGroups=['Piernas','Pecho','Espalda','Bíceps','Tríceps','Hombros','Glúteos','Abdominales'];
export const guestEquipment=[{id:'dumbbell',label:'Mancuernas'},{id:'barbell',label:'Barra y discos'},{id:'bench',label:'Banco'},{id:'band',label:'Bandas elásticas'},{id:'pullup',label:'Barra fija'},{id:'parallel',label:'Paralelas'},{id:'cable',label:'Polea'},{id:'machine',label:'Máquinas'}];
export interface GuestForm {groups:string[];equipment:string[];minutes:number;experience:'BEGINNER'|'REGULAR';}
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function matchesGuestGroup(exercise:Exercise,group:string):boolean {
 const muscle=normalize(exercise.muscleGroup),name=normalize(exercise.name),pattern=normalize(exercise.movementPattern||'');
 switch(group){
  case 'Piernas':return ['piernas','isquiotibiales','pantorrillas'].includes(muscle);
  case 'Bíceps':return muscle==='brazos'&&(/flexion.*codo/.test(pattern)||name.includes('biceps'))&&!name.includes('triceps');
  case 'Tríceps':return muscle==='brazos'&&(/extension.*codo/.test(pattern)||name.includes('triceps'));
  case 'Abdominales':return ['abdominales','core'].includes(muscle);
  default:return muscle===normalize(group);
 }
}
export function hasGuestEquipment(exercise:Exercise,equipment:string[]):boolean {
 const e=normalize(exercise.equipment),has=(id:string)=>equipment.includes(id);
 if(['peso corporal','colchoneta','pared','exterior','exterior o espacio despejado'].includes(e))return true;
 if(e.includes('banda')||e.includes('minibanda'))return has('band')&&!e.includes('anclaje')&&!e.includes('silla');
 if(e.includes('barra fija')||e.includes('dominadas'))return has('pullup');
 if(e.includes('paralela'))return has('parallel');
 if(e.includes('polea'))return has('cable');
 if(e==='maquina'||e==='multipower')return has('machine');
 if(e.includes('mancuern'))return has('dumbbell')&&(!e.includes('banco')||has('bench'));
 if(e.includes('banco'))return has('bench')&&(!e.includes('barra')||has('barbell'))&&!e.includes('predicador');
 if(e==='barra'||e==='barra z')return has('barbell');
 return false;
}
export function guestCandidates(catalog:Exercise[],form:GuestForm,group:string):Exercise[]{
 return catalog.filter(e=>e.trainingType==='POWER'&&matchesGuestGroup(e,group)&&hasGuestEquipment(e,form.equipment));
}
export function makeGuestRoutine(catalog:Exercise[],form:GuestForm,id:string):Routine {
 if(!form.groups.length||form.groups.some(g=>!guestGroups.includes(g))||new Set(form.groups).size!==form.groups.length||![30,45,60,75].includes(form.minutes)||!['BEGINNER','REGULAR'].includes(form.experience)||form.equipment.some(e=>!guestEquipment.some(allowed=>allowed.id===e)))throw Error('Revisá los grupos musculares, el equipamiento y el tiempo.');
 const pools=form.groups.map(group=>guestCandidates(catalog,form,group));
 const missing=form.groups.filter((_g,index)=>!pools[index].length);
 if(missing.length)throw Error(`No hay ejercicios disponibles para ${missing.join(', ')} con ese equipamiento. Agregá equipamiento o cambiá esos grupos.`);
 const count=Math.max(form.groups.length,form.minutes>=60?6:4),picked:Exercise[]=[];
 // Reparte por grupo, sin duplicados ni dos variantes del mismo movimiento básico.
 const family=(e:Exercise)=>normalize(e.name).replace(/con .*|en .*|inclinado|declinado|unilateral|alterno|concentrado/g,'').trim();
 while(picked.length<count){
  let added=false;
  for(const pool of pools){
   const available=pool.filter(e=>!picked.some(p=>p.id===e.id));
   const next=available.find(e=>!picked.some(p=>family(p)===family(e)))||available[0];
   if(next&&picked.length<count){picked.push(next);added=true;}
  }
  if(!added)break;
 }
 if(picked.length<4)throw Error('Con esa selección hay menos de 4 ejercicios diferentes. Agregá otro grupo muscular o más equipamiento.');
 return {id,createdAt:new Date().toISOString(),name:'Entrenamiento del día',goal:'Sesión libre',active:true,days:[{id:`${id}-day`,name:'Tu entrenamiento de hoy',dayNumber:1,favorite:false,schedule:[],exercises:picked.map((exercise,index)=>({id:`${id}-${index}`,order:index+1,targetSets:3,minReps:form.experience==='BEGINNER'?8:6,maxReps:12,restSeconds:60,targetDurationMinutes:null,targetDistanceKm:null,intensity:null,exercise}))}]};
}
