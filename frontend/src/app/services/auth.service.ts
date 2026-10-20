/**
 * Estado compartido de autenticación y perfil. localStorage conserva token y perfil entre recargas; las signals actualizan las pantallas. El servidor sigue verificando cada token.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError, timeout } from 'rxjs';

// Contrato de datos: describe campos y tipos para detectar errores durante la compilación.
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  goal: string | null;
  heightCm: number | null;
  currentKg: number | null;
  gymName: string | null;
  discipline: string | null;
  photoUrl: string | null;
  restDays: number[];
}

// Contrato de datos: describe campos y tipos para detectar errores durante la compilación.
interface AuthResponse {
  token: string;
  user: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Dependencias y estado de la clase: inject obtiene servicios; signal conserva valores reactivos.
  private readonly http = inject(HttpClient);
  private readonly userState = signal<UserProfile | null>(this.readUser());

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userState() && this.token));

  /** Lee el JWT guardado en el navegador para adjuntarlo a solicitudes autenticadas. */
  get token(): string | null {
    return localStorage.getItem('smartgymbro_token');
  }

  /** Envía credenciales, aplica un límite de espera y guarda token y usuario cuando la API responde correctamente. */
  login(credentials: { email: string; password: string }) {
    return this.http.post<AuthResponse>('/api/auth/login', credentials).pipe(
      timeout(20000),
      catchError((error) => throwError(() => error.name === 'TimeoutError'
        ? new Error('El servidor tardó demasiado en responder. Intentá nuevamente.') : error)),
      tap((response) => this.saveSession(response)),
    );
  }

  /** Solicita crear la cuenta y guarda la sesión devuelta; convierte la espera excesiva en un mensaje comprensible. */
  register(data: { name: string; email: string; password: string }) {
    return this.http.post<AuthResponse>('/api/auth/register', data).pipe(
      timeout(20000),
      catchError((error) => throwError(() => error.name === 'TimeoutError'
        ? new Error('El servidor tardó demasiado en responder. Intentá nuevamente.') : error)),
      tap((response) => this.saveSession(response)),
    );
  }

  /** Obtiene el perfil actualizado del servidor y sincroniza el almacenamiento y la signal compartida. */
  refreshProfile() {
    return this.http.get<UserProfile>('/api/auth/me').pipe(
      tap((user) => this.saveUser(user)),
    );
  }

  /** Envía únicamente los campos a modificar y guarda el perfil confirmado por el servidor. */
  updateProfile(data: Partial<Pick<UserProfile, 'name' | 'goal' | 'heightCm' | 'currentKg' | 'gymName' | 'discipline' | 'photoUrl' | 'restDays'>>) {
    return this.http.patch<UserProfile>('/api/auth/me', data).pipe(
      tap((user) => this.saveUser(user)),
    );
  }

  /** Borra las credenciales locales y el perfil de la memoria de la aplicación. */
  logout(): void {
    localStorage.removeItem('smartgymbro_token');
    localStorage.removeItem('smartgymbro_user');
    this.userState.set(null);
  }

  /** Guarda el token recibido al autenticar y delega el almacenamiento del perfil. */
  private saveSession(response: AuthResponse): void {
    localStorage.setItem('smartgymbro_token', response.token);
    this.saveUser(response.user);
  }

  /** Sincroniza el perfil de localStorage con el estado reactivo usado por las pantallas. */
  private saveUser(user: UserProfile): void {
    localStorage.setItem('smartgymbro_user', JSON.stringify(user));
    this.userState.set(user);
  }

  /** Recupera el perfil almacenado; si el JSON es inválido, devuelve null en lugar de impedir el arranque. */
  private readUser(): UserProfile | null {
    try {
      const value = localStorage.getItem('smartgymbro_user');
      return value ? JSON.parse(value) as UserProfile : null;
    } catch {
      return null;
    }
  }
}
