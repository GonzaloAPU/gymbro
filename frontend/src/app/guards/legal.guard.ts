import {inject} from '@angular/core';
import {CanActivateFn,Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {LegalService} from '../services/legal.service';
/** Sin conexión solo reutiliza un estado confirmado para esta cuenta y versión. */
export const legalGuard:CanActivateFn=async route=>{
  const legal=inject(LegalService),router=inject(Router);
  try{
    const status=await firstValueFrom(legal.status());
    if(status.needsAcceptance||(route.data['sports']&&!status.sportsDataConsent))return router.createUrlTree(['/consentimiento']);
    return true;
  }catch{
    const cached=legal.cachedStatus();
    return cached&&!cached.needsAcceptance&&(!route.data['sports']||cached.sportsDataConsent)?true:router.createUrlTree(['/consentimiento']);
  }
};
