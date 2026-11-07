import {Component,OnDestroy,ViewChild,inject,signal,ChangeDetectionStrategy} from '@angular/core';
import {RouterLink} from '@angular/router';
import {of} from 'rxjs';
import {WorkoutComponent} from './workout.component';
import {AlarmSettingsComponent} from './alarm-settings.component';
import {GuestWorkoutStore} from '../services/guest-workout.store';
import {WorkoutStorageService} from '../services/workout-storage.service';
import {RoutineService} from '../services/routine.service';
import {SessionService} from '../services/session.service';
import {AlarmService} from '../services/alarm.service';
import {guestCatalog} from '../services/guest-catalog';
import {GuestForm,guestGroups,guestEquipment,guestCandidates,matchesGuestGroup,makeGuestRoutine} from '../services/guest-planner';

@Component({selector:'app-guest-workout',standalone:true,imports:[RouterLink,WorkoutComponent,AlarmSettingsComponent],
 providers:[GuestWorkoutStore,{provide:WorkoutStorageService,useExisting:GuestWorkoutStore},SessionService,
  {provide:RoutineService,useFactory:(store:GuestWorkoutStore)=>({getAll:()=>of(store.today())}),deps:[GuestWorkoutStore]}],
 changeDetection:ChangeDetectionStrategy.Eager,
 template:`
 <section class="page guest-page" [class.training-ready]="ready()">
 @if(!ready()){
  <span class="kicker">ENTRENÁ SIN CUENTA</span>
  <h1>¿Qué entrenamos hoy?</h1>
  <p>Armá tu entrenamiento del día y cambiá los ejercicios a tu gusto.</p>
 }
  @if(store.storageError()){<p class="error" role="alert">{{store.storageError()}}</p>@if(!ready()){<button class="button ghost" type="button" (click)="clearBroken()">Borrar respaldo local</button>}}
  @if(!ready()){
   <strong class="guest-clock" aria-label="Cronómetro sin iniciar">00:00:00.000</strong>
   <form (submit)="prepare($event)">
    <fieldset><legend>Grupos musculares</legend><div class="choices">@for(group of groups;track group){<label><input type="checkbox" [checked]="form.groups.includes(group)" (change)="toggleGroup(group)"/>{{group}}</label>}</div></fieldset>
    <div class="fields"><label>¿Dónde entrenás?<select [value]="place" (change)="changePlace($any($event.target).value)"><option value="GYM">Gimnasio</option><option value="HOME">Casa</option><option value="PARK">Parque</option></select></label><label>Tiempo disponible<select [value]="form.minutes" (change)="form.minutes=+$any($event.target).value"><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">60 minutos</option><option value="75">75 minutos</option></select></label><label>Experiencia<select [value]="form.experience" (change)="form.experience=$any($event.target).value"><option value="BEGINNER">Estoy empezando o retomando</option><option value="REGULAR">Entreno habitualmente</option></select></label></div>
    <fieldset><legend>Equipamiento disponible</legend><p>El peso corporal siempre está incluido. Marcá solo lo que tenés.</p><div class="choices">@for(item of equipment;track item.id){<label><input type="checkbox" [checked]="form.equipment.includes(item.id)" (change)="toggleEquipment(item.id)"/>{{item.label}}</label>}</div></fieldset>
    <p>Prepararemos al menos 4 ejercicios de 3 series. El tiempo real depende de tus pausas y del ritmo de cada serie.</p>
    @if(error()){<p class="error" role="alert">{{error()}}</p>}
    <button class="button primary" type="submit">Preparar mi entrenamiento</button>
    @if(store.routine){<button class="button ghost" type="button" (click)="ready.set(true)">Volver a mi entrenamiento actual</button>}
   </form>
  }
 </section>
 @if(ready()){<app-workout [guestMode]="true"/>
 <section class="page guest-page guest-secondary" aria-label="Opciones del entrenamiento invitado">
   <div class="guest-tools"><p>Tu entrenamiento más reciente se conserva en este dispositivo. Para llevar un historial entre entrenamientos, <a routerLink="/registro">creá una cuenta</a>.</p><button type="button" class="button ghost" (click)="newWorkout()" [disabled]="workout?.saving()">Preparar otro entrenamiento</button></div>
   <details class="replacements"><summary>Cambiar ejercicios</summary><p>Podés reemplazar los que todavía no empezaste por otros del mismo grupo. Terminá la serie o el descanso en curso antes de cambiarlos.</p>
    @for(item of store.routine!.days[0].exercises;track item.id;let i=$index){<label>{{i+1}}. {{item.exercise.name}}<select [value]="workout?.exercises?.[i]?.id || item.exercise.id" [disabled]="!workout?.canReplaceGuestExercise(i)" (change)="replace(i,$any($event.target).value)">@for(candidate of alternatives(i);track candidate.id){<option [value]="candidate.id">{{candidate.name}} · {{candidate.equipment}}</option>}</select></label>}
   </details>
   <details><summary>Sonidos y alarmas</summary><app-alarm-settings/></details>
   @if(error()){<p class="error" role="alert">{{error()}}</p>}
 </section>
 }
 <section class="page guest-page guest-footer">
  <p class="local-note">Entrenamiento generado en tu dispositivo, sin IA. No se envían tus series al servidor. Los videos se abren en YouTube.</p>
 </section>
 `,
 styles:[`.guest-page{padding-top:32px;max-width:1100px}.training-ready{padding-top:0}.training-ready:empty{display:none}.guest-secondary{padding-top:0}.guest-footer{padding-top:0}.kicker{color:var(--lime);font-size:12px;font-weight:800}h1{font-size:clamp(28px,5vw,40px)}p{color:var(--muted);line-height:1.6}.guest-clock{display:block;font:700 clamp(24px,5vw,36px) monospace;margin:28px 0}form,.replacements,.guest-tools{padding:24px;border:1px solid var(--line);border-radius:20px;background:var(--surface);margin:18px 0}fieldset{border:1px solid var(--line);border-radius:12px;padding:18px;margin:16px 0}legend{font-weight:700}.choices{display:flex;flex-wrap:wrap;gap:12px}.choices label{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;min-height:44px;cursor:pointer}input{accent-color:var(--lime);width:20px;height:20px}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px}label{display:flex;flex-direction:column;gap:8px;font-size:14px}select{width:100%;background:var(--surface-2);color:var(--text);padding:13px;border:1px solid var(--line);border-radius:10px;min-height:44px}.replacements label{margin:16px 0}select:disabled{opacity:.6}summary{cursor:pointer;padding:14px 0;font-weight:700;min-height:44px}.local-note{font-size:12px}.error{color:#fca5a5}a{color:var(--lime)}.guest-tools{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.guest-tools p{flex:1;min-width:200px}@media(max-width:600px){form,.replacements,.guest-tools{padding:16px}.choices label{flex:1 1 125px}}`]
})
export class GuestWorkoutComponent implements OnDestroy {
 readonly store=inject(GuestWorkoutStore);private readonly alarms=inject(AlarmService);
 @ViewChild(WorkoutComponent) workout?:WorkoutComponent;
 readonly groups=guestGroups;readonly equipment=guestEquipment;readonly error=signal('');
 readonly ready=signal(!!this.store.routine);
 place='GYM';form:GuestForm=structuredClone(this.store.form||{groups:[],equipment:guestEquipment.map(e=>e.id),minutes:45,experience:'BEGINNER'});
 constructor(){this.alarms.setGuestActive(true);}
 ngOnDestroy(){this.alarms.setGuestActive(false);}
 toggleGroup(group:string){this.form.groups=this.form.groups.includes(group)?this.form.groups.filter(g=>g!==group):[...this.form.groups,group];}
 toggleEquipment(id:string){this.form.equipment=this.form.equipment.includes(id)?this.form.equipment.filter(e=>e!==id):[...this.form.equipment,id];}
 changePlace(place:string){this.place=place;this.form.equipment=place==='GYM'?guestEquipment.map(e=>e.id):place==='PARK'?['pullup','parallel']:[];}
 prepare(event:Event){event.preventDefault();this.error.set('');try{const routine=makeGuestRoutine(guestCatalog,this.form,crypto.randomUUID());this.store.prepare(this.form,routine);this.ready.set(true);window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));}catch(e){this.error.set((e as Error).message);}}
 alternatives(index:number){
  const routine=this.store.routine;if(!routine)return [];
  const items=routine.days[0].exercises,current=items[index].exercise;
  const group=this.form.groups.find(g=>matchesGuestGroup(current,g));if(!group)return [current];
  return guestCandidates(guestCatalog,this.form,group).filter(candidate=>candidate.id===current.id||!items.some(item=>item.exercise.id===candidate.id));
 }
 replace(index:number,id:string){
  const exercise=this.alternatives(index).find(e=>e.id===id);if(!exercise||!this.workout?.canReplaceGuestExercise(index))return;
  const next=structuredClone(this.store.routine!);next.days[0].exercises[index].exercise=exercise;
  try{this.store.updateRoutine(next);this.workout.replaceGuestExercise(index,exercise);this.error.set('');}catch(e){this.error.set((e as Error).message);}
 }
 newWorkout(){if(this.workout?.saving()||!window.confirm('¿Preparar otro entrenamiento? Se reemplazará el entrenamiento local actual y sus series.'))return;this.ready.set(false);this.error.set('');}
 clearBroken(){try{this.store.clear();this.error.set('');}catch{this.error.set('No pudimos borrar el respaldo del dispositivo.');}}
}
