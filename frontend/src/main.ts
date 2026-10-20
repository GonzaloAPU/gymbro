/**
 * Entrada de Angular en el navegador. Arranca AppComponent y registra el cliente HTTP, el interceptor de autenticación y las rutas.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { initializeMobile } from './app/mobile';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor])), provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }))],
}).then(initializeMobile).catch(console.error);
