import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {IpRateLimiter,normalizedIp,ipRateLimit,requestProtection} from '../src/middleware/ip-rate-limit.js';
import {MemorySecurityStore} from '../src/services/security-store.js';
import {trustedProxyHops} from '../src/config.js';
import {errorHandler} from '../src/middleware/error-handler.js';

test('IP: diez solicitudes y la undécima bloquea 60 segundos sin extender el bloqueo',async()=>{
 let now=100000;const store=new MemorySecurityStore(),limiter=new IpRateLimiter(store,()=>now,'test-only');
 for(let i=0;i<10;i++)assert.equal((await limiter.consume('192.0.2.1')).allowed,true);
 assert.deepEqual(await limiter.consume('192.0.2.1'),{allowed:false,retryAfter:60,remaining:0});
 now+=30000;assert.equal((await limiter.consume('192.0.2.1')).retryAfter,30);
 assert.equal((await new IpRateLimiter(store,()=>now,'test-only').consume('192.0.2.1')).allowed,false,'Otra instancia conserva el bloqueo del almacén');
 now+=30000;assert.equal((await limiter.consume('192.0.2.1')).allowed,true);
 assert.ok(!JSON.stringify([...store.entries]).includes('192.0.2.1'),'No persistir IP sin hash');
});
test('IP: ventana móvil no permite veinte llamadas al cruzar un minuto',async()=>{
 let now=59000;const limiter=new IpRateLimiter(new MemorySecurityStore(),()=>now,'test-only');
 for(let i=0;i<10;i++)await limiter.consume('192.0.2.1');now=61000;
 assert.equal((await limiter.consume('192.0.2.1')).allowed,false);
 assert.equal((await limiter.consume('192.0.2.2')).allowed,true);
});
test('IP: solicitudes simultáneas no saltan el límite',async()=>{
 const limiter=new IpRateLimiter(new MemorySecurityStore(),()=>1000,'test-only');
 const results=await Promise.all(Array.from({length:40},()=>limiter.consume('192.0.2.1')));
 assert.equal(results.filter(r=>r.allowed).length,10);
});
test('IP: normaliza IPv4-mapped e IPv6 /56 para impedir rotación de direcciones',()=>{
 assert.equal(normalizedIp('::ffff:192.0.2.1'),normalizedIp('192.0.2.1'));
 assert.equal(normalizedIp('2001:db8:abcd:12ff::1'),normalizedIp('2001:db8:abcd:1200::2'));
 assert.notEqual(normalizedIp('2001:db8:abcd:1300::1'),normalizedIp('2001:db8:abcd:1200::1'));
 assert.equal(normalizedIp('192.0.2.1:9999'),'unknown');
});
test('proxy: solo acepta números de saltos explícitos y no confía en true',()=>{
 assert.equal(trustedProxyHops({}),0);assert.equal(trustedProxyHops({RENDER:'true'}),1);
 for(const value of ['true','all','-1','20'])assert.throws(()=>trustedProxyHops({TRUST_PROXY_HOPS:value}));
});
async function fixture(t,hops=0,store=new MemorySecurityStore()){
 const limiter=new IpRateLimiter(store,()=>100000,'test-only');
 t.mock.method(requestProtection,'consume',req=>limiter.consume(req.ip));
 const app=express();app.set('trust proxy',hops);app.use('/api',ipRateLimit);app.get('/api/health',(_req,res)=>res.json({ok:true}));app.get('/api/test',(_req,res)=>res.json({ok:true}));app.use(errorHandler);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 return headers=>fetch(`http://127.0.0.1:${server.address().port}/api/test`,{headers});
}
test('HTTP: X-Forwarded-For falso no evade el bloqueo en conexión directa',async t=>{
 const request=await fixture(t);
 for(let i=0;i<10;i++)assert.equal((await request({'X-Forwarded-For':'203.0.113.'+i})).status,200);
 const denied=await request({'X-Forwarded-For':'198.51.100.200','Forwarded':'for=198.51.100.200'});
 assert.equal(denied.status,429);assert.equal(denied.headers.get('retry-after'),'60');assert.equal((await denied.json()).code,'IP_RATE_LIMIT');
});
test('HTTP: con un proxy confiable ignora el prefijo falso y usa el salto agregado por el proxy',async t=>{
 const request=await fixture(t,1);
 for(let i=0;i<10;i++)assert.equal((await request({'X-Forwarded-For':`203.0.113.${i}, 192.0.2.10`})).status,200);
 assert.equal((await request({'X-Forwarded-For':'198.51.100.200, 192.0.2.10'})).status,429);
 assert.equal((await request({'X-Forwarded-For':'198.51.100.200, 192.0.2.11'})).status,200);
});
test('HTTP: falla cerrado si el almacén de protección cae y no filtra su error',async t=>{
 t.mock.method(console,'error',()=>{});
 const request=await fixture(t,0,{mutate:async()=>{throw Error('password=private-test-only');}});
 const res=await request({});assert.equal(res.status,503);assert.ok(!(await res.text()).includes('private-test-only'));
});
