import {securityStore,unavailable} from './security-store.js';
const MODELS=new Set(['gemini-3.5-flash-lite','gemini-2.5-flash','gemini-2.5-flash-lite']);
export function geminiSafetyConfig(env=process.env){
  const model=env.GEMINI_MODEL||'gemini-3.5-flash-lite';
  const daily=Number(env.GEMINI_MAX_REQUESTS_PER_DAY||20),monthly=Number(env.GEMINI_MAX_REQUESTS_PER_MONTH||100);
  if(env.GEMINI_ENABLED!=='true'||!env.GEMINI_API_KEY||env.GEMINI_BUDGET_CONFIRMED!=='true'||!MODELS.has(model)||!Number.isInteger(daily)||daily<1||daily>1000||!Number.isInteger(monthly)||monthly<1||monthly>10000)return null;
  return {model,daily,monthly,maxOutputTokens:4096,maxPromptBytes:48000};
}
export class GeminiBudget {
  constructor(store,now=()=>Date.now()){this.store=store;this.now=now;}
  reserve(settings){
    const now=this.now(),date=new Date(now),day=date.toISOString().slice(0,10),month=day.slice(0,7);
    const keys=['gemini:day:'+day,'gemini:month:'+month];
    const expires=[Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()+1),Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)];
    return this.store.mutate(keys,rows=>{
      for(let i=0;i<2;i++){
        const used=rows.get(keys[i]).value.used||0;
        if(!Number.isSafeInteger(used)||used<0)throw unavailable();
        if(used>=[settings.daily,settings.monthly][i])throw Object.assign(Error('Se alcanzó el tope global de IA. Podés seguir usando el plan local.'),{status:429});
      }
      for(let i=0;i<2;i++){const row=rows.get(keys[i]);row.value={used:(row.value.used||0)+1};row.expiresAt=expires[i];}
    },now);
  }
}
export const geminiBudget=new GeminiBudget(securityStore);
