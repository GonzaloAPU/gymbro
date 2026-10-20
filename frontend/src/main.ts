/**
 * Entrada de Angular en el navegador. Arranca AppComponent y registra el cliente HTTP, el interceptor de autenticación y las rutas.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor])), provideRouter(routes)],
}).catch(console.error);
