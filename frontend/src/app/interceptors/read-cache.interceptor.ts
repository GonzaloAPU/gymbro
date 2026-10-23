import {inject} from '@angular/core';
import {HttpInterceptorFn,HttpResponse} from '@angular/common/http';
import {filter,tap} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {ApiEndpointService} from '../services/api-endpoint.service';
import {RequestCache,mutationGroups,readPolicy} from '../services/request-cache';
const cache=new RequestCache();
/** Solo lecturas JSON propias y autenticadas; cada cuenta/servidor tiene un espacio aislado. */
export const readCacheInterceptor:HttpInterceptorFn=(request,next)=>{
  if(!request.url.startsWith('/api/'))return next(request);
  const auth=inject(AuthService),endpoint=inject(ApiEndpointService);
  cache.setScope((endpoint.native?endpoint.server():'proxy')+'|'+(auth.token||''));
  const path=request.url.split('?')[0];
  if(request.method!=='GET'){
    const groups=mutationGroups(path);
    cache.invalidate(groups);
    return next(request).pipe(tap(event=>{if(event instanceof HttpResponse)cache.invalidate(groups);}));
  }
  const policy=readPolicy(path);
  if(!auth.token||!policy||request.responseType!=='json'||request.reportProgress)return next(request);
  return cache.read(request.urlWithParams,policy,()=>next(request).pipe(filter((event):event is HttpResponse<unknown>=>event instanceof HttpResponse)),
    response=>response.clone({body:response.body==null?response.body:JSON.parse(JSON.stringify(response.body))}));
};
