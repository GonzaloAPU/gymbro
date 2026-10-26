/** Bienvenida guiada: datos, disponibilidad y propuesta antes de guardar el plan completo. */
import {Component,OnInit,inject,signal} from '@angular/core';
import {Router,RouterLink} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {RoutineService} from '../services/routine.service';
import {WelcomeInput,WelcomeProposal,WelcomeService} from '../services/welcome.service';
@Component({
  standalone:true,imports:[RouterLink],
  template:`<section class="page welcome">
    <span class="kicker">TU PRIMER PLAN</span><h1>Empezá con tu semana armada</h1>
    <p class="intro">Contanos cómo querés entrenar. Te proponemos rutinas, horarios y descansos que después podés modificar.</p>
    @if(loading()) {<p role="status">Preparando bienvenida…</p>} @else {
      <ol class="steps" aria-label="Pasos de bienvenida">@for(label of ['Sobre vos','Tu semana','Tu plan'];track $index){<li [class.active]="step()===$index+1"><button type="button" [disabled]="busy()" [attr.aria-current]="step()===$index+1?'step':null" (click)="goToStep($index+1)">{{$index+1}} · {{label}}</button></li>}</ol>
      @if(error()) {<p class="notice error" role="alert">{{error()}}</p>}
      <div class="card">
      @if(step()===1) {
        <h2>Tu punto de partida</h2><div class="fields">
          <label>Edad<input type="number" min="18" max="85" inputmode="numeric" [value]="form().age||''" (input)="numberField('age',$any($event.target).value)" placeholder="Años"></label>
          <label>Altura (cm)<input type="number" min="100" max="250" inputmode="numeric" [value]="form().heightCm||''" (input)="numberField('heightCm',$any($event.target).value)" placeholder="Ej. 170"></label>
          <label>Peso (kg)<input type="number" min="30" max="300" step="0.1" inputmode="decimal" [value]="form().weightKg||''" (input)="numberField('weightKg',$any($event.target).value)" placeholder="Ej. 70"></label>
        </div>
        <label>¿Qué querés lograr?<select [value]="form().goal" (change)="setField('goal',$any($event.target).value)"><option value="GENERAL">Mejorar mi condición física</option><option value="STRENGTH">Ganar fuerza</option><option value="MUSCLE">Desarrollar músculo</option></select></label>
        <label>Experiencia<select [value]="form().experience" (change)="setField('experience',$any($event.target).value)"><option value="BEGINNER">Estoy empezando o retomando</option><option value="INTERMEDIATE">Entreno regularmente</option></select></label>
        <fieldset><legend>¿Tenés dolor, una lesión o restricciones para entrenar?</legend><label class="check"><input type="radio" name="restrictions" [checked]="restrictionAnswer()==='NO'" (change)="restrictionAnswer.set('NO');setField('hasRestrictions',false)">No</label><label class="check"><input type="radio" name="restrictions" [checked]="restrictionAnswer()==='YES'" (change)="restrictionAnswer.set('YES');setField('hasRestrictions',true)">Sí</label></fieldset>
        @if(form().hasRestrictions) {<p class="notice">La generación automática es para entrenamiento general. Para estas condiciones necesitás indicaciones profesionales. Podés <a routerLink="/rutinas/nueva">crear tu rutina manualmente</a>.</p>}
        <p class="help">Este prototipo genera planes iniciales para adultos de 18 a 85 años. No calcula cargas en kilos ni tratamientos de rehabilitación.</p>
      }
      @if(step()===2) {
        <h2>¿Dónde y cuándo entrenás?</h2>
        <div class="choices">@for(place of places;track place.value){<button type="button" [class.selected]="form().place===place.value" [attr.aria-pressed]="form().place===place.value" (click)="setField('place',place.value)">{{place.label}}</button>}</div>
        <fieldset><legend>¿Qué equipamiento tenés? El peso corporal siempre está disponible.</legend><div class="equipment">@for(item of equipment;track item.value){<label class="check"><input type="checkbox" [checked]="form().equipment.includes(item.value)" (change)="toggleEquipment(item.value)">{{item.label}}</label>}</div></fieldset>
        <div class="fields"><label>Sesiones por semana<select [value]="form().sessions" (change)="numberField('sessions',$any($event.target).value)"><option value="2">2 sesiones</option><option value="3">3 sesiones</option><option value="4">4 sesiones</option></select></label><label>Tiempo por sesión<select [value]="form().minutes" (change)="numberField('minutes',$any($event.target).value)">@for(minutes of durations;track minutes){<option [value]="minutes">{{minutes}} minutos</option>}</select></label></div>
        <h3>Tus {{form().sessions}} días de entrenamiento</h3><p class="help" role="status">@if(replacingDay()!==null){Elegí otro día para reemplazar {{dayName(replacingDay()!)}}.}@else{Ya marcamos {{form().sessions}} días. Para cambiar uno, tocá el día marcado y después su reemplazo.}</p>
        <div class="week">@for(day of weekdays;track day.value){<button type="button" [class.selected]="available(day.value)" [class.replacing]="replacingDay()===day.value" [attr.aria-label]="day.name + (replacingDay()===day.value ? ': elegí su reemplazo' : available(day.value) ? ': cambiar este día' : ': usar este día')" [attr.aria-pressed]="available(day.value)" [disabled]="busy() || (!available(day.value) && replacingDay()===null)" (click)="toggleDay(day.value)">{{day.short}}</button>}</div>
        @for(slot of form().availability;track slot.weekday){<div class="time-row"><b>{{dayName(slot.weekday)}}</b><label>Desde<input type="time" [value]="slot.start" (change)="changeTime(slot.weekday,'start',$any($event.target).value)"></label><label>Hasta<input type="time" [value]="slot.end" (change)="changeTime(slot.weekday,'end',$any($event.target).value)"></label></div>}
        <p class="help">Los días sin entrenamiento se proponen como descanso. No se pisan tus horarios existentes. Los descansos ya marcados se cambian desde Inicio.</p>
      }
      @if(step()===3 && !proposal()) {
        <h2>Elegí cómo preparar tu plan</h2>
        <div class="modes"><button type="button" [class.selected]="form().mode==='LOCAL'" (click)="setField('mode','LOCAL')"><b>Plan local</b><span>Plantillas incluidas en Gymbro. Sin enviar parámetros a una IA.</span></button><button type="button" [disabled]="!aiAvailable()" [class.selected]="form().mode==='GEMINI'" (click)="setField('mode','GEMINI')"><b>Con Gemini</b><span>{{aiAvailable()?'Propuesta de IA validada con nuestro catálogo.':'Disponible cuando se configure la IA en el servidor.'}}</span></button></div>
        @if(form().mode==='GEMINI'){<label class="check consent"><input type="checkbox" [checked]="form().aiConsent" (change)="setField('aiConsent',$any($event.target).checked)">Acepto enviar a Google objetivo, experiencia, lugar, equipamiento, cantidad de sesiones y tiempo disponible para generar esta propuesta. No se envían edad, altura, peso, restricciones, nombre, correo, foto ni horarios exactos.</label>}
        <button type="button" class="button primary full" [disabled]="busy()" (click)="generate()">{{busy()?'Preparando tu plan…':'Preparar mi plan'}}</button>
        @if(error() && form().mode==='GEMINI'){<button type="button" class="button ghost full" [disabled]="busy()" (click)="setField('mode','LOCAL');generate()">Usar el plan local</button>}
      }
      @if(proposal();as plan) {
        <span class="source">{{plan.source==='GEMINI'?'PROPUESTA CON GEMINI':'PLAN LOCAL'}}</span><h2>Así queda tu semana</h2>
        @for(session of plan.sessions;track $index){<article class="session"><h3>{{dayName(session.slot.weekday)}} · {{session.slot.start}}–{{session.slot.end}}</h3><b>{{session.name}}</b><p class="help">{{session.estimatedMinutes}} min estimados de ejercicios, preparación y recuperación.</p><ul>@for(exercise of session.exercises;track exercise.exerciseId){<li><b>{{exercise.name}}</b><span>{{exercise.targetSets}} × {{exercise.minReps}}–{{exercise.maxReps}} repeticiones · {{exercise.restSeconds}} s de descanso</span></li>}</ul></article>}
        <p><b>Descanso:</b> {{restLabel(plan.restDays)}}</p><p class="help">Los tiempos son estimaciones. Empezá con una carga que puedas controlar; podés modificar los ejercicios después de guardar. Si aparece dolor, interrumpí el ejercicio.</p>
        <button type="button" class="button primary full" [disabled]="busy()" (click)="accept()">{{busy()?'Guardando tu semana…':'Aceptar y empezar'}}</button>
        <button type="button" class="button ghost full" [disabled]="busy()" (click)="edit()">Cambiar datos y horarios</button>
      }
      @if(!proposal()) {<div class="navigation">@if(step()>1){<button type="button" class="button ghost" [disabled]="busy()" (click)="previous()">Atrás</button>}@if(step()<3){<button type="button" class="button primary" (click)="next()">Continuar →</button>}</div>}
      </div>
      <button type="button" class="skip" [disabled]="busy()" (click)="skip()">Prefiero armar mi rutina después</button>
    }
  </section>`,
  styleUrl:'./welcome.component.scss',
})
export class WelcomeComponent implements OnInit {
  private readonly auth=inject(AuthService);
  private readonly api=inject(WelcomeService);
  private readonly routines=inject(RoutineService);
  private readonly router=inject(Router);
  readonly step=signal(1);readonly loading=signal(true);readonly busy=signal(false);readonly error=signal('');readonly aiAvailable=signal(false);
  readonly proposal=signal<WelcomeProposal|null>(null);readonly restrictionAnswer=signal<''|'YES'|'NO'>('');
  readonly replacingDay=signal<number|null>(null);
  private customDays=false;
  readonly form=signal<WelcomeInput>({age:0,heightCm:this.auth.user()?.heightCm||0,weightKg:this.auth.user()?.currentKg||0,goal:'GENERAL',experience:'BEGINNER',place:'HOME',equipment:[],sessions:3,minutes:30,availability:[1,3,5].map(weekday=>({weekday,start:'18:00',end:'18:30'})),hasRestrictions:false,mode:'LOCAL',aiConsent:false});
  readonly places=[{value:'GYM' as const,label:'Gimnasio'},{value:'HOME' as const,label:'Casa'},{value:'PARK' as const,label:'Parque'}];
  readonly equipment=[{value:'DUMBBELLS',label:'Mancuernas'},{value:'BENCH',label:'Banco'},{value:'BARBELL',label:'Barra y discos'},{value:'CABLE',label:'Polea'},{value:'PULLUP',label:'Barra fija'}];
  readonly durations=[30,45,60,75,90];
  readonly weekdays=[{value:1,short:'L',name:'Lunes'},{value:2,short:'M',name:'Martes'},{value:3,short:'X',name:'Miércoles'},{value:4,short:'J',name:'Jueves'},{value:5,short:'V',name:'Viernes'},{value:6,short:'S',name:'Sábado'},{value:0,short:'D',name:'Domingo'}];
  async ngOnInit(){
    try {
      const [status,draft]=await Promise.all([firstValueFrom(this.api.status()),firstValueFrom(this.api.draft())]);
      this.aiAvailable.set(status.aiAvailable);
      if(draft){this.form.set(draft.preferences);this.customDays=true;this.matchSessionDays();this.restrictionAnswer.set(draft.preferences.hasRestrictions?'YES':'NO');this.proposal.set(draft.proposal);this.step.set(3);}
    }catch{this.error.set('No pudimos cargar la configuración. Podés completar la ficha y reintentar.');}
    finally{this.loading.set(false);}
  }
  setField<K extends keyof WelcomeInput>(key:K,value:WelcomeInput[K]){if(this.busy())return;this.form.update(form=>({...form,[key]:value}));this.error.set('');}
  numberField(key:'age'|'heightCm'|'weightKg'|'sessions'|'minutes',raw:string){
    if(this.busy())return;
    this.setField(key,Number(raw));
    if(key==='sessions')this.matchSessionDays();
    if(key==='minutes'&&!this.busy())this.setField('availability',this.form().availability.map(slot=>({...slot,end:this.endAfter(slot.start)})));
  }
  toggleEquipment(item:string){const list=this.form().equipment;this.setField('equipment',list.includes(item)?list.filter(value=>value!==item):[...list,item]);}
  available(day:number){return this.form().availability.some(slot=>slot.weekday===day);}
  /** La cantidad elegida siempre tiene esa misma cantidad de días y horarios. */
  private matchSessionDays(){
    const defaults:Record<number,number[]>={2:[1,4],3:[1,3,5],4:[1,2,4,5]};
    const preferred=defaults[this.form().sessions];if(!preferred)return;
    const slots=this.form().availability;
    const chosen=this.customDays?slots.map(slot=>slot.weekday).slice(0,this.form().sessions):[...preferred];
    for(const day of [...preferred,1,2,3,4,5,6,0])if(chosen.length<this.form().sessions&&!chosen.includes(day))chosen.push(day);
    const start=slots[0]?.start||'18:00';
    this.setField('availability',chosen.map(weekday=>slots.find(slot=>slot.weekday===weekday)||{weekday,start,end:this.endAfter(start)}).sort((a,b)=>((a.weekday+6)%7)-((b.weekday+6)%7)));
    this.replacingDay.set(null);
  }
  toggleDay(weekday:number){
    if(this.busy())return;
    if(this.available(weekday)){this.replacingDay.set(this.replacingDay()===weekday?null:weekday);return;}
    if(this.replacingDay()===null)return;
    const replaced=this.replacingDay();
    this.setField('availability',this.form().availability.map(slot=>slot.weekday===replaced?{...slot,weekday}:slot).sort((a,b)=>((a.weekday+6)%7)-((b.weekday+6)%7)));
    this.customDays=true;this.replacingDay.set(null);
  }
  /** El final sigue la duración elegida; el usuario puede ampliarlo manualmente. */
  private endAfter(start:string):string {
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))return '';
    const total=Number(start.slice(0,2))*60+Number(start.slice(3))+this.form().minutes;
    if(total>=1440)return ''; // No convertir un horario nocturno en uno anterior al inicio.
    return `${Math.floor(total/60)}`.padStart(2,'0')+':'+`${total%60}`.padStart(2,'0');
  }
  changeTime(day:number,key:'start'|'end',value:string){this.setField('availability',this.form().availability.map(slot=>slot.weekday===day?{...slot,[key]:value,...(key==='start'?{end:this.endAfter(value)}:{})}:slot));}
  dayName(day:number){return this.weekdays.find(value=>value.value===day)?.name||'';}
  restLabel(days:number[]){return this.weekdays.filter(day=>days.includes(day.value)).map(day=>day.name).join(' · ')||'Sin días adicionales';}
  private validate(step:number){
    const input=this.form();
    if(step===1){
      if(!Number.isInteger(input.age)||input.age<18||input.age>85||!Number.isInteger(input.heightCm)||input.heightCm<100||input.heightCm>250||!Number.isFinite(input.weightKg)||input.weightKg<30||input.weightKg>300){this.error.set('Revisá edad (18–85), altura (100–250 cm) y peso (30–300 kg).');return false;}
      if(!this.restrictionAnswer()){this.error.set('Respondé la pregunta sobre lesiones y restricciones.');return false;}
      if(input.hasRestrictions){this.error.set('Para estas condiciones, creá una rutina con indicaciones profesionales.');return false;}
    }else{
      if(input.availability.length<input.sessions){this.error.set('Elegí al menos tantos días disponibles como sesiones.');return false;}
      const minutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
      if(input.availability.some(slot=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end)||minutes(slot.end)-minutes(slot.start)<input.minutes)){this.error.set('Cada rango debe alcanzar para la sesión completa, sin cruzar medianoche.');return false;}
    }
    return true;
  }
  next(){if(this.busy()||!this.validate(this.step()))return;this.step.update(value=>Math.min(3,value+1));this.error.set('');}
  previous(){if(this.busy())return;this.step.update(value=>Math.max(1,value-1));this.error.set('');}
  goToStep(target:number){
    if(this.busy()||target<1||target>3)return;
    if(target>this.step())for(let current=1;current<target;current++)if(!this.validate(current))return;
    this.proposal.set(null);this.step.set(target);this.error.set('');
  }
  edit(){this.proposal.set(null);this.step.set(1);this.error.set('');}
  private failure(error:unknown){return (error as {error?:{message?:string}})?.error?.message||'No pudimos completar la operación. Reintentá; no se reemplazó tu plan.';}
  async generate(){
    if(this.busy()||!this.validate(1)||!this.validate(2))return;
    if(this.form().mode==='GEMINI'&&(!this.aiAvailable()||!this.form().aiConsent)){this.error.set('Activá el consentimiento o elegí el plan local.');return;}
    this.busy.set(true);this.error.set('');
    try{this.proposal.set(await firstValueFrom(this.api.preview(this.form())));}
    catch(error){this.error.set(this.failure(error));}
    finally{this.busy.set(false);}
  }
  async accept(){
    const plan=this.proposal();if(!plan||this.busy())return;
    this.busy.set(true);this.error.set('');
    try{
      await firstValueFrom(this.api.accept(plan.id));
      // La aceptación ya está confirmada; una recarga fallida no vuelve a crear el plan.
      await Promise.allSettled([firstValueFrom(this.auth.refreshProfile()),firstValueFrom(this.routines.getAll())]);
      await this.router.navigateByUrl('/');
    }catch(error){this.error.set(this.failure(error));}
    finally{this.busy.set(false);}
  }
  async skip(){if(this.busy())return;this.busy.set(true);this.error.set('');try{await firstValueFrom(this.api.skip());await this.router.navigateByUrl('/');}catch(error){this.error.set(this.failure(error));}finally{this.busy.set(false);}}
}
