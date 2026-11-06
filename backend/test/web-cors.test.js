/** Comportamiento del backend existente con FRONTEND_URL del sitio publicado. */
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.FRONTEND_URL='https://gonzaloapu.github.io';
process.env.DATABASE_URL='postgresql://unused:unused@127.0.0.1/unused';
process.env.DB_CONNECTION_MODE='LOCAL';
const {app}=await import('../src/app.js');
async function server(t){const instance=app.listen(0,'127.0.0.1');await new Promise(resolve=>instance.on('listening',resolve));t.after(()=>new Promise(resolve=>instance.close(resolve)));return 'http://127.0.0.1:'+instance.address().port;}
test('web CORS: permite el origen de Pages y conserva Android',async t=>{
 const base=await server(t);
 for(const origin of ['https://gonzaloapu.github.io','https://localhost']){
  const res=await fetch(base+'/api/health',{headers:{Origin:origin}});assert.equal(res.status,200);assert.equal(res.headers.get('access-control-allow-origin'),origin);
 }
});
test('web CORS: preflight permite enviar JSON y Authorization al backend',async t=>{
 const base=await server(t);
 const res=await fetch(base+'/api/auth/login',{method:'OPTIONS',headers:{Origin:'https://gonzaloapu.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
 assert.equal(res.status,204);assert.equal(res.headers.get('access-control-allow-origin'),'https://gonzaloapu.github.io');assert.match(res.headers.get('access-control-allow-headers'),/authorization/i);
});
test('web CORS: no autoriza dominios ajenos que imiten el nombre de Pages',async t=>{
 const base=await server(t);
 const res=await fetch(base+'/api/health',{headers:{Origin:'https://gonzaloapu.github.io.attacker.example'}});assert.equal(res.headers.get('access-control-allow-origin'),null);
});
