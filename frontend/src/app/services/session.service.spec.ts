/**
 * Prueba básica Angular del servicio: configura HttpClientTesting para evitar llamadas reales y comprueba que la inyección de dependencias puede crear la instancia. No verifica todavía todas sus operaciones.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SessionService);
  });
  it('should be created', () => expect(service).toBeTruthy());
});
