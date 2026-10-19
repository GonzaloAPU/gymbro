import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Exercise } from './routine.service';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly http = inject(HttpClient);
  create(data: { name: string; muscleGroup: string; equipment: string; movementPattern: string | null; trainingType: Exercise['trainingType'] }) {
    return this.http.post<Exercise>('/api/exercises', data);
  }
  getCatalog(filters?: { trainingType?: string; muscleGroup?: string }) {
    let params = new HttpParams();
    if (filters?.trainingType) params = params.set('trainingType', filters.trainingType);
    if (filters?.muscleGroup) params = params.set('muscleGroup', filters.muscleGroup);
    return this.http.get<Exercise[]>('/api/exercises', { params });
  }
}
