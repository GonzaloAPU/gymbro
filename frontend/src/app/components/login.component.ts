import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { finalize } from 'rxjs';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="auth-page">
      <div class="auth-copy">
        <span class="kicker">VOLVÉ A TU PROGRESO</span>
        <h1>Entrená con<br><em>intención.</em></h1>
        <p>Tu rutina, tus cargas y cada pequeña mejora, en un solo lugar.</p>
        <div class="proof"><strong>8</strong><span>días de racha<br>en la cuenta demo</span></div>
      </div>
      <form class="auth-card" (submit)="submit($event, email.value, password.value)">
        <span class="kicker">INICIAR SESIÓN</span>
        <h2>Hola de nuevo.</h2>
        <p>Ingresá con tu cuenta para continuar.</p>
        <label>Email<input #email type="email" autocomplete="email" placeholder="vos@email.com" required></label>
        <label>Contraseña<input #password type="password" autocomplete="current-password" placeholder="Mínimo 8 caracteres" minlength="8" required></label>
        @if (error()) { <div class="form-error">{{ error() }}</div> }
        <button class="button primary" type="submit" [disabled]="loading()">{{ loading() ? 'Ingresando…' : 'Ingresar' }} <span>→</span></button>
        <button class="demo" type="button" (click)="useDemo(email, password)">Usar cuenta demo</button>
        <div class="switch">¿No tenés cuenta? <a routerLink="/registro">Crear cuenta</a></div>
      </form>
    </section>
  `,
  styles: [loginStyles()],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly loading = signal(false);
  readonly error = signal('');
  submit(event: Event, email: string, password: string): void {
    event.preventDefault();
    if (!email || password.length < 8) { this.error.set('Completá email y contraseña'); return; }
    this.loading.set(true); this.error.set('');
    this.auth.login({ email, password }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (error: HttpErrorResponse | Error) => { this.error.set(error instanceof HttpErrorResponse ? error.error?.message || 'No pudimos conectar con el servidor. Intentá nuevamente.' : error.message); },
    });
  }

  useDemo(email: HTMLInputElement, password: HTMLInputElement): void {
    email.value = 'demo@smartgymbro.app'; password.value = 'Demo1234!';
    this.submit(new Event('submit'), email.value, password.value);
  }
}

function loginStyles(): string {
  return `
  .auth-page{min-height:calc(100vh - 72px);display:grid;grid-template-columns:1.15fr .85fr;gap:8vw;align-items:center;width:min(1120px,calc(100% - 40px));margin:auto;padding:55px 0}.kicker{color:var(--lime);font-size:11px;letter-spacing:.18em;font-weight:800}.auth-copy h1{font-size:clamp(54px,7vw,88px);line-height:.95;letter-spacing:-.065em;margin:18px 0}.auth-copy h1 em{font-style:normal;color:var(--lime)}.auth-copy>p{color:var(--muted);max-width:470px;font-size:17px;line-height:1.6}.proof{display:flex;align-items:center;gap:15px;margin-top:42px}.proof strong{font-size:46px;color:var(--lime)}.proof span{color:var(--muted);font-size:12px;line-height:1.5}.auth-card{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:clamp(26px,4vw,44px);display:flex;flex-direction:column}.auth-card h2{font-size:34px;margin:10px 0 4px}.auth-card>p{color:var(--muted);margin:0 0 28px;font-size:14px}.auth-card label{display:flex;flex-direction:column;gap:8px;font-size:12px;font-weight:700;margin-bottom:17px}.auth-card input{background:var(--surface-2);border:1px solid var(--line);color:var(--text);border-radius:12px;padding:14px 15px;outline:none}.auth-card input:focus{border-color:var(--lime)}.auth-card .button{margin-top:8px;width:100%;justify-content:space-between}.auth-card .button:disabled{opacity:.55}.form-error{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.25);color:#fca5a5;border-radius:10px;padding:11px;font-size:12px;margin-bottom:8px}.demo{border:0;background:transparent;color:var(--muted);font-size:12px;padding:15px;cursor:pointer}.demo:hover{color:var(--text)}.switch{text-align:center;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:19px}.switch a{color:var(--lime);font-weight:700}@media(max-width:760px){.auth-page{grid-template-columns:1fr;padding:35px 0}.auth-copy{display:none}.auth-card{max-width:500px;width:100%;margin:auto}}
`;
}
