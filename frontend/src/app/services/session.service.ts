/**
 * Cliente HTTP de entrenamientos. Separa iniciar sesión, agregar ejercicio, crear o reemplazar serie y finalizar. El cronómetro visual se maneja en WorkoutComponent.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Contrato de datos: describe campos y tipos para detectar errores durante la compilación.
export interface TrainingSession {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  calories: number | null;
  totalVolumeKg: number | null;
}

// Contrato de datos: describe campos y tipos para detectar errores durante la compilación.
export interface PerformedExercise { id: string; sessionId: string; exerciseId: string; order: number; }

@Injectable({ providedIn: 'root' })
export class SessionService {
  // Dependencias y estado de la clase: inject obtiene servicios; signal conserva valores reactivos.
  private readonly http = inject(HttpClient);
  /** Crea una sesión de entrenamiento vinculada opcionalmente a un bloque de rutina. */
  start(routineDayId?: string) { return this.http.post<TrainingSession>('/api/sessions', { routineDayId }); }
  /** Registra un ejercicio dentro de una sesión existente y devuelve su identificador para guardar las series. */
  addExercise(sessionId: string, exerciseId: string, order: number) {
    return this.http.post<PerformedExercise>(`/api/sessions/${sessionId}/exercises`, { exerciseId, order });
  }
  /** Crea una serie realizada con sus cargas, repeticiones y tiempos. */
  addSet(sessionId: string, performedExerciseId: string, data: { setNumber: number; weightKg: number; repetitions: number; durationSeconds?: number; actualRestSeconds?: number }) {
    return this.http.post(`/api/sessions/${sessionId}/exercises/${performedExerciseId}/sets`, data);
  }
  /** Marca la sesión como completada y solicita calcular los totales del entrenamiento. */
  finish(sessionId: string, durationSeconds?: number) { return this.http.post<TrainingSession>(`/api/sessions/${sessionId}/finish`, { durationSeconds }); }
  /** Actualiza una serie existente por su número cuando el usuario vuelve a realizarla. */
  replaceSet(sessionId: string, performedExerciseId: string, data: { setNumber: number; weightKg: number; repetitions: number; durationSeconds?: number; actualRestSeconds?: number }) {
    return this.http.put(`/api/sessions/${sessionId}/exercises/${performedExerciseId}/sets/${data.setNumber}`, data);
  }
}
