import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TrainingSession } from './session.service';

export interface WeightEntry { id: string; weightKg: number; recordedAt: string; }
export interface StrengthRecord { id: string; maxWeightKg: number; repetitions: number; estimatedOneRm: number; achievedAt: string; exercise: { name: string }; }
export interface ProgressSummary { sessions: TrainingSession[]; weights: WeightEntry[]; records: StrengthRecord[]; totalCalories: number; completedSessions: number; }
export interface LeaderboardUser { userId: string; name: string; weightKg: number; repetitions: number; achievedAt: string; rank: number; isCurrentUser: boolean; }
export interface ExerciseLeaderboard { key: string; name: string; users: LeaderboardUser[]; }

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly http = inject(HttpClient);
  getSummary() { return this.http.get<ProgressSummary>('/api/progress/summary'); }
  getLeaderboard() { return this.http.get<{exercises: ExerciseLeaderboard[]}>('/api/progress/leaderboard'); }
  addWeight(weightKg: number) { return this.http.post<WeightEntry>('/api/progress/weight', { weightKg }); }
}
