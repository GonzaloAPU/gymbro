import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Exercise {
  movementPattern?: string | null;
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  trainingType: 'POWER' | 'AEROBIC' | 'ANAEROBIC';
}

export interface RoutineExercise {
  id: string;
  order: number;
  targetSets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
  targetDurationMinutes: number | null;
  targetDistanceKm: number | null;
  intensity: 'BAJA' | 'MEDIA' | 'ALTA' | null;
  exercise: Exercise;
}

export interface ScheduleSlot { weekday: number; start: string; end: string; }
export interface RoutineDay {
  favorite: boolean;
  schedule: ScheduleSlot[];
  id: string;
  name: string;
  dayNumber: number;
  exercises: RoutineExercise[];
}

export interface Routine {
  createdAt: string;
  id: string;
  name: string;
  goal: string;
  active: boolean;
  days: RoutineDay[];
}

@Injectable({ providedIn: 'root' })
export class RoutineService {
  private readonly http = inject(HttpClient);
  getAll() { return this.http.get<Routine[]>('/api/routines'); }
  setFavorite(routineId: string, dayId: string, favorite: boolean) {
    return this.http.patch<{favorite: boolean}>(`/api/routines/${routineId}/days/${dayId}/favorite`, { favorite });
  }
  assignSchedule(routineId: string, dayId: string, schedule: ScheduleSlot[]) {
    return this.http.put<{schedule: ScheduleSlot[]}>(`/api/routines/${routineId}/days/${dayId}/schedule`, { schedule });
  }
  create(data: {
    name: string;
    goal: string;
    days: Array<{
      name: string;
      dayNumber: number;
      exercises: Array<{
        exerciseId: string; order: number; targetSets: number; minReps: number; maxReps: number;
        restSeconds: number; targetDurationMinutes: number | null; targetDistanceKm: number | null;
        intensity: 'BAJA' | 'MEDIA' | 'ALTA' | null;
      }>;
    }>;
  }) { return this.http.post<Routine>('/api/routines', data); }
}
