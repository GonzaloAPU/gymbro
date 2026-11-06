const test=require('node:test'),assert=require('node:assert/strict');
const {basePath,apiServer,configureIndex}=require('./build-web.cjs');
test('build web: rutas de proyecto y dominio propio conservan la base de los assets',()=>{
 assert.equal(basePath('/gymbro'),'/gymbro/');assert.equal(basePath('/gymbro/'),'/gymbro/');assert.equal(basePath('/'),'/');
});
test('build web: rechaza bases ambiguas o que podrían inyectar HTML',()=>{
 for(const value of ['https://example.com/','//other.example/','/../','/a//b/','/gymbro?x=1/','/"/>'])assert.throws(()=>basePath(value));
});
test('build web: solo inserta API pública HTTPS y navegación hash, sin claves de backend',()=>{
 const html=configureIndex('<html><head><base href="/gymbro/"></head><body></body></html>','https://api.example');
 assert.match(html,/<base href="\/gymbro\/">/);assert.match(html,/name="gymbro-api-server" content="https:\/\/api.example"/);assert.match(html,/name="gymbro-routing" content="hash"/);
 assert.throws(()=>configureIndex(html,'https://api.example'),/ya fue configurado/);
 assert.match(html,/http-equiv="Content-Security-Policy"/);assert.match(html,/script-src 'self'/);assert.ok(!html.includes("'unsafe-eval'"));assert.ok(html.indexOf('Content-Security-Policy')<html.indexOf('<base'));
 for(const value of ['http://api.example','https://u:p@api.example','https://api.example/api','https://api.example/?token=x'])assert.throws(()=>apiServer(value));
});
