/**
 * Editor de rutinas: carga el catálogo, filtra ejercicios y configura objetivos. Mantiene internamente un único bloque RoutineDay por compatibilidad con el modelo del backend.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ExerciseService } from '../services/exercise.service';
import { Exercise, RoutineService } from '../services/routine.service';

type TrainingType = 'POWER' | 'AEROBIC' | 'ANAEROBIC';
type Intensity = 'BAJA' | 'MEDIA' | 'ALTA';

// Contrato de datos: describe campos y tipos para detectar errores durante la compilación.
interface BuilderItem {
  exercise: Exercise;
  targetSets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
  targetDurationMinutes: number | null;
  targetDistanceKm: number | null;
  intensity: Intensity | null;
}

// Contrato de datos: describe campos y tipos para detectar errores durante la compilación.
interface BuilderDay { name: string; items: BuilderItem[]; }

@Component({
  standalone: true,
  // HTML Angular: {{ }} muestra datos, [propiedad] enlaza valores y (evento) llama métodos.
  // @if y @for controlan bloques visibles y listas; #nombre referencia un elemento del formulario.
  template: `
    <section class="page builder">
      <header class="page-head">
        <div><span class="kicker">PLANIFICACIÓN</span><h1>Crear rutina</h1><p>Elegí ejercicios del catálogo y definí sus objetivos. Asigná los días y horarios desde tu Plan.</p></div>
        <button class="button primary" type="button" (click)="save()" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar rutina' }} <span>→</span></button>
      </header>

      @if (error()) { <div class="notice error">{{error()}}</div> }
      <div class="builder-grid">
        <main class="plan">
          <section class="routine-data">
            <label>Nombre de la rutina<input [value]="routineName()" (input)="routineName.set($any($event.target).value)" placeholder="Ej. Fuerza y resistencia"></label>
            <label>Objetivo principal<select [value]="goal()" (change)="goal.set($any($event.target).value)"><option>Fuerza</option><option>Hipertrofia</option><option>Resistencia</option><option>Cardio</option><option>Rendimiento mixto</option></select></label>
          </section>

          <section class="day-card">
            <h2 class="exercise-list-title">Ejercicios de la rutina</h2>
            <div class="columns"><span>EJERCICIO</span><span>OBJETIVO</span><span></span></div>
            @for (item of currentDay().items; track item.exercise.id; let itemIndex=$index) {
              <article class="exercise-item">
                <div class="exercise-info"><span class="type" [attr.data-type]="item.exercise.trainingType">{{typeLabel(item.exercise.trainingType)}}</span><strong>{{item.exercise.name}}</strong><small>{{item.exercise.muscleGroup}} · {{item.exercise.equipment}}</small></div>
                @if (item.exercise.trainingType === 'POWER') {
                  <div class="targets power"><label>Series<input type="number" min="1" [value]="item.targetSets" (input)="updateNumber(itemIndex,'targetSets',$any($event.target).value)"></label><label>Reps mín.<input type="number" min="1" [value]="item.minReps" (input)="updateNumber(itemIndex,'minReps',$any($event.target).value)"></label><label>Reps máx.<input type="number" min="1" [value]="item.maxReps" (input)="updateNumber(itemIndex,'maxReps',$any($event.target).value)"></label><label>Descanso<input type="number" min="0" [value]="item.restSeconds" (input)="updateNumber(itemIndex,'restSeconds',$any($event.target).value)"></label></div>
                } @else {
                  <div class="targets cardio">@if(item.exercise.trainingType === 'ANAEROBIC'){<label>Rondas<input type="number" min="1" [value]="item.targetSets" (input)="updateNumber(itemIndex,'targetSets',$any($event.target).value)"></label>}<label>Minutos<input type="number" min="1" [value]="item.targetDurationMinutes" (input)="updateNumber(itemIndex,'targetDurationMinutes',$any($event.target).value)"></label><label>Distancia km<input type="number" min="0" step="0.1" [value]="item.targetDistanceKm" (input)="updateNumber(itemIndex,'targetDistanceKm',$any($event.target).value)"></label><label>Intensidad<select [value]="item.intensity" (change)="updateIntensity(itemIndex,$any($event.target).value)"><option value="BAJA">Baja</option><option value="MEDIA">Media</option><option value="ALTA">Alta</option></select></label></div>
                }
                <button class="remove" type="button" (click)="removeExercise(itemIndex)" aria-label="Quitar ejercicio">×</button>
              </article>
            } @empty {<div class="empty"><strong>Todavía no agregaste ejercicios.</strong><span>Seleccioná ejercicios del catálogo para comenzar.</span></div>}
          </section>
        </main>

        <aside class="catalog">
          <div><span class="kicker">CATÁLOGO</span><h2>Ejercicios</h2><p>Elegí uno del catálogo o creá un ejercicio nuevo.</p></div>
          <button type="button" class="new-exercise-toggle" (click)="showExerciseForm.set(!showExerciseForm())" [disabled]="creatingExercise()" [attr.aria-expanded]="showExerciseForm()">＋ Agregar ejercicio nuevo</button>
          @if (showExerciseForm()) {
            <form class="new-exercise-card" (submit)="createExercise($event, exerciseName.value, muscle.value, equipment.value, movement.value, training.value)">
              <h3>Agregar ejercicio</h3>
              <label>Nombre<input #exerciseName required minlength="2" maxlength="255" placeholder="Ej. Sentadilla búlgara" [disabled]="creatingExercise()"></label>
              <label>Grupo muscular<input #muscle required minlength="2" maxlength="255" placeholder="Ej. Piernas" list="exercise-muscles" [disabled]="creatingExercise()"><datalist id="exercise-muscles">@for (group of muscleGroups(); track group) {<option [value]="group"></option>}</datalist></label>
              <label>Equipamiento<input #equipment required minlength="2" maxlength="255" placeholder="Ej. Mancuernas o peso corporal" [disabled]="creatingExercise()"></label>
              <label>Patrón de movimiento (opcional)<input #movement maxlength="255" placeholder="Ej. Sentadilla unilateral" [disabled]="creatingExercise()"></label>
              <label>Tipo de entrenamiento<select #training [disabled]="creatingExercise()"><option value="POWER">Fuerza / Power</option><option value="AEROBIC">Aeróbico</option><option value="ANAEROBIC">Anaeróbico</option></select></label>
              <p>Se guarda en el catálogo y se agrega a tu rutina.</p>
              @if (exerciseError()) {<div class="notice error" role="alert">{{exerciseError()}}</div>}
              <div class="new-exercise-actions"><button type="button" (click)="showExerciseForm.set(false)" [disabled]="creatingExercise()">Cancelar</button><button type="submit" class="button primary" [disabled]="creatingExercise() || saving()">{{creatingExercise() ? 'Guardando…' : 'Guardar ejercicio'}}</button></div>
            </form>
          }
          @if (exerciseMessage()) {<p class="exercise-success" role="status">{{exerciseMessage()}}</p>}
          <label>Tipo de entrenamiento<select [value]="typeFilter()" (change)="typeFilter.set($any($event.target).value)"><option value="ALL">Todos</option><option value="POWER">Fuerza / Power</option><option value="AEROBIC">Aeróbico</option><option value="ANAEROBIC">Anaeróbico</option></select></label>
          <label>Grupo muscular<select [value]="muscleFilter()" (change)="muscleFilter.set($any($event.target).value)"><option value="ALL">Todos los grupos</option>@for(group of muscleGroups();track group){<option [value]="group">{{group}}</option>}</select></label>
          <label>Ejercicio<select #exerciseSelect (change)="addExercise(exerciseSelect.value); exerciseSelect.value=''" value=""><option value="" disabled>Seleccionar de la lista…</option>@for(exercise of filteredExercises();track exercise.id){<option [value]="exercise.id">{{exercise.name}} · {{exercise.equipment}}</option>}</select></label>
          <div class="catalog-list">@for(exercise of filteredExercises();track exercise.id){<button type="button" (click)="addExercise(exercise.id)"><span [attr.data-type]="exercise.trainingType">{{typeLabel(exercise.trainingType)}}</span><div><strong>{{exercise.name}}</strong><small>{{exercise.muscleGroup}} · {{exercise.equipment}}</small></div><b>+</b></button>} @empty {<p>No hay ejercicios con esos filtros.</p>}</div>
        </aside>
      </div>
    </section>
  `,
  // CSS de este componente: disposición, colores y estados; @media adapta la vista a pantallas pequeñas.
  styles: [`
    .new-exercise-toggle{width:100%;border:1px dashed #a3e63565;border-radius:12px;padding:13px;background:#a3e63508;color:var(--lime);font-weight:700;font-size:12px;cursor:pointer;margin-bottom:20px}.new-exercise-card{border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:22px;background:#090d1855}.new-exercise-card h3{margin:0 0 16px;font-size:18px}.new-exercise-card label{display:flex;flex-direction:column;gap:7px;font-size:11px;color:var(--muted);margin-bottom:13px}.new-exercise-card p{font-size:11px;line-height:1.6;margin-bottom:12px}.new-exercise-actions{display:flex;align-items:center;justify-content:space-between;gap:10px}.new-exercise-actions>button:first-child{background:transparent;border:0;color:var(--muted);font-size:11px;cursor:pointer}.new-exercise-actions .primary{font-size:11px;padding:12px}.exercise-success{color:var(--lime)!important;font-size:12px;line-height:1.6;margin-bottom:16px!important}button:disabled{opacity:.5;cursor:default}.exercise-list-title{font-size:18px;margin:0 0 24px}.day-card{margin-top:24px}.builder{padding-top:48px;padding-bottom:80px}.kicker{color:var(--lime);font-size:10px;letter-spacing:.18em;font-weight:800}.page-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:34px}.page-head h1{font-size:52px;letter-spacing:-.05em;margin:8px 0}.page-head p,.catalog p{color:var(--muted);margin:0}.builder-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.75fr);gap:20px}.plan,.catalog{background:var(--surface);border:1px solid var(--line);border-radius:22px}.plan{padding:28px}.routine-data{display:grid;grid-template-columns:1.5fr 1fr;gap:14px}.routine-data label,.catalog>label,.day-head label{display:flex;flex-direction:column;gap:8px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.06em}input,select{width:100%;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;color:var(--text);padding:12px;outline:none}input:focus,select:focus{border-color:var(--lime)}.day-tabs{display:flex;gap:7px;margin:27px 0 14px;overflow:auto}.day-tabs button{border:1px solid var(--line);background:transparent;color:var(--muted);padding:11px 14px;border-radius:10px;white-space:nowrap}.day-tabs button span{font-family:monospace;margin-right:8px}.day-tabs button.active{background:var(--lime);border-color:var(--lime);color:#0a130d}.day-tabs .add-day{border-style:dashed}.day-card{border:1px solid var(--line);border-radius:16px;padding:20px}.day-head{display:flex;align-items:end;justify-content:space-between;margin-bottom:22px}.day-head label{width:min(330px,70%)}.day-head button,.remove{background:transparent;border:0;color:#fca5a5;cursor:pointer}.columns{display:grid;grid-template-columns:200px 1fr 28px;gap:14px;color:var(--muted);font-size:9px;letter-spacing:.12em;padding:0 12px 9px}.exercise-item{display:grid;grid-template-columns:200px 1fr 28px;gap:14px;align-items:center;padding:16px 12px;border-top:1px solid var(--line)}.exercise-info{display:flex;flex-direction:column;gap:4px}.exercise-info small{color:var(--muted);font-size:10px}.type,.catalog-list button>span{font-size:8px;font-weight:800;letter-spacing:.09em;color:#93c5fd}.type[data-type="AEROBIC"],.catalog-list span[data-type="AEROBIC"]{color:#67e8f9}.type[data-type="ANAEROBIC"],.catalog-list span[data-type="ANAEROBIC"]{color:#fbbf24}.targets{display:grid;gap:8px}.targets.power{grid-template-columns:repeat(4,1fr)}.targets.cardio{grid-template-columns:repeat(3,1fr)}.targets label{font-size:8px;color:var(--muted);display:flex;flex-direction:column;gap:5px}.targets input,.targets select{padding:9px;font-size:12px}.remove{font-size:22px}.empty{display:flex;flex-direction:column;align-items:center;padding:48px;color:var(--muted);gap:7px}.empty strong{color:var(--text)}.catalog{padding:25px;height:fit-content;position:sticky;top:92px}.catalog h2{font-size:27px;margin:8px 0}.catalog>div:first-child{margin-bottom:24px}.catalog>label{margin-bottom:14px}.catalog-list{border-top:1px solid var(--line);margin-top:22px;padding-top:12px;max-height:430px;overflow:auto}.catalog-list button{width:100%;display:grid;grid-template-columns:70px 1fr 20px;align-items:center;text-align:left;background:transparent;border:0;border-bottom:1px solid var(--line);color:var(--text);padding:14px 4px;cursor:pointer}.catalog-list button:hover{background:rgba(255,255,255,.025)}.catalog-list button div{display:flex;flex-direction:column;gap:3px}.catalog-list small{color:var(--muted);font-size:9px}.catalog-list b{font-size:20px;color:var(--lime)}.notice{border-radius:11px;padding:12px;margin-bottom:14px;font-size:12px}.error{background:rgba(248,113,113,.1);color:#fca5a5}@media(max-width:950px){.builder-grid{grid-template-columns:1fr}.catalog{position:static}.exercise-item,.columns{grid-template-columns:160px 1fr 24px}}@media(max-width:650px){.page-head{align-items:start;gap:20px}.page-head h1{font-size:39px}.routine-data{grid-template-columns:1fr}.plan,.catalog{padding:18px}.columns{display:none}.exercise-item{grid-template-columns:1fr 24px}.targets{grid-column:1/-1}.targets.power,.targets.cardio{grid-template-columns:repeat(2,1fr)}}
  `],
})
export class RoutineBuilderComponent implements OnInit {
  // Dependencias y estado de la clase: inject obtiene servicios; signal conserva valores reactivos.
  private readonly exerciseService = inject(ExerciseService);
  private readonly routineService = inject(RoutineService);
  private readonly router = inject(Router);
  readonly catalog = signal<Exercise[]>([]); readonly typeFilter = signal<'ALL' | TrainingType>('ALL'); readonly muscleFilter = signal('ALL');
  readonly routineName = signal('Mi nueva rutina'); readonly goal = signal('Rendimiento mixto');
  readonly days = signal<BuilderDay[]>([{ name: 'Ejercicios', items: [] }]); readonly saving = signal(false); readonly error = signal('');
  readonly showExerciseForm = signal(false);
  readonly creatingExercise = signal(false);
  readonly exerciseError = signal('');
  readonly exerciseMessage = signal('');
  /** Valida campos básicos, guarda el nuevo ejercicio del catálogo y lo añade a la rutina en edición. */
  createExercise(event: Event, name: string, muscleGroup: string, equipment: string, movementPattern: string, trainingType: string): void {
    event.preventDefault();
    if (this.creatingExercise() || this.saving()) return;
    if ([name,muscleGroup,equipment].some(value => value.trim().length < 2)) { this.exerciseError.set('Completá nombre, grupo muscular y equipamiento.'); return; }
    this.creatingExercise.set(true); this.exerciseError.set(''); this.exerciseMessage.set('');
    this.exerciseService.create({name:name.trim(),muscleGroup:muscleGroup.trim(),equipment:equipment.trim(),movementPattern:movementPattern.trim() || null,trainingType:trainingType as TrainingType}).subscribe({
      next: exercise => {
        this.catalog.update(items => [...items, exercise].sort((a,b) => a.name.localeCompare(b.name)));
        this.typeFilter.set('ALL'); this.muscleFilter.set('ALL'); this.addExercise(exercise.id);
        this.creatingExercise.set(false); this.showExerciseForm.set(false);
        this.exerciseMessage.set(`${exercise.name} guardado en el catálogo y agregado a tu rutina.`);
      }, error: error => { this.creatingExercise.set(false); this.exerciseError.set(error.error?.message || 'No pudimos guardar el ejercicio.'); },
    });
  }
  readonly muscleGroups = computed(() => [...new Set(this.catalog().map(item => item.muscleGroup))].sort());
  readonly filteredExercises = computed(() => this.catalog().filter(item => (this.typeFilter()==='ALL'||item.trainingType===this.typeFilter()) && (this.muscleFilter()==='ALL'||item.muscleGroup===this.muscleFilter())));

  /** Carga el catálogo de ejercicios para comenzar a editar una rutina. */
  ngOnInit(): void { this.exerciseService.getCatalog().subscribe({ next: catalog => this.catalog.set(catalog), error: () => this.error.set('No pudimos cargar el catálogo de ejercicios') }); }
  /** Devuelve el único bloque de ejercicios que utiliza actualmente el editor de rutinas. */
  currentDay(): BuilderDay { return this.days()[0]; }
  /** Traduce el identificador de tipo de entrenamiento a su etiqueta visible. */
  typeLabel(type: TrainingType): string { return ({ POWER:'POWER', AEROBIC:'AERÓBICO', ANAEROBIC:'ANAERÓBICO' })[type]; }
  /** Evita duplicados y agrega un ejercicio al borrador con objetivos iniciales según su tipo. */
  addExercise(id:string): void {
    if (!id) return; const exercise=this.catalog().find(item=>item.id===id); if(!exercise) return;
    if(this.currentDay().items.some(item=>item.exercise.id===id)){this.error.set('Ese ejercicio ya está en la rutina');return;}
    const item:BuilderItem={ exercise,targetSets:exercise.trainingType==='POWER'?3:1,minReps:exercise.trainingType==='POWER'?8:1,maxReps:exercise.trainingType==='POWER'?12:1,restSeconds:exercise.trainingType==='POWER'?90:exercise.trainingType==='ANAEROBIC'?60:0,targetDurationMinutes:exercise.trainingType==='POWER'?null:30,targetDistanceKm:exercise.trainingType==='AEROBIC'?5:null,intensity:exercise.trainingType==='POWER'?null:'MEDIA' };
    this.error.set(''); this.updateDay(day=>({...day,items:[...day.items,item]}));
  }
  /** Quita del borrador el ejercicio indicado por su posición; no lo elimina del catálogo. */
  removeExercise(index:number):void{this.updateDay(day=>({...day,items:day.items.filter((_,i)=>i!==index)}));}
  /** Convierte un input de texto a número o null y actualiza el objetivo seleccionado del ejercicio. */
  updateNumber(index:number,field:keyof Pick<BuilderItem,'targetSets'|'minReps'|'maxReps'|'restSeconds'|'targetDurationMinutes'|'targetDistanceKm'>,value:string):void{this.updateItem(index,item=>({...item,[field]:value===''?null:Number(value)}));}
  /** Actualiza la intensidad elegida para un ejercicio del borrador. */
  updateIntensity(index:number,value:Intensity):void{this.updateItem(index,item=>({...item,intensity:value}));}
  /** Convierte el borrador a la estructura esperada por el backend, guarda la rutina y vuelve al inicio. */
  save():void{
    if (this.creatingExercise() || this.saving()) return;
    const name=this.routineName().trim(); const days=this.days();
    if(name.length<2||days.some(day=>day.items.length===0)){this.error.set('Completá el nombre y agregá al menos un ejercicio a la rutina');return;}
    this.saving.set(true);this.error.set('');
    this.routineService.create({name,goal:this.goal(),days:days.map((day,dayIndex)=>({name,dayNumber:dayIndex+1,exercises:day.items.map((item,index)=>({exerciseId:item.exercise.id,order:index+1,targetSets:item.targetSets,minReps:item.minReps,maxReps:item.maxReps,restSeconds:item.restSeconds,targetDurationMinutes:item.targetDurationMinutes,targetDistanceKm:item.targetDistanceKm,intensity:item.intensity}))}))}).subscribe({next:()=>this.router.navigateByUrl('/'),error:(error)=>{this.error.set(error.error?.message||'No pudimos guardar la rutina');this.saving.set(false);}});
  }
  /** Reemplaza el bloque del editor mediante una función; genera un nuevo array para actualizar la signal. */
  private updateDay(mapper:(day:BuilderDay)=>BuilderDay):void{const index=0;this.days.update(days=>days.map((day,i)=>i===index?mapper(day):day));}
  /** Transforma solo el ejercicio indicado y conserva los demás elementos del borrador. */
  private updateItem(index:number,mapper:(item:BuilderItem)=>BuilderItem):void{this.updateDay(day=>({...day,items:day.items.map((item,i)=>i===index?mapper(item):item)}));}
}
