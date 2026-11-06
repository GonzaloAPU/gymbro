import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import ipaddr from 'ipaddr.js';
import {config} from '../config.js';
import {securityStore,unavailable} from '../services/security-store.js';
export const IP_LIMIT=10,IP_WINDOW_MS=60000,IP_BLOCK_MS=60000;
export function normalizedIp(value){
  if(!isIP(value||''))return 'unknown';
  let ip=ipaddr.parse(value);
  if(ip.kind()==='ipv6'&&ip.isIPv4MappedAddress())ip=ip.toIPv4Address();
  if(ip.kind()==='ipv4')return ip.toString();
  const bytes=ip.toByteArray();for(let i=7;i<16;i++)bytes[i]=0;
  return ipaddr.fromByteArray(bytes).toNormalizedString()+'/56';
}
export class IpRateLimiter {
  constructor(store,now=()=>Date.now(),secret=config.jwtSecret){this.store=store;this.now=now;this.secret=secret;this.denied=new Map();this.pending=0;}
  async consume(address){
    const now=this.now(),key='ip:'+createHmac('sha256',this.secret).update(normalizedIp(address)).digest('hex');
    const cached=this.denied.get(key)||0;
    if(cached>now)return {allowed:false,retryAfter:Math.max(1,Math.ceil((cached-now)/1000)),remaining:0};
    if(this.pending>=100)throw unavailable();
    this.pending++;
    let result;
    try{result=await this.store.mutate([key],rows=>{
      const row=rows.get(key),value=row.value;
      const times=value.requests||[],blocked=value.blockedUntil||0;
      if(!Array.isArray(times)||times.length>IP_LIMIT||times.some(t=>!Number.isSafeInteger(t))||!Number.isFinite(blocked))throw unavailable();
      const recent=times.filter(t=>t>now-IP_WINDOW_MS);
      if(blocked>now)return {allowed:false,retryAfter:Math.max(1,Math.ceil((blocked-now)/1000)),remaining:0};
      if(recent.length>=IP_LIMIT){row.value={requests:recent,blockedUntil:now+IP_BLOCK_MS};row.expiresAt=now+IP_BLOCK_MS;return {allowed:false,retryAfter:60,remaining:0};}
      recent.push(now);row.value={requests:recent,blockedUntil:0};row.expiresAt=now+IP_WINDOW_MS;
      return {allowed:true,remaining:IP_LIMIT-recent.length,resetAfter:Math.max(1,Math.ceil((recent[0]+IP_WINDOW_MS-now)/1000))};
    },now);}finally{this.pending--;}
    if(!result.allowed){
      if(this.denied.size>=10000)for(const [id,until]of this.denied)if(until<=now)this.denied.delete(id);
      if(this.denied.size<10000)this.denied.set(key,now+result.retryAfter*1000);
    }
    return result;
  }
}
const limiter=new IpRateLimiter(securityStore);
export const requestProtection={consume:req=>limiter.consume(req.ip||req.socket.remoteAddress)};
export async function ipRateLimit(req,res,next){
  if(req.method==='OPTIONS'||(req.method==='GET'&&req.path==='/health'))return next();
  try{
    const result=await requestProtection.consume(req);
    res.set({'RateLimit-Limit':String(IP_LIMIT),'RateLimit-Remaining':String(result.remaining)});
    if(!result.allowed){res.set('Retry-After',String(result.retryAfter));return res.status(429).json({code:'IP_RATE_LIMIT',retryAfter:result.retryAfter,message:'Se alcanzó el límite de solicitudes. Esperá un minuto antes de continuar.'});}
    res.set('RateLimit-Reset',String(result.resetAfter));next();
  }catch{next(unavailable());}
}
