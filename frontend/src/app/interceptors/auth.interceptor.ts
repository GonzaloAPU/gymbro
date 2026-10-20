/**
 * Añade el token Bearer a las peticiones /api mediante una copia inmutable de la solicitud. Las demás direcciones siguen su curso sin recibir el token.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).token;
  if (!token || !request.url.startsWith('/api')) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
