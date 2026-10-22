const test=require('node:test'),assert=require('node:assert/strict');
const {of,throwError}=require('rxjs');
const {loadComponent}=require('./test-support/frontend.cjs');
function register(){
  const state={sent:[],routes:[]};
  const {RegisterComponent}=loadComponent('frontend/src/app/components/register.component.ts',{auth:{register:body=>{state.sent.push(body);return of({});}},router:{navigateByUrl:path=>state.routes.push(path)}});
  const screen=new RegisterComponent();
  return {screen,state,submit:()=>screen.submit({preventDefault(){}},'Ana','ana@example.test','Password1!','Password1!')};
}
test('legal UI: todas las casillas empiezan sin marcar',()=>{const {screen}=register();for(const field of ['terms','privacy','adult','sports'])assert.equal(screen[field](),false);});
for(const missing of ['terms','privacy','adult'])test('legal UI: exige '+missing+' antes del registro',()=>{const {screen,state,submit}=register();for(const field of ['terms','privacy','adult'])screen[field].set(field!==missing);submit();assert.equal(state.sent.length,0);assert.ok(screen.error());});
test('legal UI: permiso deportivo es opcional y no fuerza la bienvenida',()=>{const {screen,state,submit}=register();for(const field of ['terms','privacy','adult'])screen[field].set(true);submit();assert.equal(state.sent[0].legal.sportsDataConsent,false);assert.equal(state.routes[0],'/perfil');});
function guard(status,cache=null,error=false){
  const {legalGuard}=loadComponent('frontend/src/app/guards/legal.guard.ts',{legal:{status:()=>error?throwError(()=>Error('offline')):of(status),cachedStatus:()=>cache},router:{createUrlTree:path=>path[0]}});
  return legalGuard;
}
test('legal guard: cuenta antigua va a leer los documentos',async()=>assert.equal(await guard({needsAcceptance:true})({data:{}}),'/consentimiento'));
test('legal guard: no habilita entrenar sin permiso deportivo',async()=>assert.equal(await guard({needsAcceptance:false,sportsDataConsent:false})({data:{sports:true}}),'/consentimiento'));
test('legal guard: permite consultar perfil sin permiso deportivo',async()=>assert.equal(await guard({needsAcceptance:false,sportsDataConsent:false})({data:{}}),true));
test('legal guard: sin conexión ni comprobación previa no inventa aceptación',async()=>assert.equal(await guard(null,null,true)({data:{}}),'/consentimiento'));
test('legal guard: recupera entrenamiento sin conexión con estado previamente confirmado',async()=>assert.equal(await guard(null,{needsAcceptance:false,sportsDataConsent:true},true)({data:{sports:true}}),true));
