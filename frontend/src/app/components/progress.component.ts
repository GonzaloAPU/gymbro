import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ExerciseLeaderboard, ProgressService } from '../services/progress.service';

@Component({
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    <section class="page progress"><span class="kicker">TU EVOLUCIÓN</span><h1>Progreso que se ve.</h1><p class="lead">Cada serie suma. Estas son las señales principales de las últimas ocho semanas.</p>
      <div class="metrics"><article><span>PESO CORPORAL</span><strong>{{ weight() }}<small>kg</small></strong><em>último registro</em></article><article><span>VOLUMEN TOTAL</span><strong>{{ volume() }}<small>t</small></strong><em>sesiones recientes</em></article><article><span>ENTRENAMIENTOS</span><strong>{{ sessions() }}</strong><em>completados</em></article></div>
      <div class="content"><article class="chart"><div class="chart-head"><div><span class="kicker">FUERZA ESTIMADA</span><h2>Press banca · 1RM</h2></div><strong>91.2 <small>kg</small></strong></div><svg viewBox="0 0 700 240" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3e635" stop-opacity=".3"/><stop offset="1" stop-color="#a3e635" stop-opacity="0"/></linearGradient></defs><path class="area" d="M0,190 C80,185 110,165 175,170 S260,140 340,145 S440,98 520,112 S620,58 700,44 L700,240 L0,240Z"/><path class="line" d="M0,190 C80,185 110,165 175,170 S260,140 340,145 S440,98 520,112 S620,58 700,44"/></svg><div class="months"><span>ENE</span><span>FEB</span><span>MAR</span><span>ABR</span><span>MAY</span><span>JUN</span></div></article>
      <article class="records"><span class="kicker">RÉCORDS RECIENTES</span><h2>Mejores marcas</h2>@for(record of records();track record.name){<div><span>{{record.name}}<small>{{record.date}}</small></span><strong>{{record.value}} <i>kg</i></strong></div>} @empty {<p class="empty">Todavía no hay récords registrados.</p>}</article></div>
      <section class="leaderboard" aria-labelledby="ranking-title"><div class="ranking-head"><div><span class="kicker">LA COMUNIDAD LEVANTA</span><h2 id="ranking-title">Ranking de fuerza</h2></div><button type="button" (click)="loadLeaderboard()" [disabled]="rankingLoading()">↻ Actualizar</button></div>
        <p>Mayor carga de cada usuario en una serie registrada de una sesión completada. Los empates en peso comparten posición.</p>
        <div class="ranking-tabs" role="tablist" aria-label="Ejercicio del ranking">@for (exercise of leaderboards(); track exercise.key) {<button type="button" role="tab" [attr.aria-selected]="selectedExercise() === exercise.key" [class.active]="selectedExercise() === exercise.key" (click)="selectedExercise.set(exercise.key)">{{exercise.name}}</button>}</div>
        @if (rankingLoading()) {<p role="status">Cargando marcas de la comunidad…</p>} @else if (rankingError()) {<p class="ranking-error" role="alert">{{rankingError()}}</p>} @else {
          <div class="ranking-scroll"><table><caption>{{selectedBoard()?.name}} · mejores marcas</caption><thead><tr><th>POSICIÓN</th><th>USUARIO</th><th>PESO</th><th>REPS</th><th>FECHA</th></tr></thead><tbody>@for (user of selectedBoard()?.users || []; track user.userId) {<tr [class.my-rank]="user.isCurrentUser"><td><span class="rank-number" [class.podium]="user.rank <= 3">{{user.rank}}</span></td><td><b>{{user.name}}</b>@if (user.isCurrentUser) {<span class="you-label">Vos</span>}</td><td><strong>{{user.weightKg | number:'1.0-2'}} <small>kg</small></strong></td><td>{{user.repetitions}}</td><td>{{user.achievedAt | date:'dd/MM/yyyy'}}</td></tr>} @empty {<tr><td colspan="5" class="empty-ranking">Todavía no hay marcas de este ejercicio en sesiones completadas.</td></tr>}</tbody></table></div>
        }
        <p class="ranking-note">Peso muerto convencional y rumano tienen rankings separados. Las marcas son las registradas por los usuarios.</p>
      </section>
    </section>
  `,
  styles:[`
    .leaderboard{margin-top:24px;padding:28px;background:var(--surface);border:1px solid var(--line);border-radius:20px}.ranking-head{display:flex;align-items:center;justify-content:space-between;gap:15px}.ranking-head h2{margin:8px 0;font-size:28px}.ranking-head>button{border:1px solid var(--line);background:var(--surface-2);color:var(--text);border-radius:9px;padding:10px 13px;cursor:pointer;font-size:12px}.leaderboard>p{font-size:12px;line-height:1.7;color:var(--muted)}.ranking-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0}.ranking-tabs button{padding:11px 14px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--muted);cursor:pointer;font-size:12px}.ranking-tabs button.active{background:var(--lime);border-color:var(--lime);color:#0b130d;font-weight:800}.ranking-scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:500px;text-align:left}caption{text-align:left;font-size:13px;font-weight:700;margin-bottom:16px}th{font-size:9px;letter-spacing:.1em;color:var(--muted);padding:12px 10px}td{padding:15px 10px;border-top:1px solid var(--line);font-size:12px}td strong{color:var(--lime);font-size:19px}td small{font-size:11px;color:var(--muted)}.rank-number{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--surface-2);color:var(--muted);font-weight:800}.rank-number.podium{background:#fbbf2415;color:#fbbf24}.my-rank{background:#a3e63508}.you-label{display:inline-block;color:var(--lime);font-size:9px;padding:4px 6px;margin-left:8px;border:1px solid #a3e63540;border-radius:5px}.empty-ranking{text-align:center;color:var(--muted);padding:30px}.leaderboard .ranking-error{color:#fca5a5}.leaderboard .ranking-note{font-size:10px;margin:18px 0 0}@media(max-width:550px){.leaderboard{padding:18px}.ranking-head h2{font-size:23px}}.progress{padding-top:58px;padding-bottom:80px}.kicker{color:var(--lime);font-size:11px;letter-spacing:.18em;font-weight:800}.progress>h1{font-size:clamp(46px,6vw,72px);letter-spacing:-.05em;margin:12px 0}.lead{color:var(--muted);font-size:17px;max-width:580px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:20px;overflow:hidden;margin:44px 0 20px}.metrics article{background:var(--surface);padding:28px}.metrics article>span{display:block;color:var(--muted);font-size:10px;letter-spacing:.13em}.metrics strong{font-size:42px;display:block;margin:14px 0 7px}.metrics small{font-size:16px;color:var(--muted)}.metrics em{font-size:12px;color:var(--lime);font-style:normal}.content{display:grid;grid-template-columns:1.65fr 1fr;gap:20px}.chart,.records{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:28px}.chart-head{display:flex;justify-content:space-between}.chart h2,.records h2{font-size:23px;margin:8px 0}.chart-head>strong{font-size:30px}.chart-head small{font-size:13px;color:var(--muted)}svg{width:100%;height:240px;margin-top:12px;overflow:visible}.area{fill:url(#area)}.line{fill:none;stroke:var(--lime);stroke-width:4;stroke-linecap:round}.months{display:flex;justify-content:space-between;color:var(--muted);font-size:9px}.records>div{display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-top:1px solid var(--line)}.records>div span{display:flex;flex-direction:column;font-weight:700}.records>div small{color:var(--muted);margin-top:5px;font-weight:400}.records>div strong{font-size:21px}.records i{font-size:11px;color:var(--muted);font-style:normal}.empty{color:var(--muted);font-size:13px;border-top:1px solid var(--line);padding-top:20px}@media(max-width:750px){.metrics{grid-template-columns:1fr}.content{grid-template-columns:1fr}.progress{padding-top:38px}.metrics article{padding:20px}.chart{padding:20px}}
  `]
})
export class ProgressComponent implements OnInit {
  private readonly progress = inject(ProgressService);
  readonly weight = signal('—'); readonly volume = signal('0.0'); readonly sessions = signal(0);
  readonly records = signal<Array<{name:string;date:string;value:number}>>([]);
  readonly leaderboards = signal<ExerciseLeaderboard[]>([]);
  readonly selectedExercise = signal('bench');
  readonly rankingLoading = signal(false);
  readonly rankingError = signal('');
  readonly selectedBoard = computed(() => this.leaderboards().find(board => board.key === this.selectedExercise()));
  loadLeaderboard(): void {
    if (this.rankingLoading()) return;
    this.rankingLoading.set(true); this.rankingError.set('');
    this.progress.getLeaderboard().subscribe({ next: result => { this.leaderboards.set(result.exercises); this.rankingLoading.set(false); }, error: () => { this.rankingLoading.set(false); this.rankingError.set('No pudimos cargar el ranking. Intentá actualizarlo.'); } });
  }
  ngOnInit(): void {
    this.loadLeaderboard();
    this.progress.getSummary().subscribe((summary) => {
      const latestWeight = summary.weights.at(-1); this.weight.set(latestWeight ? Number(latestWeight.weightKg).toFixed(1) : '—');
      this.volume.set((summary.sessions.reduce((sum, session) => sum + Number(session.totalVolumeKg || 0), 0) / 1000).toFixed(1));
      this.sessions.set(summary.sessions.length);
      this.records.set(summary.records.map(record => ({ name:record.exercise.name, date:new Date(record.achievedAt).toLocaleDateString('es-AR',{day:'2-digit',month:'short'}).toUpperCase(), value:Number(record.maxWeightKg) })));
    });
  }
}
