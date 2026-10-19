import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TrainingSession {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  calories: number | null;
  totalVolumeKg: number | null;
}

export interface PerformedExercise { id: string; sessionId: string; exerciseId: string; order: number; }

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  start(routineDayId?: string) { return this.http.post<TrainingSession>('/api/sessions', { routineDayId }); }
  addExercise(sessionId: string, exerciseId: string, order: number) {
    return this.http.post<PerformedExercise>(`/api/sessions/${sessionId}/exercises`, { exerciseId, order });
  }
  addSet(sessionId: string, performedExerciseId: string, data: { setNumber: number; weightKg: number; repetitions: number; durationSeconds?: number; actualRestSeconds?: number }) {
    return this.http.post(`/api/sessions/${sessionId}/exercises/${performedExerciseId}/sets`, data);
  }
  finish(sessionId: string, durationSeconds?: number) { return this.http.post<TrainingSession>(`/api/sessions/${sessionId}/finish`, { durationSeconds }); }
  replaceSet(sessionId: string, performedExerciseId: string, data: { setNumber: number; weightKg: number; repetitions: number; durationSeconds?: number; actualRestSeconds?: number }) {
    return this.http.put(`/api/sessions/${sessionId}/exercises/${performedExerciseId}/sets/${data.setNumber}`, data);
  }
}
