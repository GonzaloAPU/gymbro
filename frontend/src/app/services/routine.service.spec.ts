import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RoutineService } from './routine.service';

describe('RoutineService', () => {
  let service: RoutineService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RoutineService);
  });
  it('should be created', () => expect(service).toBeTruthy());
});
