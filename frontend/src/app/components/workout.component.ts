/**
 * Entrenamiento y máquina de estados: idle=espera, work=serie, rest=descanso. Conserva datos al cambiar de pestaña interna porque AppComponent mantiene esta instancia. Recargar el navegador sí pierde este estado en memoria.
 * Guía de estudio general: docs/GUIA-DE-ESTUDIO.md.
 */
import { Component, Input, inject, OnChanges, OnDestroy, OnInit, SimpleChanges, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { Routine, RoutineDay, ScheduleSlot, RoutineService } from '../services/routine.service';
import { SessionService } from '../services/session.service';

// Contrato de datos: describe campos y tipos para detectar errores durante la compilación.
interface WorkoutExercise {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  rest: number;
  done: number;
  workSeconds: number;
}

@Component({
  selector: 'app-workout',
  standalone: true,
  // HTML Angular: {{ }} muestra datos, [propiedad] enlaza valores y (evento) llama métodos.
  // @if y @for controlan bloques visibles y listas; #nombre referencia un elemento del formulario.
  template: `
    <section class="page workout">
      <div class="workout-head"><div><span class="kicker">{{ sessionFinished() ? 'SESIÓN GUARDADA' : running() ? 'SESIÓN EN CURSO' : sessionId() ? 'SESIÓN EN PAUSA' : 'PREPARÁ TU SESIÓN' }}</span><h1>{{ routineName() }}</h1></div>
        <div class="stopwatch" aria-label="Cronómetro de entrenamiento">
          <div class="watch-crown" aria-hidden="true"></div>
          <div class="watch-body">
            <div class="watch-top"><span>SMARTGYMBRO</span><span class="watch-status">{{ sessionFinished() ? 'FINALIZADO' : running() ? '● EN MARCHA' : sessionId() ? 'EN PAUSA' : 'LISTO' }}</span></div>
            <div class="timer" role="timer" aria-label="Tiempo activo">{{format(elapsed())}}<span class="milliseconds">.{{millisecondDigits(elapsedMilliseconds())}}</span></div>
            <div class="watch-units">HORAS <span>MINUTOS</span> SEGUNDOS <span>MS</span></div>
            <div class="timer-controls">
              <button type="button" class="play-control" (click)="play()" [disabled]="running() || saving() || !exercises.length" [attr.aria-label]="sessionFinished() ? 'Iniciar nueva sesión' : sessionId() ? 'Reanudar cronómetro' : 'Iniciar entrenamiento'"><span aria-hidden="true">▶</span>{{ sessionFinished() ? 'Nueva sesión' : sessionId() ? 'Reanudar' : 'Iniciar' }}</button>
              <button type="button" (click)="pause()" [disabled]="!running() || saving()" aria-label="Pausar cronómetro"><span aria-hidden="true">Ⅱ</span>Pausa</button>
              <button type="button" class="stop-control" (click)="stopTimer()" [disabled]="!running() || saving() || sessionFinished()" aria-label="Detener cronómetros sin finalizar la sesión"><span aria-hidden="true">■</span>Stop</button>
            </div>
            <small>Stop detiene los relojes. Play permite continuar.</small>
            <button type="button" class="save-session" (click)="finishSession(true)" [disabled]="!sessionId() || saving() || sessionFinished() || phase() === 'work'">Guardar y finalizar sesión</button>
          </div>
        </div>
      </div>
      @if (sessionFinished()) {<p role="status" class="saved-message">Sesión guardada. Podés revisar tus series o iniciar una nueva sesión.</p>}
      @if (error()) {<div class="error" role="alert">{{error()}}</div>}
      @if (planNotice()) {<p class="plan-notice" role="status">{{planNotice()}}</p>}
      @if (todayPlan().length) {<div class="today-plan"><label>Tu plan de hoy<select [value]="selectedPlanKey" (change)="selectPlannedWorkout($any($event.target).value)" [disabled]="saving() || (!!sessionId() && !sessionFinished())">@for (entry of todayPlan(); track entry.key) {<option [value]="entry.key">{{entry.slot.start}} – {{entry.slot.end}} · {{entry.day.name}} · {{entry.routine.name}}</option>}</select></label></div>}
      @if (exercises.length) {
        <div class="layout">
          <aside>@for (exercise of exercises; track exercise.id; let i=$index) {<button [class.active]="i===active()" (click)="selectExercise(i)" [disabled]="phase() !== 'idle' || saving()"><span>0{{i+1}}</span><div><b>{{exercise.name}}</b><small>{{exercise.done}}/{{exercise.sets}} series</small></div></button>}</aside>
          <article class="current">
            <span class="muscle">{{current().muscle}}</span><h2>{{current().name}}</h2><p>{{current().sets}} series · {{current().reps}} repeticiones · {{current().rest}} s descanso</p>
            <div class="series-timers">
              <div class="phase-clock" [class.phase-active]="phase() === 'work'"><span>SERIE {{ seriesIndex() === null ? '' : seriesIndex()! + 1 }}</span><strong role="timer">{{formatMilliseconds(phase() === 'work' ? current().workSeconds * 1000 - phaseMilliseconds() : current().workSeconds * 1000)}}</strong><small>{{phase() === 'work' && phaseElapsed() >= current().workSeconds ? 'Tiempo cumplido · pulsá Stop al terminar' : seriesPaused() ? 'Serie en pausa · pulsá Play para continuar' : 'Cuenta regresiva · Stop guarda la serie'}}</small><label>Duración (segundos)<input type="number" min="1" max="3600" step="1" [value]="current().workSeconds" [disabled]="phase() !== 'idle' || saving()" (change)="configureTimer('work', $any($event.target).value)"></label></div>
              <div class="phase-clock rest-clock" [class.phase-active]="phase() === 'rest'"><span>DESCANSO</span><strong role="timer">{{formatMilliseconds(phase() === 'rest' ? current().rest * 1000 - phaseMilliseconds() : current().rest * 1000)}}</strong><small aria-live="polite">{{phase() === 'rest' ? 'Recuperá · la próxima serie empieza con Play' : 'Empieza automáticamente al guardar la serie'}}</small><label>Duración (segundos)<input type="number" min="0" max="3600" step="1" [value]="current().rest" [disabled]="phase() !== 'idle' || saving()" (change)="configureTimer('rest', $any($event.target).value)"></label>@if (phase() === 'rest') {<button type="button" class="skip-rest" (click)="endRest()" [disabled]="saving()">Terminar descanso</button>}</div>
            </div>
            <div class="set-table"><div class="thead"><span>SERIE</span><span>KG</span><span>REPS</span><span>ESTADO</span></div>
              @for (_ of setRange; track $index; let i=$index) {<div class="set-row" [class.series-active]="seriesIndex() === i"><strong>{{i+1}}</strong><input #weight type="number" value="60" min="0" [disabled]="completed().has(i) || saving()" aria-label="Peso en kilogramos"><input #reps type="number" value="8" min="1" [disabled]="completed().has(i) || saving()" aria-label="Repeticiones"><div class="series-buttons"><button type="button" class="series-play" (click)="startSeries(i)" [disabled]="saving() || sessionFinished() || completed().has(i) || i !== nextSetIndex() || (phase() !== 'idle' && !(phase() === 'work' && seriesIndex() === i && seriesPaused()))" [attr.aria-label]="'Iniciar serie ' + (i+1)">▶ <span>{{seriesPaused() && seriesIndex() === i ? 'Reanudar' : 'Play'}}</span></button><button type="button" (click)="toggleSeriesPause(i)" [disabled]="saving() || phase() !== 'work' || seriesIndex() !== i" [attr.aria-label]="(seriesPaused() ? 'Reanudar serie ' : 'Pausar serie ') + (i+1)">{{seriesPaused() && seriesIndex() === i ? '▶ Reanudar' : 'Ⅱ Pausa'}}</button><button type="button" (click)="restartSeries(i)" [disabled]="saving() || phase() !== 'work' || seriesIndex() !== i" [attr.aria-label]="'Reiniciar serie ' + (i+1)">↺ Reiniciar</button><button type="button" (click)="completeSet(i, weight.value, reps.value)" [disabled]="saving() || !running() || phase() !== 'work' || seriesIndex() !== i || completed().has(i)" [class.complete]="completed().has(i)">{{completed().has(i) ? '✓ Listo' : '■ Stop'}}</button>@if (completed().has(i)) {<button type="button" class="return-series" (click)="returnToSeries(i)" [disabled]="saving() || sessionFinished() || phase() === 'work'">↶ Volver a esta serie</button>}</div></div>}
            </div>
            <div class="actions"><span>{{ sessionFinished() ? 'Entrenamiento guardado' : running() ? 'Registrando tu entrenamiento' : sessionId() ? 'En pausa · pulsá Reanudar para continuar' : 'Pulsá Play en la primera serie para comenzar' }}</span><button class="button primary" (click)="nextExercise()" [disabled]="saving() || sessionFinished() || !sessionId() || phase() !== 'idle'">{{active() === exercises.length - 1 ? 'Guardar y finalizar sesión' : 'Siguiente ejercicio →'}}</button></div>
          </article>
        </div>
      } @else { <div class="empty">{{loadingPlan() ? 'Consultando tu plan…' : 'Hoy no tenés entrenamientos asignados. Podés organizar tus días y horarios desde el Plan en Inicio.'}}</div> }
    </section>
  `,
  // CSS de este componente: disposición, colores y estados; @media adapta la vista a pantallas pequeñas.
  styles: [`
    .today-plan{margin-bottom:24px}.today-plan label{display:flex;flex-direction:column;gap:8px;color:var(--muted);font-size:12px}.today-plan select{width:100%;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text)}.plan-notice{padding:14px;border:1px solid #fb923c55;border-radius:12px;color:#fdba74;font-size:12px}.workout{padding-top:48px;padding-bottom:70px}.kicker{color:var(--lime);font-size:11px;letter-spacing:.18em;font-weight:800}.workout-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:38px}.workout-head h1{font-size:44px;margin:8px 0 0}.timer{font:700 42px/1 monospace;color:var(--lime);text-align:right}.timer small{display:block;color:var(--muted);font:700 9px/1 sans-serif;letter-spacing:.14em;margin-top:9px}.layout{display:grid;grid-template-columns:280px 1fr;gap:22px}aside{display:flex;flex-direction:column;gap:8px}aside button{display:flex;gap:14px;align-items:center;text-align:left;border:1px solid transparent;background:transparent;color:var(--muted);padding:16px;border-radius:14px}aside button.active{background:var(--surface);border-color:var(--line);color:var(--text)}aside button>span{font-family:monospace;color:#52617a}aside div{display:flex;flex-direction:column;gap:4px}aside small{font-size:11px;color:var(--muted)}.current{background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:clamp(24px,4vw,46px)}.muscle{color:var(--lime);font-size:12px;text-transform:uppercase;letter-spacing:.14em}.current h2{font-size:42px;margin:10px 0}.current>p{color:var(--muted)}.set-table{margin-top:38px}.thead,.set-row{display:grid;grid-template-columns:.6fr 1fr 1fr 1fr;gap:12px;align-items:center}.thead{color:var(--muted);font-size:10px;letter-spacing:.12em;padding:0 14px 12px}.set-row{border-top:1px solid var(--line);padding:14px}.set-row input{width:100%;background:var(--surface-2);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:12px}.set-row button{border:1px solid var(--line);background:transparent;color:var(--muted);padding:10px;border-radius:10px}.set-row button.complete{background:rgba(163,230,53,.12);color:var(--lime);border-color:rgba(163,230,53,.35)}.set-row button:disabled{opacity:.6}.actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:32px}.actions>span{color:var(--muted);font-size:11px}.error{margin-top:16px;color:#fca5a5;font-size:12px}.empty{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:40px;color:var(--muted)}@media(max-width:750px){.layout{grid-template-columns:1fr}aside{display:grid;grid-template-columns:repeat(4,1fr)}aside button{padding:10px;justify-content:center}aside button div{display:none}.workout-head h1{font-size:32px}.timer{font-size:28px}.current h2{font-size:32px}.current{padding:20px}.set-row,.thead{grid-template-columns:.5fr 1fr 1fr 1fr;gap:6px}.set-row{padding:12px 4px}.set-row button{font-size:0}.set-row button:after{content:'✓';font-size:14px}}
    .series-timers{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:25px 0}.phase-clock{background:#080f0c;border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:9px}.phase-clock>span{font-size:10px;letter-spacing:.15em;color:var(--muted)}.phase-clock strong{font:700 clamp(18px,2.2vw,27px)/1.2 'Courier New',monospace;font-variant-numeric:tabular-nums;color:var(--lime)}.rest-clock strong{color:#7dd3fc}.phase-clock small{font-size:11px;color:var(--muted);min-height:28px}.phase-clock label{display:flex;flex-direction:column;gap:6px;font-size:11px;color:var(--muted)}.phase-clock input{width:100%;padding:9px;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;color:var(--text)}.phase-active{border-color:var(--lime);box-shadow:0 0 18px #a3e63512}.rest-clock.phase-active{border-color:#7dd3fc}.skip-rest{background:transparent;color:#7dd3fc;border:1px solid var(--line);border-radius:8px;padding:8px;cursor:pointer}.series-buttons{display:grid;grid-template-columns:1fr 1fr;gap:6px}.series-buttons button{flex:1;font-size:11px;white-space:nowrap;padding:10px 7px}.series-buttons .return-series{grid-column:1/-1;white-space:normal;color:var(--lime)}.series-buttons .series-play{color:var(--lime)}.series-active{background:#a3e63508}.set-row,.thead{grid-template-columns:.45fr .8fr .8fr minmax(165px,1.4fr)}@media(max-width:600px){.series-timers{grid-template-columns:1fr}.set-row,.thead{grid-template-columns:30px minmax(45px,1fr) minmax(45px,1fr) minmax(110px,1.6fr);gap:5px}.series-buttons{gap:4px}.series-buttons button{font-size:11px;padding:10px 4px}.series-buttons button:after{content:none}.series-buttons .series-play span{display:none}.current{padding:16px}.set-row input{padding:10px 5px}}
    .milliseconds{font-size:.5em;letter-spacing:0;color:#d9f99d;vertical-align:baseline}.save-session{display:block;width:100%;margin-top:16px;padding:12px;border:1px solid #638833;border-radius:10px;background:var(--lime);color:#0b130d;font-size:12px;font-weight:700;cursor:pointer}.save-session:disabled{opacity:.4;cursor:default}.saved-message{padding:14px 18px;border:1px solid #638833;border-radius:12px;color:var(--lime);background:#a3e6350a;margin-bottom:24px}.workout-head{gap:32px;align-items:center}.stopwatch{width:340px;flex-shrink:0;position:relative;padding-top:15px}.watch-crown{position:absolute;top:0;left:calc(50% - 20px);width:40px;height:19px;border:2px solid #52617a;border-radius:7px 7px 0 0;background:linear-gradient(90deg,#263143,#52617a,#263143)}.watch-body{position:relative;border:3px solid #3b485c;border-radius:30px;background:linear-gradient(145deg,#263143,#111827 55%);padding:20px;box-shadow:0 12px 28px #0005,inset 0 1px 0 #ffffff18}.watch-top{display:flex;justify-content:space-between;font:700 9px/1.4 monospace;letter-spacing:.08em;color:var(--muted);margin-bottom:13px}.watch-status{color:var(--lime)}.timer{background:#080f0c;border:2px solid #35463a;border-radius:12px;padding:18px 8px 13px;text-align:center;font:700 35px/1.2 'Courier New',monospace;font-variant-numeric:tabular-nums;letter-spacing:.03em;text-shadow:0 0 14px #a3e63540;box-shadow:inset 0 3px 9px #0008}.watch-units{display:flex;justify-content:space-around;padding:7px 18px 13px;font:700 8px/1 monospace;letter-spacing:.12em;color:var(--muted)}.timer-controls{display:flex;gap:7px}.timer-controls button{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 5px;border:1px solid #41506a;border-radius:10px;background:#1a2333;color:var(--text);font-size:11px;cursor:pointer}.timer-controls button span{font-size:17px;line-height:1}.timer-controls .play-control{color:var(--lime);border-color:#638833}.timer-controls .stop-control{color:#fca5a5}.timer-controls button:disabled{opacity:.35;cursor:default}.timer-controls button:focus-visible{outline:2px solid var(--lime);outline-offset:3px}.watch-body>small{display:block;text-align:center;margin-top:12px;font-size:10px;color:var(--muted)}.workout>.error{margin:-15px 0 24px}@media(max-width:750px){.workout-head{flex-direction:column;align-items:stretch;gap:24px}.stopwatch{width:min(340px,100%);align-self:center}.timer{font-size:clamp(25px,7vw,35px)}}
  `],
})
export class WorkoutComponent implements OnInit, OnChanges, OnDestroy {
  // Dependencias y estado de la clase: inject obtiene servicios; signal conserva valores reactivos.
  @Input() visible = true;
  readonly todayPlan = signal<Array<{key:string; routine:Routine; day:RoutineDay; slot:ScheduleSlot}>>([]);
  readonly loadingPlan = signal(false);
  readonly planNotice = signal('');
  selectedPlanKey = '';
  private planRequest = 0;
  readonly Math = Math;
  private readonly routines = inject(RoutineService);
  private readonly sessions = inject(SessionService);
  private readonly router = inject(Router);
  exercises: WorkoutExercise[] = [];
  readonly routineName = signal('Cargando rutina…'); readonly sessionId = signal<string | null>(null);
  readonly active = signal(0); readonly elapsed = signal(0); readonly completed = signal(new Set<number>());
  readonly saving = signal(false); readonly error = signal('');
  readonly running = signal(false);
  readonly sessionFinished = signal(false);
  // Fase de la serie; running es independiente y controla si avanzan los relojes.
  readonly phase = signal<'idle' | 'work' | 'rest'>('idle');
  readonly seriesIndex = signal<number | null>(null);
  readonly phaseElapsed = signal(0);
  readonly elapsedMilliseconds = signal(0);
  readonly phaseMilliseconds = signal(0);
  readonly seriesPaused = signal(false);
  // Marca del último inicio y tiempo acumulado de la fase: permite pausar y reanudar sin perder tiempo.
  private phaseSince = 0;
  private phaseMs = 0;
  private seriesFrozen = false;
  private pendingSeries: number | null = null;
  private lastRestSeconds = 0;
  // Claves ejercicio:índice ya guardadas: al repetir una serie se usa PUT, no otro POST.
  private readonly savedSeries = new Set<string>();
  private readonly repeatByExercise = new Map<string, number>();
  private routineDayId?: string;
  // Reloj total: tiempo consolidado en pausas más diferencia desde runningSince.
  private accumulatedMs = 0;
  private runningSince = 0;
  // Map mantiene el ID devuelto por la API y las series completadas de cada ejercicio durante esta sesión.
  private readonly performedIds = new Map<string, string>();
  private readonly completedByExercise = new Map<string, Set<number>>();
  private interval?: number;

  /** Carga el plan al crear el componente, sin iniciar ningún reloj. */
  ngOnInit(): void {
    this.refreshPlan();
  }
  /** Al volver a mostrar Entrenar, vuelve a consultar el plan para reflejar asignaciones recientes sin desmontar la sesión. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue && !changes['visible'].firstChange) this.refreshPlan();
  }
  /** Consulta el plan de hoy e ignora respuestas antiguas. Si ya hay una sesión en curso, preserva su estado aunque cambie la asignación. */
  refreshPlan(): void {
    // Un contador identifica la solicitud más reciente para evitar que una respuesta lenta reemplace el plan nuevo.
    const request = ++this.planRequest;
    this.loadingPlan.set(true);
    this.routines.getAll().subscribe({
      next: (routines) => {
        if (request !== this.planRequest) return;
        const weekday = new Date().getDay();
        const entries = routines.flatMap(routine => routine.days.flatMap(day => (day.schedule || []).filter(slot => slot.weekday === weekday).map(slot => ({key:`${day.id}:${slot.start}:${slot.end}`,routine,day,slot})))).sort((a,b) => a.slot.start.localeCompare(b.slot.start));
        this.todayPlan.set(entries); this.loadingPlan.set(false); this.planNotice.set('');
        if (this.sessionId() && !this.sessionFinished()) {
          if (!entries.some(entry => entry.key === this.selectedPlanKey)) this.planNotice.set('Tu sesión iniciada sigue disponible aunque su asignación ya no esté en el plan de hoy. Sus relojes y series se conservan.');
          return;
        }
        if (!entries.length) { this.exercises = []; this.routineDayId = undefined; this.selectedPlanKey = ''; this.routineName.set('Sin entrenamiento asignado hoy'); return; }
        const now = new Date(); const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const selected = entries.find(entry => entry.key === this.selectedPlanKey) || entries.find(entry => entry.slot.start <= time && time < entry.slot.end) || entries.find(entry => entry.slot.start >= time) || entries[0];
        this.selectPlannedWorkout(selected.key);
      },
      error: () => { if (request !== this.planRequest) return; this.loadingPlan.set(false); this.error.set('No pudimos actualizar el plan de hoy.'); },
    });
  }
  /** Carga los ejercicios de una asignación y limpia el estado de la sesión anterior; no permite cambiar una sesión en curso. */
  selectPlannedWorkout(key: string): void {
    if (this.saving() || (this.sessionId() && !this.sessionFinished())) return;
    const entry = this.todayPlan().find(entry => entry.key === key); if (!entry) return;
    this.selectedPlanKey = key; this.routineDayId = entry.day.id;
    this.routineName.set(entry.day.name);
    this.exercises = entry.day.exercises.map(item => ({id:item.exercise.id,name:item.exercise.name,muscle:item.exercise.muscleGroup,sets:item.targetSets,reps:`${item.minReps}-${item.maxReps}`,rest:item.restSeconds,done:0,workSeconds:45}));
    this.active.set(0); this.completed.set(new Set()); this.sessionFinished.set(false); this.sessionId.set(null);
    this.elapsed.set(0); this.elapsedMilliseconds.set(0); this.accumulatedMs = 0;
    this.phase.set('idle'); this.seriesIndex.set(null); this.phaseElapsed.set(0); this.phaseMilliseconds.set(0);
    this.performedIds.clear(); this.completedByExercise.clear(); this.savedSeries.clear(); this.repeatByExercise.clear();
  }

  /** Devuelve el ejercicio seleccionado por el índice activo. */
  current(): WorkoutExercise { return this.exercises[this.active()]; }
  /** Genera tantas posiciones como series tiene el ejercicio para dibujar las filas de la tabla. */
  get setRange(): unknown[] { return Array.from({ length: this.current()?.sets || 0 }); }
  /** Convierte segundos a horas:minutos:segundos con dos dígitos por parte. */
  format(seconds:number): string { return [Math.floor(seconds/3600), Math.floor(seconds/60)%60, seconds%60].map(value => String(value).padStart(2,'0')).join(':'); }
  /** Extrae la parte de milisegundos y la completa a tres dígitos. */
  millisecondDigits(milliseconds: number): string { return String(Math.max(0, Math.floor(milliseconds)) % 1000).padStart(3, '0'); }
  /** Combina el tiempo completo y la fracción de milisegundos para el cronómetro digital. */
  formatMilliseconds(milliseconds: number): string {
    const value = Math.max(0, Math.floor(milliseconds));
    return `${this.format(Math.floor(value / 1000))}.${this.millisecondDigits(value)}`;
  }

  /** Inicia o reanuda el reloj total; si hace falta, crea primero la sesión en el servidor. No se llama automáticamente al entrar. */
  play(): void {
    if (this.running() || this.saving() || !this.exercises.length) return;
    if (this.sessionFinished()) {
      this.sessionFinished.set(false); this.sessionId.set(null); this.elapsed.set(0); this.elapsedMilliseconds.set(0);
      this.accumulatedMs = 0; this.phase.set('idle'); this.seriesIndex.set(null);
      this.phaseElapsed.set(0); this.phaseMilliseconds.set(0); this.phaseMs = 0; this.seriesPaused.set(false);
      this.seriesFrozen = false; this.pendingSeries = null; this.lastRestSeconds = 0;
      this.performedIds.clear(); this.completedByExercise.clear(); this.savedSeries.clear();
      this.repeatByExercise.clear(); this.completed.set(new Set());
      for (const exercise of this.exercises) exercise.done = 0;
    }
    this.error.set('');
    if (this.sessionId()) { this.startClock(); return; }
    this.saving.set(true);
    this.sessions.start(this.routineDayId).subscribe({
      next: session => { this.sessionId.set(session.id); this.saving.set(false); this.startClock(); },
      error: () => { this.pendingSeries = null; this.error.set('No pudimos iniciar la sesión. Intentá nuevamente.'); this.saving.set(false); },
    });
  }

  /** Guarda el punto de inicio con performance.now y programa actualizaciones visuales aproximadamente cada 16 ms. */
  private startClock(): void {
    this.runningSince = performance.now();
    this.running.set(true);
    this.phaseSince = performance.now();
    if (this.pendingSeries !== null) { this.beginSeries(this.pendingSeries); this.pendingSeries = null; }
    this.interval = window.setInterval(() => this.tick(), 16);
  }

  /** Recalcula tiempos a partir de marcas temporales, sin sumar intervalos fijos. Cierra el descanso cuando alcanza su duración. */
  private tick(): void {
    const now = performance.now();
    this.elapsedMilliseconds.set(Math.floor(this.accumulatedMs + now - this.runningSince));
    this.elapsed.set(Math.floor(this.elapsedMilliseconds() / 1000));
    if (this.phase() !== 'idle' && !this.seriesFrozen && !this.seriesPaused()) {
      this.phaseMilliseconds.set(Math.floor(this.phaseMs + now - this.phaseSince));
      this.phaseElapsed.set(Math.floor(this.phaseMilliseconds() / 1000));
      if (this.phase() === 'rest' && this.phaseElapsed() >= this.current().rest) this.endRest();
    }
  }

  /** Ajusta los segundos previstos de serie o descanso solo entre fases; el tiempo de trabajo sirve como referencia visual, no guarda la serie automáticamente. */
  configureTimer(kind: 'work' | 'rest', raw: string): void {
    if (this.phase() !== 'idle' || this.saving()) return;
    const seconds = Number(raw);
    if (!Number.isInteger(seconds) || seconds < (kind === 'work' ? 1 : 0) || seconds > 3600) { this.error.set('Usá segundos enteros: serie de 1 a 3600 y descanso de 0 a 3600.'); return; }
    if (kind === 'work') this.current().workSeconds = seconds; else this.current().rest = seconds;
    this.error.set('');
  }

  /** Prioriza la serie reabierta; de lo contrario devuelve la primera pendiente, o -1 si no quedan. */
  nextSetIndex(): number { return this.repeatByExercise.get(this.current()?.id) ?? Array.from({ length: this.current()?.sets || 0 }, (_, i) => i).find(i => !this.completed().has(i)) ?? -1; }

  /** Reabre una serie completada para repetirla. Conserva su identidad guardada para actualizarla en lugar de duplicarla. */
  returnToSeries(index: number): void {
    if (this.sessionFinished()) return;
    if (this.saving() || this.phase() === 'work' || !this.completed().has(index)) return;
    if (this.phase() === 'rest') this.endRest();
    const exercise = this.current();
    // Solo se puede reabrir una serie a la vez por ejercicio.
    const previous = this.repeatByExercise.get(exercise.id);
    const next = new Set(this.completed());
    if (previous !== undefined) next.add(previous);
    next.delete(index);
    this.repeatByExercise.set(exercise.id, index);
    this.completed.set(next); this.completedByExercise.set(exercise.id, next); exercise.done = next.size;
    this.phase.set('idle'); this.seriesIndex.set(null); this.phaseElapsed.set(0); this.phaseMilliseconds.set(0);
    this.phaseMs = 0; this.seriesFrozen = false; this.seriesPaused.set(false); this.error.set('');
  }

  /** Comprueba que sea la siguiente serie disponible y solicita iniciar el reloj total si todavía está detenido. */
  startSeries(index: number): void {
    if (this.sessionFinished()) return;
    if (this.phase() === 'work' && this.seriesIndex() === index && this.seriesPaused() && !this.saving()) { this.toggleSeriesPause(index); return; }
    if (this.saving() || this.phase() !== 'idle' || index !== this.nextSetIndex()) return;
    if (!this.running()) { this.pendingSeries = index; this.play(); return; }
    this.beginSeries(index);
  }

  /** Entra en fase de trabajo y reinicia únicamente el reloj de esa serie. */
  private beginSeries(index: number): void {
    this.seriesPaused.set(false);
    this.seriesIndex.set(index); this.phase.set('work'); this.phaseElapsed.set(0); this.phaseMilliseconds.set(0);
    this.phaseMs = 0; this.phaseSince = performance.now(); this.seriesFrozen = false;
  }

  /** Pausa o reanuda solo la serie conservando su tiempo acumulado; al reanudar también activa el reloj total si hace falta. */
  toggleSeriesPause(index: number): void {
    if (this.saving() || this.phase() !== 'work' || this.seriesIndex() !== index) return;
    if (this.seriesPaused()) {
      if (!this.running()) this.play();
      this.phaseSince = performance.now();
      this.seriesPaused.set(false);
    } else {
      if (this.running() && !this.seriesFrozen) {
        this.tick();
        this.phaseMs += performance.now() - this.phaseSince;
      }
      this.seriesPaused.set(true);
    }
  }

  /** Vuelve a cero el tiempo de la serie actual y la deja pausada para que el usuario decida cuándo arrancar. */
  restartSeries(index: number): void {
    if (this.saving() || this.phase() !== 'work' || this.seriesIndex() !== index) return;
    this.phaseMs = 0; this.phaseElapsed.set(0); this.phaseMilliseconds.set(0); this.phaseSince = performance.now();
    this.seriesFrozen = false; this.seriesPaused.set(true); this.error.set('');
  }

  /** Registra los segundos de descanso, sale de esa fase y deja disponible la siguiente serie. */
  endRest(): void {
    if (this.phase() !== 'rest') return;
    const seconds = this.running() ? Math.floor((this.phaseMs + performance.now() - this.phaseSince) / 1000) : this.phaseElapsed();
    this.lastRestSeconds = Math.min(this.current().rest, seconds);
    this.phase.set('idle'); this.seriesIndex.set(null); this.phaseElapsed.set(0); this.phaseMilliseconds.set(0); this.phaseMs = 0;
  }

  /** Detiene los relojes mediante pause; no finaliza la sesión, no guarda una serie y no cambia de página. */
  stopTimer(): void {
    if (this.saving() || this.sessionFinished()) return;
    this.pause();
  }

  /** Consolida los milisegundos acumulados, detiene la actualización periódica y conserva todos los datos para reanudar. */
  pause(): void {
    if (!this.running()) return;
    this.tick();
    if (this.phase() !== 'idle' && !this.seriesFrozen && !this.seriesPaused()) this.phaseMs += performance.now() - this.phaseSince;
    this.accumulatedMs += performance.now() - this.runningSince;
    this.elapsedMilliseconds.set(Math.floor(this.accumulatedMs));
    this.elapsed.set(Math.floor(this.accumulatedMs / 1000));
    this.running.set(false);
    window.clearInterval(this.interval);
    this.interval = undefined;
  }

  /** Valida peso y repeticiones, crea o reutiliza el ejercicio realizado y guarda o reemplaza la serie. Tras confirmarse el guardado empieza el descanso. */
  completeSet(index:number, weightValue:string, repsValue:string): void {
    if (!this.running() || this.saving() || this.completed().has(index) || this.phase() !== 'work' || this.seriesIndex() !== index) return;
    const sessionId = this.sessionId(); const exercise = this.current();
    const weightKg = Number(weightValue); const repetitions = Number(repsValue);
    if (!sessionId || !exercise || !Number.isFinite(weightKg) || weightKg < 0 || !Number.isInteger(repetitions) || repetitions < 1) { this.error.set('Revisá el peso y las repeticiones'); return; }
    this.tick(); this.seriesFrozen = true;
    this.saving.set(true); this.error.set('');
    const existing = this.performedIds.get(exercise.id);
    // El sufijo $ identifica un Observable. of reutiliza el ID existente; map extrae y recuerda el ID recién creado.
    const performedId$ = existing ? of(existing) : this.sessions.addExercise(sessionId, exercise.id, this.active()+1).pipe(map(performed => { this.performedIds.set(exercise.id, performed.id); return performed.id; }));
    const seriesKey = `${exercise.id}:${index}`;
    const data = { setNumber:index+1, weightKg, repetitions, durationSeconds:this.phaseElapsed(), actualRestSeconds:this.lastRestSeconds };
    // switchMap encadena el guardado de la serie después de obtener el ejercicio realizado. subscribe recibe éxito o error.
    performedId$.pipe(switchMap(performedId => this.savedSeries.has(seriesKey)
      ? this.sessions.replaceSet(sessionId, performedId, data)
      : this.sessions.addSet(sessionId, performedId, data))).subscribe({
      next: () => { this.savedSeries.add(seriesKey); this.repeatByExercise.delete(exercise.id); const next = new Set(this.completed()); next.add(index); this.completed.set(next); this.completedByExercise.set(exercise.id, next); exercise.done=next.size; this.saving.set(false); this.seriesPaused.set(false); this.phase.set('rest'); this.phaseMs = 0; this.phaseElapsed.set(0); this.phaseMilliseconds.set(0); this.phaseSince = performance.now(); this.seriesFrozen = false; if (exercise.rest === 0) this.endRest(); },
      error: () => { this.error.set('No pudimos guardar la serie'); this.saving.set(false); },
    });
  }

  /** Cambia el ejercicio solo entre fases y recupera cuáles de sus series están completadas. */
  selectExercise(index:number): void { if (this.phase() !== 'idle' || this.saving()) return; this.active.set(index); this.lastRestSeconds = 0; this.completed.set(new Set(this.completedByExercise.get(this.current().id) || [])); }
  /** Avanza al próximo ejercicio; si ya era el último, solicita finalizar la sesión permaneciendo en la pantalla. */
  nextExercise(): void {
    if (this.phase() !== 'idle' || this.saving()) return;
    if (this.active() < this.exercises.length-1) { this.selectExercise(this.active()+1); return; }
    this.finishSession(true);
  }
  /** Finaliza explícitamente la sesión en la API con su duración activa. No permite finalizar con una serie de trabajo abierta. */
  finishSession(stayOnPage = false): void {
    if (this.saving() || this.sessionFinished()) return;
    if (this.phase() === 'work') { this.error.set('Pulsá Stop en la serie para guardarla antes de finalizar la sesión.'); return; }
    const sessionId = this.sessionId(); if (!sessionId) return;
    this.pause();
    this.saving.set(true); this.error.set('');
    this.sessions.finish(sessionId, this.elapsed()).subscribe({
      next: () => {
        if (!stayOnPage) { this.router.navigateByUrl('/progreso'); return; }
        if (this.phase() === 'rest') this.endRest();
        this.sessionFinished.set(true); this.saving.set(false);
      },
      error: () => { this.error.set('No pudimos finalizar la sesión. Podés reintentar o reanudar.'); this.saving.set(false); },
    });
  }
  /** Libera el intervalo al destruir el componente para evitar actualizaciones de una instancia que ya no existe. */
  ngOnDestroy(): void { window.clearInterval(this.interval); }
}
