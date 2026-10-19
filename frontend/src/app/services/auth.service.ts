import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap, throwError, timeout } from 'rxjs';

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

interface AuthResponse {
  token: string;
  user: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userState = signal<UserProfile | null>(this.readUser());

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userState() && this.token));

  get token(): string | null {
    return localStorage.getItem('smartgymbro_token');
  }

  login(credentials: { email: string; password: string }) {
    return this.http.post<AuthResponse>('/api/auth/login', credentials).pipe(
      timeout(20000),
      catchError((error) => throwError(() => error.name === 'TimeoutError'
        ? new Error('El servidor tardó demasiado en responder. Intentá nuevamente.') : error)),
      tap((response) => this.saveSession(response)),
    );
  }

  register(data: { name: string; email: string; password: string }) {
    return this.http.post<AuthResponse>('/api/auth/register', data).pipe(
      timeout(20000),
      catchError((error) => throwError(() => error.name === 'TimeoutError'
        ? new Error('El servidor tardó demasiado en responder. Intentá nuevamente.') : error)),
      tap((response) => this.saveSession(response)),
    );
  }

  refreshProfile() {
    return this.http.get<UserProfile>('/api/auth/me').pipe(
      tap((user) => this.saveUser(user)),
    );
  }

  updateProfile(data: Partial<Pick<UserProfile, 'name' | 'goal' | 'heightCm' | 'currentKg' | 'gymName' | 'discipline' | 'photoUrl' | 'restDays'>>) {
    return this.http.patch<UserProfile>('/api/auth/me', data).pipe(
      tap((user) => this.saveUser(user)),
    );
  }

  logout(): void {
    localStorage.removeItem('smartgymbro_token');
    localStorage.removeItem('smartgymbro_user');
    this.userState.set(null);
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem('smartgymbro_token', response.token);
    this.saveUser(response.user);
  }

  private saveUser(user: UserProfile): void {
    localStorage.setItem('smartgymbro_user', JSON.stringify(user));
    this.userState.set(user);
  }

  private readUser(): UserProfile | null {
    try {
      const value = localStorage.getItem('smartgymbro_user');
      return value ? JSON.parse(value) as UserProfile : null;
    } catch {
      return null;
    }
  }
}
