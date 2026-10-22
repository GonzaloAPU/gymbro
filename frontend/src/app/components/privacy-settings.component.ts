import {Component,inject,signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {legalDocuments} from '../services/legal.service';
@Component({standalone:true,imports:[RouterLink],template:`
  <main class="page settings"><h1>Privacidad y permisos</h1>
  <p>Tu peso corporal y tu foto no se publican en el ranking. Si participás, otros usuarios verán tu nombre, kilos levantados, repeticiones y fecha de tu marca.</p>
  <label><input type="checkbox" [checked]="auth.user()?.leaderboardOptIn===true" [disabled]="saving()" (change)="toggle($any($event.target))"> Participar en el ranking público de fuerza</label>
  @if(message()){<p role="status">{{message()}}</p>}
  <p><a routerLink="/consentimiento">Gestionar consentimiento para datos deportivos</a></p>
  <p><a routerLink="/privacidad">Leer política de privacidad</a> · <a routerLink="/terminos">Leer términos de uso</a></p>
  <p>Para solicitar una copia, corrección o eliminación de tus datos y de tu cuenta, escribí a {{email}} desde el correo de tu cuenta. Verificaremos tu identidad; nunca envíes contraseñas.</p>
  <a class="button" [href]="contact">Solicitar acceso o eliminación por correo</a>
  <p>Retirar el permiso deportivo bloquea futuras cargas y te retira del ranking. No borra automáticamente el historial ni las copias de seguridad.</p>
  <a routerLink="/perfil">Volver al perfil</a></main>`,styles:[`.settings{max-width:720px;padding-block:30px 70px}p,label{line-height:1.8;color:var(--muted)}label{display:flex;gap:14px;align-items:center;margin:24px 0}input{min-width:22px;min-height:22px}a{color:var(--lime)}`]})
export class PrivacySettingsComponent {
  readonly auth=inject(AuthService);readonly saving=signal(false);readonly message=signal('');
  readonly email=legalDocuments.email;
  readonly contact='mailto:'+this.email+'?subject='+encodeURIComponent('Gymbro — solicitud sobre mis datos');
  async toggle(input:HTMLInputElement){
    const leaderboardOptIn=input.checked;
    if(this.saving())return;this.saving.set(true);this.message.set('');
    try{await firstValueFrom(this.auth.updateProfile({leaderboardOptIn}));this.message.set(leaderboardOptIn?'Participación habilitada.':'Tus marcas ya no se muestran en el ranking.');}
    catch{this.message.set('No pudimos guardar. Revisá tu conexión y el permiso para datos deportivos.');}
    finally{input.checked=this.auth.user()?.leaderboardOptIn===true;this.saving.set(false);}
  }
}
