import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard.component';
import { WorkoutRouteComponent } from './components/workout-route.component';
import { ProgressComponent } from './components/progress.component';
import { LoginComponent } from './components/login.component';
import { RegisterComponent } from './components/register.component';
import { ProfileComponent } from './components/profile.component';
import { authGuard } from './guards/auth.guard';
import { RoutineBuilderComponent } from './components/routine-builder.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegisterComponent },
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'entrenamiento', component: WorkoutRouteComponent, canActivate: [authGuard] },
  { path: 'progreso', component: ProgressComponent, canActivate: [authGuard] },
  { path: 'perfil', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'rutinas/nueva', component: RoutineBuilderComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
