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
import {readCacheInterceptor} from './app/interceptors/read-cache.interceptor';
import { initializeMobile } from './app/mobile';
import {inject,provideAppInitializer} from '@angular/core';
import {ApiEndpointService} from './app/services/api-endpoint.service';

bootstrapApplication(AppComponent, {
  // Configura el servidor antes de recuperar el perfil o iniciar la navegación.
  providers: [provideAppInitializer(()=>{inject(ApiEndpointService);}),provideHttpClient(withInterceptors([readCacheInterceptor,authInterceptor])), provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }))],
}).then(initializeMobile).catch(console.error);
