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
