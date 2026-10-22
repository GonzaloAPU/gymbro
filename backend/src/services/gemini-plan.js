/** Adaptador Gemini: clave solo en backend, salida estructurada y validación posterior. */
import {allowedCatalog,planningError,validateAIPlan} from './welcome-planner.js';
export const geminiAvailable=()=>process.env.GEMINI_ENABLED==='true'&&Boolean(process.env.GEMINI_API_KEY);
const schema={type:'object',required:['sessions'],properties:{sessions:{type:'array',items:{type:'object',required:['exercises'],properties:{exercises:{type:'array',items:{type:'object',required:['exerciseId','targetSets','minReps','maxReps','restSeconds'],properties:{exerciseId:{type:'string'},targetSets:{type:'integer'},minReps:{type:'integer'},maxReps:{type:'integer'},restSeconds:{type:'integer'}}}}}}}}};
export async function generateGeminiPlan(input,catalog,base,fetchImpl=fetch){
  if(!geminiAvailable())throw planningError('La IA todavía no está configurada. Podés generar tu plan local.',503);
  if(!input.aiConsent)throw planningError('Confirmá el envío de los parámetros deportivos para usar la IA.',400);
  // No se envían nombre, correo, foto, ID ni días/horarios exactos.
  const profile={age:input.age,heightCm:input.heightCm,weightKg:input.weightKg,goal:input.goal,experience:input.experience,place:input.place,equipment:input.equipment,sessions:input.sessions,minutes:input.minutes};
  const prompt=`Proponé un plan inicial de entrenamiento general, sin recomendaciones clínicas ni rehabilitación.
Elegí exclusivamente exerciseId del catálogo provisto. No inventes ejercicios, cargas en kg ni consejos médicos.
Cada sesión: 2 a 4 ejercicios únicos, 1 a 3 series, 6 a 15 repeticiones, descanso de 60 a 180 segundos.
Para principiantes o edad >=60: máximo 2 series. Mantener intensidad inicial moderada.
Con 4 sesiones alternar exclusivamente UPPER, LOWER, UPPER, LOWER; con 2 o 3 hacer cuerpo completo.
El calendario ya está calculado por el backend: no lo cambies. La duración estimada será
8 minutos + suma(series*(45+descanso)/60 + 1 minuto por ejercicio), y no puede superar minutes.
Devolvé solamente sessions con exercises y los campos del esquema.
Parámetros: ${JSON.stringify(profile)}
Catálogo: ${JSON.stringify(allowedCatalog(input,catalog))}`;
  let response;
  try {
    response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL||'gemini-2.5-flash')}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},
      body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',responseJsonSchema:schema,maxOutputTokens:6000,temperature:0.3}}),
      signal:AbortSignal.timeout(30000),
    });
  }catch{throw planningError('La IA no respondió a tiempo. Reintentá o usá el plan local.',503);}
  if(!response.ok)throw planningError(response.status===429?'Se alcanzó la cuota de IA. Podés continuar con un plan local.':'No pudimos consultar la IA. Podés continuar con un plan local.',503);
  try {
    const data=await response.json(),candidate=data.candidates?.[0];
    if(candidate?.finishReason!=='STOP')throw Error('Respuesta incompleta');
    const text=candidate.content.parts.filter(part=>typeof part.text==='string'&&!part.thought).map(part=>part.text).join('');
    return validateAIPlan(JSON.parse(text),input,catalog,base);
  }catch(error){if(error.status)throw error;throw planningError('La respuesta de IA no pudo validarse. Usá el plan local o reintentá.',502);}
}
