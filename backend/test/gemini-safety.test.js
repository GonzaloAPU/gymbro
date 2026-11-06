import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {GeminiBudget,geminiSafetyConfig,geminiBudget} from '../src/services/gemini-safety.js';
import {MemorySecurityStore} from '../src/services/security-store.js';
import {generateGeminiPlan} from '../src/services/gemini-plan.js';
import {exerciseData} from '../src/data/exercise-catalog.js';
import {makeLocalPlan} from '../src/services/welcome-planner.js';
const enabled={GEMINI_ENABLED:'true',GEMINI_API_KEY:'test-only-not-real',GEMINI_BUDGET_CONFIRMED:'true'};
test('Gemini: requiere habilitación, clave y confirmación explícita de presupuesto',()=>{
 assert.equal(geminiSafetyConfig({}),null);assert.equal(geminiSafetyConfig({...enabled,GEMINI_BUDGET_CONFIRMED:'false'}),null);
 assert.deepEqual(geminiSafetyConfig(enabled),{model:'gemini-3.5-flash-lite',daily:20,monthly:100,maxOutputTokens:4096,maxPromptBytes:48000});
 for(const extra of [{GEMINI_MODEL:'gemini-2.5-pro'},{GEMINI_MODEL:'veo-3'},{GEMINI_MAX_REQUESTS_PER_DAY:'NaN'},{GEMINI_MAX_REQUESTS_PER_MONTH:'0'}])assert.equal(geminiSafetyConfig({...enabled,...extra}),null);
});
test('Gemini: reserva atómica; ni concurrencia ni otra instancia superan el tope diario',async()=>{
 const store=new MemorySecurityStore(),budget=new GeminiBudget(store,()=>Date.parse('2026-11-06T10:00:00Z'));
 const results=await Promise.allSettled(Array.from({length:30},()=>budget.reserve({daily:3,monthly:10})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);
 await assert.rejects(new GeminiBudget(store,()=>Date.parse('2026-11-06T11:00:00Z')).reserve({daily:3,monthly:10}),e=>e.status===429);
});
test('Gemini: cambiar de día no elimina el límite mensual y cambiar de mes lo renueva',async()=>{
 let now=Date.parse('2026-11-06T10:00:00Z');const budget=new GeminiBudget(new MemorySecurityStore(),()=>now);
 await budget.reserve({daily:20,monthly:1});now+=86400000;
 await assert.rejects(budget.reserve({daily:20,monthly:1}),e=>e.status===429);
 now=Date.parse('2026-12-01T00:00:00Z');await budget.reserve({daily:20,monthly:1});
});
test('Gemini: si la persistencia cae no se concede presupuesto',async()=>{
 const budget=new GeminiBudget({mutate:async()=>{throw Error('storage offline');}});
 await assert.rejects(budget.reserve({daily:20,monthly:100}),/offline/);
});
function prepare(t){
 for(const [key,value]of Object.entries({...enabled,GEMINI_MODEL:'gemini-3.5-flash-lite'})){
  const old=process.env[key];process.env[key]=value;t.after(()=>{if(old===undefined)delete process.env[key];else process.env[key]=old;});
 }
 const input={age:30,heightCm:170,weightKg:70,goal:'GENERAL',experience:'BEGINNER',place:'HOME',equipment:[],sessions:3,minutes:45,availability:[1,3,5].map(weekday=>({weekday,start:'18:00',end:'19:00'})),hasRestrictions:false,mode:'GEMINI',aiConsent:true};
 const catalog=exerciseData.map(e=>({...e,id:randomUUID()}));return {input,catalog,base:makeLocalPlan(input,catalog)};
}
test('Gemini: topes de tokens, sin thinking/herramientas, sin retry y fallos consumen presupuesto global',async t=>{
 const f=prepare(t),budget=new GeminiBudget(new MemorySecurityStore());
 t.mock.method(geminiBudget,'reserve',()=>budget.reserve({daily:1,monthly:1}));
 let calls=0;
 const fake=async(_url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.generationConfig.maxOutputTokens,4096);assert.deepEqual(body.generationConfig.thinkingConfig,{thinkingLevel:'minimal'});assert.equal(body.generationConfig.temperature,undefined);assert.equal(body.generationConfig.candidateCount,1);assert.equal(body.tools,undefined);throw Error('network failed');};
 await assert.rejects(generateGeminiPlan(f.input,f.catalog,f.base,fake),e=>e.status===503);
 await assert.rejects(generateGeminiPlan(f.input,f.catalog,f.base,fake),e=>e.status===429);assert.equal(calls,1);
});
test('Gemini: sin presupuesto ni almacenamiento no se llama al proveedor',async t=>{
 const f=prepare(t);t.mock.method(geminiBudget,'reserve',async()=>{throw Object.assign(Error('unavailable'),{status:503});});
 await assert.rejects(generateGeminiPlan(f.input,f.catalog,f.base,()=>assert.fail('No llamar red')),e=>e.status===503);
});
