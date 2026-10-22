/**
 * Asocia cada URL con una pantalla. canActivate comprueba la sesión antes de entrar; ** captura direcciones desconocidas y redirige al inicio.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard.component';
import { WorkoutRouteComponent } from './components/workout-route.component';
import { ProgressComponent } from './components/progress.component';
import { LoginComponent } from './components/login.component';
import { RegisterComponent } from './components/register.component';
import { ProfileComponent } from './components/profile.component';
import { ProfileViewComponent } from './components/profile-view.component';
import { authGuard } from './guards/auth.guard';
import { RoutineBuilderComponent } from './components/routine-builder.component';
import { ConnectionComponent } from './components/connection.component';
import {welcomeGuard} from './guards/welcome.guard';

export const routes: Routes = [
  { path: 'conexion', component: ConnectionComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'bienvenida', loadComponent:()=>import('./components/welcome.component').then(module=>module.WelcomeComponent),canActivate:[authGuard] },
  { path: '', component: DashboardComponent, canActivate: [authGuard,welcomeGuard] },
  { path: 'entrenamiento', component: WorkoutRouteComponent, canActivate: [authGuard] },
  { path: 'progreso', component: ProgressComponent, canActivate: [authGuard] },
  { path: 'perfil', component: ProfileViewComponent, canActivate: [authGuard] },
  { path: 'perfil/editar', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'rutinas/nueva', component: RoutineBuilderComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
