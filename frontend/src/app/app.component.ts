/**
 * Estructura común: navegación, cuenta y acceso flotante a Entrenar. Conserva WorkoutComponent montado y solo lo oculta al navegar para mantener sus relojes y series en memoria.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { WorkoutComponent } from './components/workout.component';
import { WorkoutRouteComponent } from './components/workout-route.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, WorkoutComponent],
  // HTML Angular: {{ }} muestra datos, [propiedad] enlaza valores y (evento) llama métodos.
  // @if y @for controlan bloques visibles y listas; #nombre referencia un elemento del formulario.
  template: `
    <header class="topbar">
      <a class="brand" routerLink="/">
        <span class="brand-mark">SG</span>
        <span>SmartGymBro <small>AI</small></span>
      </a>
      @if (auth.isAuthenticated()) {
        <nav>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Inicio</a>
          <a routerLink="/entrenamiento" routerLinkActive="active">Entrenar</a>
          <a routerLink="/progreso" routerLinkActive="active">Progreso</a>

        </nav>
        <div class="account"><a class="avatar" routerLink="/perfil">{{ initials }}</a><button type="button" (click)="logout()">Salir</button></div>
      } @else {
        <div class="guest-links"><a routerLink="/login">Ingresar</a><a class="join" routerLink="/registro">Crear cuenta</a></div>
      }
    </header>
    <main>
      <router-outlet (activate)="onRouteActivated($event)" />
      @if (auth.isAuthenticated() && workoutVisited()) {
        <app-workout [visible]="workoutVisible()" [hidden]="!workoutVisible()" />
      }
    </main>
    @if (auth.isAuthenticated() && !workoutVisible() && !editingForm) {
      <a class="workout-fab" routerLink="/entrenamiento" aria-label="Ir a entrenar" title="Ir a entrenar">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g transform="rotate(-35 16 16)"><path d="M11 16h10"/><rect x="6" y="8" width="5" height="16" rx="1.5"/><rect x="21" y="8" width="5" height="16" rx="1.5"/><path d="M3 12v8m26-8v8"/></g></svg>
      </a>
    }
    @if (auth.isAuthenticated()) {
      <nav class="mobile-nav" aria-label="Navegación principal">
        <a routerLink="/" routerLinkActive="selected" [routerLinkActiveOptions]="{exact:true}" ariaCurrentWhenActive="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/></svg>Inicio</a>
        <a routerLink="/entrenamiento" routerLinkActive="selected" ariaCurrentWhenActive="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8M5 6h3v12H5zM16 6h3v12h-3zM2 9v6m20-6v6"/></svg>Entrenar</a>
        <a routerLink="/progreso" routerLinkActive="selected" ariaCurrentWhenActive="page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18M7 15l5-5 4 2 5-7"/></svg>Progreso</a>
        <a routerLink="/perfil" routerLinkActive="selected" ariaCurrentWhenActive="page"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/></svg>Perfil</a>
      </nav>
    }
  `,
  // CSS de este componente: disposición, colores y estados; @media adapta la vista a pantallas pequeñas.
  styles: [`
    .mobile-nav a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:64px;min-height:56px}.mobile-nav svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.mobile-nav a.selected{color:var(--lime)}
    .workout-fab{position:fixed;right:clamp(20px,4vw,48px);bottom:28px;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;background:var(--lime);color:#0b130d;border:2px solid #d9f99d;box-shadow:0 8px 30px #0007;z-index:30;transition:transform .15s,box-shadow .15s}.workout-fab svg{width:36px;height:36px}.workout-fab:hover{transform:translateY(-3px);box-shadow:0 12px 35px #a3e63530}.workout-fab:focus-visible{outline:3px solid var(--text);outline-offset:4px}@media(max-width:680px){.workout-fab{bottom:calc(80px + env(safe-area-inset-bottom));right:18px;width:56px;height:56px}}.topbar{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,72px);border-bottom:1px solid var(--line);background:rgba(9,13,24,.88);backdrop-filter:blur(18px);position:sticky;top:0;z-index:10}.brand{display:flex;align-items:center;gap:12px;color:var(--text);font-weight:800;font-size:18px}.brand small{color:var(--lime)}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--lime);color:#08110d;font-size:13px}nav{display:flex;gap:34px}nav a{color:var(--muted);font-weight:600;font-size:14px}.active,nav a:hover{color:var(--text)!important}.account{display:flex;align-items:center;gap:10px}.avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);color:var(--text);font-weight:700;font-size:13px}.account button{background:transparent;border:0;color:var(--muted);cursor:pointer;font-size:12px}.account button:hover{color:var(--text)}.guest-links{display:flex;align-items:center;gap:18px}.guest-links a{color:var(--muted);font-size:13px;font-weight:700}.guest-links .join{background:var(--lime);color:#0a130d;padding:10px 14px;border-radius:10px}.mobile-nav{display:none}@media(max-width:680px){.topbar nav{display:none}.topbar{height:62px;padding:0 18px}.account button{display:none}.mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;height:64px;background:#0d1320;border-top:1px solid var(--line);z-index:20;align-items:center;justify-content:space-around}.mobile-nav a{font-size:13px}main{padding-bottom:72px}}
    /* Estos estilos viven en el componente para respetar la encapsulación de Angular. */
    @media(max-width:680px){
      .topbar{height:calc(62px + env(safe-area-inset-top));padding-top:env(safe-area-inset-top);padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right))}
      .brand{font-size:15px;gap:8px}.guest-links{gap:10px}.guest-links a{font-size:12px}
      .account button{display:block;min-height:44px;min-width:44px}
      main{padding-bottom:calc(86px + env(safe-area-inset-bottom))}
      .mobile-nav{height:calc(72px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);gap:0}
      .mobile-nav a{font-size:11px;flex:1}
    }
  `],
})
export class AppComponent {
  // Dependencias y estado de la clase: inject obtiene servicios; signal conserva valores reactivos.
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly workoutVisible = signal(false);
  readonly workoutVisited = signal(false);

  /** Registra un efecto que descarta el entrenamiento montado cuando la cuenta deja de estar autenticada. */
  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) this.workoutVisited.set(false);
    });
  }
  /** Detecta si la ruta es Entrenar y decide si mostrar la instancia persistente o mantenerla oculta. */
  onRouteActivated(component: unknown): void {
    const isWorkout = component instanceof WorkoutRouteComponent;
    this.workoutVisible.set(isWorkout);
    if (isWorkout && this.auth.isAuthenticated()) this.workoutVisited.set(true);
  }
  /** Obtiene hasta dos iniciales del nombre para el avatar que se muestra como alternativa a una foto. */
  get initials(): string { return (this.auth.user()?.name || 'U').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
  /** La barra inferior ya permite ir a Entrenar; durante la edición evitamos tapar el botón Continuar. */
  get editingForm(): boolean { return this.router.url.startsWith('/rutinas/nueva') || this.router.url.startsWith('/perfil/editar'); }
  /** Descarta la vista de entrenamiento, cierra la sesión local y navega al formulario de ingreso. */
  logout(): void { this.workoutVisited.set(false); this.auth.logout(); this.router.navigateByUrl('/login'); }
}
