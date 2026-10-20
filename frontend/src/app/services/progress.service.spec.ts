/**
 * Prueba básica Angular del servicio: configura HttpClientTesting para evitar llamadas reales y comprueba que la inyección de dependencias puede crear la instancia. No verifica todavía todas sus operaciones.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProgressService);
  });
  it('should be created', () => expect(service).toBeTruthy());
});
