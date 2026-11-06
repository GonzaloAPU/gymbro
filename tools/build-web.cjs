/** Compila solo archivos públicos para hosting estático. No lee ni copia .env. */
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const DEFAULT_API='https://gymbro-api-t7mg.onrender.com';
function basePath(value='/gymbro/'){
  const text=value.trim();
  if(!/^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(text)||text.includes('//')||text.split('/').some(part=>part==='.'||part==='..'))throw Error('GYMBRO_WEB_BASE_PATH debe ser una ruta como /gymbro/ o /.');
  return text==='/'?'/':text.replace(/\/$/,'')+'/';
}
function apiServer(value=DEFAULT_API){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('GYMBRO_WEB_API_URL debe ser el origen HTTPS público de la API, sin claves ni rutas.');
  return url.origin;
}
function configureIndex(html,api){
  const origin=apiServer(api);
  if(!html.includes('</head>'))throw Error('La compilación no contiene un index.html válido.');
  if(html.includes('name="gymbro-api-server"'))throw Error('El index ya fue configurado; compilar de nuevo antes de prepararlo.');
  return html.replace('</head>',`<meta name="gymbro-api-server" content="${origin}"><meta name="gymbro-routing" content="hash"></head>`);
}
function build(){
  const base=basePath(process.env.GYMBRO_WEB_BASE_PATH||'/gymbro/');
  const api=apiServer(process.env.GYMBRO_WEB_API_URL||DEFAULT_API);
  const result=spawnSync(process.execPath,[path.join(root,'node_modules/@angular/cli/bin/ng.js'),'build','--configuration','production','--base-href',base,'--output-path','dist/gymbro-web'],{cwd:path.join(root,'frontend'),stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0){process.exitCode=result.status??1;return;}
  const output=path.join(root,'frontend/dist/gymbro-web/browser');
  const index=path.join(output,'index.html');
  fs.writeFileSync(index,configureIndex(fs.readFileSync(index,'utf8'),api));
  fs.writeFileSync(path.join(output,'.nojekyll'),'');
  console.log(`Web lista: ${output}\nRuta base: ${base}\nAPI pública: ${api}`);
}
module.exports={basePath,apiServer,configureIndex};
if(require.main===module){try{build();}catch(error){console.error(error.message);process.exitCode=1;}}
