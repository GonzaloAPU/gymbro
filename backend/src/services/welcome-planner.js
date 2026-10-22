/** Plan inicial de entrenamiento general. Calendario y validación no dependen de la IA. */
import {z} from 'zod';
import {normalizeExerciseName as normalize} from './exercise-name.js';
const hour=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const welcomeSchema=z.object({
  age:z.number().int().min(18).max(85),heightCm:z.number().int().min(100).max(250),weightKg:z.number().min(30).max(300),
  goal:z.enum(['GENERAL','STRENGTH','MUSCLE']),experience:z.enum(['BEGINNER','INTERMEDIATE']),
  place:z.enum(['GYM','HOME','PARK']),equipment:z.array(z.enum(['DUMBBELLS','BENCH','BARBELL','CABLE','PULLUP'])).max(5),
  sessions:z.number().int().min(2).max(4),minutes:z.number().int().min(30).max(90),
  availability:z.array(z.object({weekday:z.number().int().min(0).max(6),start:hour,end:hour})).min(2).max(7),
  hasRestrictions:z.boolean(),mode:z.enum(['LOCAL','GEMINI']),aiConsent:z.boolean().default(false),
}).strict().superRefine((data,ctx)=>{
  if(new Set(data.availability.map(slot=>slot.weekday)).size!==data.availability.length)ctx.addIssue({code:'custom',message:'Elegí un solo rango por día.'});
  if(data.availability.length<data.sessions)ctx.addIssue({code:'custom',message:'Faltan días disponibles para las sesiones elegidas.'});
  if(data.availability.some(slot=>minutesOf(slot.end)-minutesOf(slot.start)<data.minutes))ctx.addIssue({code:'custom',message:'Cada rango debe alcanzar para la sesión completa, sin cruzar medianoche.'});
});
export const goalLabels={GENERAL:'Mejorar mi condición física',STRENGTH:'Ganar fuerza',MUSCLE:'Desarrollar músculo'};
export const minutesOf=value=>Number(value.slice(0,2))*60+Number(value.slice(3));
const hhmm=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;
export function planningError(message,status=422){return Object.assign(new Error(message),{status});}

