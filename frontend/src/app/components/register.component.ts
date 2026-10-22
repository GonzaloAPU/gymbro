/**
 * Formulario de registro: verifica campos y confirmación de contraseña antes de solicitar la cuenta. La validación definitiva se realiza en la API.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  imports: [RouterLink],
  // HTML Angular: {{ }} muestra datos, [propiedad] enlaza valores y (evento) llama métodos.
  // @if y @for controlan bloques visibles y listas; #nombre referencia un elemento del formulario.
  template: `
    <section class="register-page">
      <form class="register-card" (submit)="submit($event, name.value, email.value, password.value, confirmPassword.value)">
        <h2>Creá tu cuenta</h2><p>Después vas a completar tu perfil deportivo.</p>
        <label>Nombre<input #name autocomplete="name" placeholder="¿Cómo te llamás?" minlength="2" required></label>
        <label>Email<input #email type="email" autocomplete="email" placeholder="vos@email.com" required></label>
        <label>Contraseña<input #password type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" minlength="8" required></label>
        <label>Repetir contraseña<input #confirmPassword type="password" autocomplete="new-password" placeholder="Repetí tu contraseña" required></label>
        @if (error()) { <div class="form-error">{{ error() }}</div> }
        <button class="button primary" type="submit" [disabled]="loading()">{{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }} <span>→</span></button>
        <div class="switch">¿Ya tenés cuenta? <a routerLink="/login">Ingresar</a></div>
      </form>
    </section>
  `,
  // CSS de este componente: disposición, colores y estados; @media adapta la vista a pantallas pequeñas.
  styles: [`
    .register-page{min-height:calc(100dvh - 72px);display:flex;align-items:center;width:min(500px,calc(100% - 28px));margin:auto;padding:28px 0}.register-card{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:36px 42px;display:flex;flex-direction:column;width:100%}.register-card h2{font-size:30px;margin:0 0 5px}.register-card>p{color:var(--muted);font-size:13px;margin:0 0 23px}.register-card label{display:flex;flex-direction:column;gap:7px;font-size:11px;font-weight:700;margin-bottom:14px}.register-card input{background:var(--surface-2);border:1px solid var(--line);color:var(--text);border-radius:11px;padding:13px 14px;outline:none}.register-card input:focus{border-color:var(--lime)}.button{margin-top:7px;width:100%;justify-content:space-between}.button:disabled{opacity:.55}.form-error{background:rgba(248,113,113,.1);color:#fca5a5;border-radius:10px;padding:11px;font-size:12px}.switch{text-align:center;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:18px;margin-top:20px}.switch a{color:var(--lime);font-weight:700}@media(max-width:800px){.register-page{min-height:calc(100dvh - 72px);display:flex;align-items:center;width:min(500px,calc(100% - 28px));margin:auto;padding:28px 0}.register-card{padding:28px 24px;width:100%}}
  `],
})
export class RegisterComponent {
  // Dependencias y estado de la clase: inject obtiene servicios; signal conserva valores reactivos.
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false); readonly error = signal('');
  /** Verifica nombre, email y coincidencia de contraseñas; crea la cuenta y lleva al editor del perfil. */
  submit(event: Event, name: string, email: string, password: string, confirmPassword: string): void {
    event.preventDefault();
    if (this.loading()) return;
    if (name.trim().length < 2 || !email || password.length < 8) { this.error.set('Completá todos los campos correctamente'); return; }
    if (password !== confirmPassword) { this.error.set('Las contraseñas no coinciden'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.register({ name: name.trim(), email, password }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => this.router.navigateByUrl('/bienvenida'),
      error: (error: HttpErrorResponse | Error) => { this.error.set(error instanceof HttpErrorResponse ? error.error?.message || 'No pudimos conectar con el servidor. Intentá nuevamente.' : error.message); },
    });
  }
}
