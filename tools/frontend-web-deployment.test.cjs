const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fixture({native=false,api='',routing='',saved='https://old.example'}={}){
 const values=new Map([['gymbro.api-server',saved],['smartgymbro_token','session-token']]);
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const signals=initial=>{let value=initial;const read=()=>value;read.set=next=>{value=next;};return read;};
 let endpoint;
 function load(file){
  const exports={};const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
  vm.runInNewContext(source,{exports,URL,localStorage:storage,document:{querySelector:selector=>{const value=selector.includes('api-server')?api:routing;return value?{getAttribute:()=>value}:null;}},require:name=>{
   if(name==='@angular/core')return {Injectable:()=>target=>target,signal:signals,inject:token=>token==='endpoint'?endpoint:{token:'session-token'}};
   if(name==='@capacitor/core')return {Capacitor:{isNativePlatform:()=>native}};
   if(name.includes('api-endpoint.service'))return {ApiEndpointService:'endpoint'};
   if(name.includes('auth.service'))return {AuthService:'auth'};
   return require(name);
  }});return exports;
 }
 const module=load('frontend/src/app/services/api-endpoint.service.ts');
 return {module,values,create:()=>{endpoint=new module.ApiEndpointService();return endpoint;},interceptor:()=>load('frontend/src/app/interceptors/auth.interceptor.ts').authInterceptor};
}
test('web publicada: API HTTPS fija aunque exista una dirección antigua en localStorage',()=>{
 const f=fixture({api:'https://api.example',routing:'hash'}),service=f.create();
 assert.equal(service.url('/api/auth/me'),'https://api.example/api/auth/me');
 assert.equal(service.server(),'https://api.example');assert.equal(f.values.get('smartgymbro_token'),'session-token');
 assert.throws(()=>service.save('https://other.example'),/automáticamente/);
});
test('web publicada: solo las peticiones propias reciben el JWT',()=>{
 const f=fixture({api:'https://api.example'});f.create();const intercept=f.interceptor();
 let sent;const next=request=>{sent=request;return request;};
 const request=url=>({url,clone:changes=>({url,...changes})});
 intercept(request('/api/auth/me'),next);assert.equal(sent.url,'https://api.example/api/auth/me');assert.equal(sent.setHeaders.Authorization,'Bearer session-token');
 for(const url of ['https://other.example/api','//other.example/api','/api-other']){intercept(request(url),next);assert.equal(sent.url,url);assert.equal(sent.setHeaders,undefined);}
});
test('web publicada: rutas hash; desarrollo conserva rutas normales y proxy relativo',()=>{
 assert.equal(fixture({routing:'hash'}).module.webHashRouting(),true);
 const f=fixture();assert.equal(f.module.webHashRouting(),false);assert.equal(f.create().url('/api/auth/me'),'/api/auth/me');
});
test('Android ignora los metadatos de Pages y mantiene su servidor de dispositivo',()=>{
 const f=fixture({native:true,api:'https://web-api.example'});
 f.values.set('gymbro.default-api-version',f.module.DEFAULT_API_SERVER);
 assert.equal(f.create().url('/api/auth/me'),'https://old.example/api/auth/me');
});
for(const api of ['http://api.example','https://user:password@api.example','https://api.example/api','https://api.example/?key=secret'])test('web rechaza API no segura o con ruta/credenciales: '+api.split(':')[0],()=>assert.throws(()=>fixture({api}).create()));
