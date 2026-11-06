/** Un único entrenamiento local. No tiene HTTP, usuario, token ni cola de sincronización. */
import {Injectable,signal} from '@angular/core';
import {defer,of} from 'rxjs';
import type {Routine} from './routine.service';
import type {WorkoutCommand} from './workout-storage.service';
import {makeGuestRoutine,type GuestForm} from './guest-planner';
import {guestCatalog} from './guest-catalog';
interface GuestBundle {version:1;form:GuestForm;routine:Routine;state:unknown;journal:WorkoutCommand[];}
const KEY='gymbro.guest.workout.v1';
@Injectable()
export class GuestWorkoutStore {
 readonly storageError=signal('');readonly actionRequired=signal(false);readonly syncError=signal('');
 readonly pending=signal(0);readonly syncing=signal(false);
 private bundle:GuestBundle|null=null;
 private damaged=false;
 constructor(){
  try{
   const raw=localStorage.getItem(KEY);if(!raw)return;
   const value=JSON.parse(raw) as GuestBundle;
   if(value.version!==1||!value.form||!Array.isArray(value.form.groups)||!Array.isArray(value.form.equipment)||!value.routine||value.routine.days?.length!==1||!Array.isArray(value.journal)||value.journal.length>3000||!value.routine.days[0].exercises?.length||value.routine.days[0].exercises.length>8)throw Error();
   if(typeof value.routine.id!=='string')throw Error();
   makeGuestRoutine(guestCatalog,value.form,value.routine.id);
   for(const item of value.routine.days[0].exercises){
    const official=guestCatalog.find(e=>e.id===item.exercise?.id);if(!official)throw Error();
    if(!Number.isInteger(item.targetSets)||item.targetSets<1||item.targetSets>1000||!Number.isInteger(item.minReps)||item.minReps<1||!Number.isInteger(item.maxReps)||item.maxReps<item.minReps||!Number.isFinite(item.restSeconds)||item.restSeconds<0||item.restSeconds>3600)throw Error();
    item.exercise={...official};
   }
   if(value.journal.some(c=>!c||!['START','EXERCISE','SET','REPLACE','FINISH'].includes(c.kind)||typeof c.id!=='string'||!c.body))throw Error();
   this.bundle=value;
  }catch{this.damaged=true;this.storageError.set('No pudimos leer el entrenamiento local. Podés borrar ese respaldo y empezar uno nuevo.');}
 }
 get routine(){return this.bundle?.routine||null;} get form(){return this.bundle?.form||null;}
 private write(next:GuestBundle){
  if(this.damaged)throw Error(this.storageError());
  try{localStorage.setItem(KEY,JSON.stringify(next));this.bundle=next;this.storageError.set('');}
  catch{this.storageError.set('No hay espacio o permiso para guardar en este dispositivo. Habilitá el almacenamiento antes de continuar.');throw Error(this.storageError());}
 }
 prepare(form:GuestForm,routine:Routine){this.write({version:1,form:structuredClone(form),routine:structuredClone(routine),state:null,journal:[]});}
 updateRoutine(routine:Routine){if(this.bundle)this.write({...this.bundle,routine:structuredClone(routine)});}
 scope(){return KEY;}
 loadState(_scope:string){return this.bundle?.state||null;}
 saveState(_scope:string,state:unknown){if(this.bundle)this.write({...this.bundle,state:structuredClone(state),journal:[]});}
 recoveryCommands(_scope:string){return this.bundle?.journal||[];}
 acknowledgeRecovery(_scope:string,_ids:string[]){/* El siguiente snapshot confirma las acciones recuperadas. */}
 rejectState(_scope:string){this.damaged=true;this.storageError.set('No pudimos recuperar la sesión. El respaldo se conserva hasta que elijas borrarlo.');}
 isPending(_key:string){return false;}
 enqueue<T>(command:WorkoutCommand,result:T){
  return defer(()=>{
   if(!this.bundle||this.bundle.journal.length>=3000)throw Error('No hay un entrenamiento local disponible.');
   // Registra antes de confirmar a la pantalla, para recuperar una interrupción entre ambos pasos.
   this.write({...this.bundle,journal:[...this.bundle.journal,command]});return of(result);
  });
 }
 clear(){localStorage.removeItem(KEY);this.bundle=null;this.damaged=false;this.storageError.set('');}
 today(){
  if(!this.routine)return [];
  return [{...this.routine,days:this.routine.days.map(day=>({...day,schedule:[{weekday:new Date().getDay(),start:'00:00',end:'23:59'}]}))}];
 }
}
