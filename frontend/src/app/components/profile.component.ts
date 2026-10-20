/**
 * Editor de nombre, objetivo, medidas, gimnasio y disciplina. Convierte entradas numéricas y guarda los cambios mediante AuthService.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  // HTML Angular: {{ }} muestra datos, [propiedad] enlaza valores y (evento) llama métodos.
  // @if y @for controlan bloques visibles y listas; #nombre referencia un elemento del formulario.
  template: `
    <section class="page profile">
      <a class="back-home button ghost" routerLink="/">← Volver al inicio</a>
      <div class="profile-head"><div><span class="kicker">TU CUENTA</span><h1>Perfil deportivo</h1><p>Estos datos ayudan a personalizar tus rutinas y métricas.</p></div><div class="identity"><span>{{ initials }}</span><div><strong>{{ auth.user()?.name }}</strong><small>{{ auth.user()?.email }}</small></div></div></div>
      <form (submit)="save($event, name.value, heightCm.value, currentKg.value, gymName.value, goal.value, discipline.value)">
        <div class="section-title"><span>01</span><div><h2>Datos personales</h2><p>Información básica de tu cuenta.</p></div></div>
        <div class="fields"><label>Nombre<input #name [value]="auth.user()?.name" minlength="2" required></label><label>Email<input [value]="auth.user()?.email" disabled></label></div>
        <div class="section-title"><span>02</span><div><h2>Perfil deportivo</h2><p>Usamos estos datos para calcular y recomendar.</p></div></div>
        <div class="fields"><label>Altura (cm)<input #heightCm type="number" [value]="auth.user()?.heightCm || ''" min="100" max="250"></label><label>Peso actual (kg)<input #currentKg type="number" step="0.1" [value]="auth.user()?.currentKg || ''" min="1" max="500"></label></div>
        <div class="fields affiliation"><label>Gimnasio al que pertenecés<input #gymName [value]="auth.user()?.gymName || ''" maxlength="120" placeholder="Ej. Smart Gym Centro"><small>Opcional · nombre de tu gimnasio, club o centro deportivo.</small></label><label>Tu disciplina deportiva<input #discipline [value]="auth.user()?.discipline || ''" maxlength="120" placeholder="Ej. futbolista, karateca, nadador…"><small>Definila con tus propias palabras.</small></label></div>
        <label class="wide">Objetivo<textarea #goal rows="3" placeholder="Ej. ganar fuerza y masa muscular">{{ auth.user()?.goal || '' }}</textarea></label>
        @if (error()) { <div class="message error">{{ error() }}</div> } @if (message()) { <div class="message success">{{ message() }}</div> }
        <div class="form-actions"><button class="button primary" type="submit" [disabled]="loading()">{{ loading() ? 'Guardando…' : 'Guardar cambios' }}</button></div>
      </form>
    </section>
  `,
  // CSS de este componente: disposición, colores y estados; @media adapta la vista a pantallas pequeñas.
  styles: [`
    .back-home{margin-bottom:24px}.affiliation{margin-top:22px}.affiliation small{color:var(--muted);font-weight:400;line-height:1.5}.profile{padding-top:54px;padding-bottom:80px}.kicker{color:var(--lime);font-size:11px;letter-spacing:.18em;font-weight:800}.profile-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:36px}.profile-head h1{font-size:48px;letter-spacing:-.045em;margin:9px 0}.profile-head p,.section-title p{color:var(--muted);margin:0}.identity{display:flex;align-items:center;gap:13px}.identity>span{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--lime);color:#0a130d;font-weight:800}.identity div{display:flex;flex-direction:column}.identity small{color:var(--muted);margin-top:4px}form{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:clamp(24px,4vw,44px)}.section-title{display:flex;gap:18px;align-items:start;border-top:1px solid var(--line);padding-top:30px;margin:34px 0 22px}.section-title:first-child{border-top:0;padding-top:0;margin-top:0}.section-title>span{font:700 12px monospace;color:var(--lime);padding-top:5px}.section-title h2{font-size:20px;margin:0 0 5px}.section-title p{font-size:12px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.fields.three{grid-template-columns:repeat(3,1fr)}label{display:flex;flex-direction:column;gap:8px;font-size:11px;font-weight:700}.wide{margin-top:16px}input,textarea{background:var(--surface-2);border:1px solid var(--line);color:var(--text);border-radius:11px;padding:13px 14px;outline:none;resize:vertical}input:focus,textarea:focus{border-color:var(--lime)}input:disabled{opacity:.55}.form-actions{display:flex;justify-content:flex-end;border-top:1px solid var(--line);padding-top:24px;margin-top:28px}.message{border-radius:10px;padding:11px;font-size:12px;margin-top:15px}.error{background:rgba(248,113,113,.1);color:#fca5a5}.success{background:rgba(163,230,53,.1);color:var(--lime)}@media(max-width:720px){.profile-head{align-items:start}.identity{display:none}.profile-head h1{font-size:38px}.fields,.fields.three{grid-template-columns:1fr}}
  `],
})
export class ProfileComponent {
  // Dependencias y estado de la clase: inject obtiene servicios; signal conserva valores reactivos.
  readonly auth = inject(AuthService);
  readonly loading = signal(false); readonly error = signal(''); readonly message = signal('');
  /** Obtiene hasta dos iniciales del nombre para el avatar que se muestra como alternativa a una foto. */
  get initials(): string { return (this.auth.user()?.name || 'U').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  /** Convierte las entradas del formulario, envía el perfil y muestra el resultado sin recargar la página. */
  save(event: Event, name: string, heightCm: string, currentKg: string, gymName: string, goal: string, discipline: string): void {
    event.preventDefault();
    if (name.trim().length < 2) { this.error.set('Ingresá un nombre válido'); return; }
    this.loading.set(true); this.error.set(''); this.message.set('');
    this.auth.updateProfile({
      name: name.trim(), heightCm: heightCm ? Number(heightCm) : null,
      currentKg: currentKg ? Number(currentKg) : null, gymName: gymName.trim() || null,
      goal: goal.trim() || null,
      discipline: discipline.trim() || null,
    }).subscribe({
      next: () => { this.message.set('Perfil actualizado correctamente'); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(error.error?.message || 'No pudimos guardar los cambios'); this.loading.set(false); },
    });
  }
}
