import {inject} from '@angular/core';
import {CanMatchFn} from '@angular/router';
import {AuthService} from '../services/auth.service';
/** Solo las entradas principales ofrecen modo invitado; el resto conserva autorización. */
export const guestEntryGuard:CanMatchFn=()=>!inject(AuthService).isAuthenticated();