// Biblioteca curada de candidatos; el ID siempre se resuelve contra el catálogo oficial.
const choices=[
  ['Sentadilla con peso corporal',[],'LOWER'],['Puente de glúteos',[],'LOWER'],
  ['Flexiones con rodillas apoyadas',[],'UPPER'],['Flexiones de brazos',[],'UPPER'],
  ['Elevación de talón unilateral',[],'LOWER'],['Crunch abdominal',[],'CORE'],
  ['Peso muerto rumano con mancuernas',['DUMBBELLS'],'LOWER'],['Zancadas hacia atrás',['DUMBBELLS'],'LOWER'],
  ['Press militar',['DUMBBELLS'],'UPPER'],['Curl de biceps',['DUMBBELLS'],'UPPER'],
  ['Press banca con mancuernas',['DUMBBELLS','BENCH'],'UPPER'],
  ['Remo sentado',['CABLE'],'UPPER'],['Remo invertido',['PULLUP'],'UPPER'],
  ['Press banca',['BARBELL','BENCH'],'UPPER'],['Peso muerto rumano',['BARBELL'],'LOWER'],
];
export function allowedCatalog(input,catalog){
  return choices.flatMap(([name,required,group])=>{
    if(!required.every(item=>input.equipment.includes(item)))return [];
    // Dominadas, saltos y ejercicios explosivos no forman parte de esta bienvenida.
    const exercise=catalog.find(item=>normalize(item.name)===normalize(name)&&item.trainingType==='POWER'&&!item.createdByUserId);
    return exercise?[{id:exercise.id,name:exercise.name,group,equipment:exercise.equipment}]:[];
  });
}
function combinations(items,count){if(!count)return [[]];return items.flatMap((item,i)=>combinations(items.slice(i+1),count-1).map(rest=>[item,...rest]));}
function recoveryOK(days,count){
  const groups=count===4?[0,1,0,1]:days.map(()=>0);
  for(let i=0;i<days.length;i++)for(let j=i+1;j<days.length;j++)if(groups[i]===groups[j]){
    const difference=Math.abs(days[i].weekday-days[j].weekday);
    if(Math.min(difference,7-difference)<2)return false;
  }
  return true;
}
export function scheduleSessions(input,existing=[]){
  const slots=input.availability.flatMap(slot=>{
    // Busca un inicio libre dentro de la ventana, incluso cuando ya hay otro bloque.
    let start=minutesOf(slot.start);const end=minutesOf(slot.end);
    for(const busy of existing.filter(b=>b.weekday===slot.weekday).sort((a,b)=>a.start.localeCompare(b.start))){
      const from=minutesOf(busy.start),until=minutesOf(busy.end);
      if(start+input.minutes<=from)break;
      if(start<until&&start+input.minutes>from)start=until;
    }
    if(start+input.minutes>end||existing.filter(b=>b.weekday===slot.weekday).length>=3)return [];
    return [{weekday:slot.weekday,start:hhmm(start),end:hhmm(start+input.minutes)}];
  }).sort((a,b)=>((a.weekday+6)%7)-((b.weekday+6)%7));
  const candidates=combinations(slots,input.sessions).filter(days=>recoveryOK(days,input.sessions));
  if(!candidates.length)throw planningError('No encontramos una distribución con recuperación suficiente. Elegí otros días o menos sesiones.');
  // Distribuye la semana lo más parejo posible; el desempate mantiene el orden lunes-domingo.
  const score=days=>days.reduce((sum,day,i)=>{const gap=(days[(i+1)%days.length].weekday-day.weekday+7)%7;return sum+gap*gap;},0);
  candidates.sort((a,b)=>score(a)-score(b));return candidates[0];
}
export function estimateMinutes(exercises){return Math.ceil(8+exercises.reduce((sum,e)=>sum+e.targetSets*(45+e.restSeconds)/60+1,0));}
export function prescription(input,id){
  const gentle=input.experience==='BEGINNER'||input.age>=60;
  return {exerciseId:id,targetSets:gentle?2:3,minReps:input.goal==='STRENGTH'&&!gentle?6:8,maxReps:input.goal==='STRENGTH'&&!gentle?8:12,restSeconds:input.goal==='STRENGTH'?120:90};
}
export function makeLocalPlan(input,catalog,existing=[]){
  if(input.hasRestrictions)throw planningError('Con dolor, lesión o restricciones necesitás una indicación profesional. Podés crear tu rutina manualmente.');
  const allowed=allowedCatalog(input,catalog),slots=scheduleSessions(input,existing);
  const sessions=slots.map((slot,index)=>{
    const group=input.sessions===4?(index%2?'LOWER':'UPPER'):null;
    let pool=allowed.filter(e=>!group||e.group===group);
    if(input.equipment.length)pool.sort((a,b)=>Number(a.equipment==='Peso corporal')-Number(b.equipment==='Peso corporal'));
    if(pool.length<2)throw planningError('Faltan ejercicios compatibles en el catálogo. Actualizá la precarga o elegí otro equipamiento.');
    // Alterna variantes sin repetir el mismo ejercicio en una sesión.
    if(index%2)pool=[...pool.slice(1),pool[0]];
    if(!group){const upper=pool.find(e=>e.group==='UPPER'),lower=pool.find(e=>e.group==='LOWER'),core=pool.find(e=>e.group==='CORE');pool=[lower,upper,core,...pool].filter((e,i,all)=>e&&all.findIndex(other=>other?.id===e.id)===i);}
    const exercises=pool.slice(0,input.minutes>=60?4:3).map(e=>prescription(input,e.id));
    while(exercises.length>2&&estimateMinutes(exercises)>input.minutes)exercises.pop();
    if(estimateMinutes(exercises)>input.minutes)throw planningError('La sesión no entra en el tiempo disponible. Aumentá su duración.');
    return {name:input.sessions===4?(group==='UPPER'?'Tren superior':'Tren inferior')+` ${index+1}`:`Cuerpo completo ${index+1}`,slot,exercises};
  });
  return {name:`Mi primer plan · ${goalLabels[input.goal]}`,source:'LOCAL',sessions,
    restDays:[0,1,2,3,4,5,6].filter(day=>!slots.some(slot=>slot.weekday===day)&&!existing.some(slot=>slot.weekday===day))};
}
export const aiPlanSchema=z.object({sessions:z.array(z.object({exercises:z.array(z.object({exerciseId:z.string().uuid(),targetSets:z.number().int().min(1).max(3),minReps:z.number().int().min(6).max(15),maxReps:z.number().int().min(6).max(15),restSeconds:z.number().int().min(60).max(180)}).strict()).min(2).max(4)}).strict()).min(2).max(4)}).strict();
export function validateAIPlan(raw,input,catalog,base){
  const parsed=aiPlanSchema.safeParse(raw);if(!parsed.success)throw planningError('La IA devolvió un formato de plan inválido. Podés usar el plan local.',502);
  const allowed=allowedCatalog(input,catalog),ids=new Set(allowed.map(e=>e.id));
  if(parsed.data.sessions.length!==input.sessions)throw planningError('La IA no respetó las sesiones solicitadas.',502);
  const sessions=parsed.data.sessions.map((session,index)=>{
    if(new Set(session.exercises.map(e=>e.exerciseId)).size!==session.exercises.length)throw planningError('La IA repitió ejercicios dentro de una sesión.',502);
    if(input.sessions<4){const groups=session.exercises.map(e=>allowed.find(item=>item.id===e.exerciseId)?.group);if(!groups.includes('UPPER')||!groups.includes('LOWER'))throw planningError('La IA no distribuyó el trabajo de cuerpo completo.',502);}
    for(const exercise of session.exercises){
      const group=allowed.find(e=>e.id===exercise.exerciseId)?.group;
      if(!ids.has(exercise.exerciseId)||exercise.maxReps<exercise.minReps||((input.age>=60||input.experience==='BEGINNER')&&exercise.targetSets>2)||(input.sessions===4&&group!==(index%2?'LOWER':'UPPER')))throw planningError('La IA no respetó las restricciones del plan.',502);
    }
    if(estimateMinutes(session.exercises)>input.minutes)throw planningError('La propuesta de IA supera tu tiempo disponible.',502);
    return {...base.sessions[index],exercises:session.exercises};
  });
  return {...base,source:'GEMINI',sessions};
}
