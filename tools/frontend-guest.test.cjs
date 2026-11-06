const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {of}=require('rxjs');
function fixture(){
 const values=new Map([['smartgymbro_token','account-token'],['gymbro.workout.v1:account','account-training']]);
 let full=false,store,sessions;
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>{if(full)throw Error('quota');values.set(key,value);},removeItem:key=>values.delete(key)};
 const signal=initial=>{let value=initial;const read=()=>value;read.set=next=>{value=next;};read.update=fn=>{value=fn(value);};return read;};
 const noop=()=>()=>{};
 const modules=new Map();
 const alarms={trackTimer(){},timerExpired(){},unlockAudio(){}};
 function load(relative){
  if(modules.has(relative))return modules.get(relative);
  const exports={};modules.set(relative,exports);
  const source=ts.transpileModule(fs.readFileSync(relative,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
  vm.runInNewContext(source,{exports,structuredClone,crypto:require('node:crypto'),localStorage:storage,window:{setInterval:()=>1,clearInterval(){}},Date,performance:{now:()=>0},require:name=>{
   if(name==='@angular/core')return {Injectable:noop,Component:noop,Input:noop,HostListener:noop,signal,effect(){},ChangeDetectionStrategy:{Eager:0},inject:token=>{if(token==='storage')return store;if(token==='session')return sessions;if(token==='routine')return {getAll:()=>of(store.today())};if(token==='alarms')return alarms;if(token==='router')return {navigateByUrl:()=>assert.fail('Invitado no debe ir a progreso')};throw Error('Dependencia inesperada '+token);}};
   if(name==='@angular/router')return {Router:'router',RouterLink:'link'};
   if(name.endsWith('routine.service'))return {RoutineService:'routine'};
   if(name.endsWith('workout-storage.service'))return {WorkoutStorageService:'storage'};
   if(name.endsWith('session.service'))return {SessionService:'session'};
   if(name.endsWith('alarm.service'))return {AlarmService:'alarms'};
   if(name.startsWith('.'))return load(path.posix.normalize(path.posix.join(path.posix.dirname(relative),name+'.ts')));
   if(name==='@angular/common/http')throw Error('El modo invitado no debe tener HTTP');
   return require(name);
  }});return exports;
 }
 const planner=load('frontend/src/app/services/guest-planner.ts'),catalog=load('frontend/src/app/services/guest-catalog.ts').guestCatalog;
 const Store=load('frontend/src/app/services/guest-workout.store.ts').GuestWorkoutStore;
 const form={groups:['Piernas','Pecho','Bíceps'],equipment:planner.guestEquipment.map(e=>e.id),minutes:45,experience:'BEGINNER'};
 const routine=planner.makeGuestRoutine(catalog,form,'test-local');
 function newStore(){store=new Store();return store;}
 function workout(){sessions=new (load('frontend/src/app/services/session.service.ts').SessionService)();const w=new (load('frontend/src/app/components/workout.component.ts').WorkoutComponent)();w.guestMode=true;w.ngOnInit();return w;}
 return {planner,catalog,form,routine,values,newStore,workout,full:()=>{full=true;}};
}
test('invitado: mínimo 4 ejercicios únicos, 3 series y todos los grupos elegidos',()=>{
 const f=fixture(),items=f.routine.days[0].exercises;
 assert.ok(items.length>=4);assert.equal(new Set(items.map(i=>i.exercise.id)).size,items.length);
 assert.ok(items.every(i=>i.targetSets===3&&i.exercise.description&&i.exercise.videoUrl));
 for(const group of f.form.groups)assert.ok(items.some(i=>f.planner.matchesGuestGroup(i.exercise,group)));
 assert.ok(f.planner.makeGuestRoutine(f.catalog,{...f.form,minutes:60},'long').days[0].exercises.length>=6);
});
test('invitado: casa sin equipamiento no propone máquinas; bíceps requiere equipo disponible',()=>{
 const f=fixture(),form={...f.form,groups:['Piernas','Pecho'],equipment:[]};
 const items=f.planner.makeGuestRoutine(f.catalog,form,'home').days[0].exercises;
 assert.ok(items.every(i=>f.planner.hasGuestEquipment(i.exercise,[])));
 assert.throws(()=>f.planner.makeGuestRoutine(f.catalog,{...form,groups:['Bíceps']},'bad'),/equipamiento/);
 assert.throws(()=>f.planner.makeGuestRoutine(f.catalog,{...form,groups:[]},'bad'),/Revisá/);
 assert.throws(()=>f.planner.makeGuestRoutine(f.catalog,{...form,minutes:0},'bad'),/Revisá/);
});
test('invitado: registra, recupera y finaliza sin HTTP, token nuevo ni cola de cuenta',()=>{
 const f=fixture(),store=f.newStore();store.prepare(f.form,f.routine);const w=f.workout();
 assert.equal(w.setDraft(0).weight,'0','No sugiere cargas externas a un invitado');
 w.startSeries(0);w.completeSet(0,'10','12');assert.equal(w.completedSeries().length,1);w.ngOnDestroy();
 f.newStore();const recovered=f.workout();assert.equal(recovered.completedSeries().length,1);assert.equal(recovered.completedSeries()[0].weightKg,10);
 recovered.finishSession();assert.equal(recovered.sessionFinished(),true);recovered.ngOnDestroy();
 assert.equal(f.values.get('smartgymbro_token'),'account-token');assert.equal(f.values.get('gymbro.workout.v1:account'),'account-training');
 assert.deepEqual([...f.values.keys()].sort(),['gymbro.guest.workout.v1','gymbro.workout.v1:account','smartgymbro_token']);
});
test('invitado: reemplazo conserva metadatos, evita duplicados y protege series realizadas',()=>{
 const f=fixture(),store=f.newStore();store.prepare(f.form,f.routine);const w=f.workout();
 const replacement=f.catalog.find(e=>e.name==='Sentadilla goblet');
 assert.equal(w.replaceGuestExercise(0,replacement),true);assert.equal(w.current().videoUrl,replacement.videoUrl);
 assert.equal(w.replaceGuestExercise(0,f.routine.days[0].exercises[1].exercise),false);
 w.startSeries(0);assert.equal(w.canReplaceGuestExercise(1),false);w.completeSet(0,'0','10');w.endRest();
 assert.equal(w.canReplaceGuestExercise(0),false);assert.equal(w.canReplaceGuestExercise(1),true);w.ngOnDestroy();
});
test('invitado: falla de almacenamiento no confirma una serie ni sobrescribe respaldo dañado',()=>{
 const f=fixture(),store=f.newStore();store.prepare(f.form,f.routine);const w=f.workout();w.startSeries(0);f.full();w.completeSet(0,'0','8');
 assert.equal(w.completedSeries().length,0);assert.ok(store.storageError());w.ngOnDestroy();
 const broken=fixture();broken.values.set('gymbro.guest.workout.v1','{broken');const invalid=broken.newStore();
 assert.equal(invalid.routine,null);assert.ok(invalid.storageError());assert.equal(broken.values.get('gymbro.guest.workout.v1'),'{broken');
 assert.throws(()=>invalid.prepare(broken.form,broken.routine));assert.equal(broken.values.get('gymbro.guest.workout.v1'),'{broken');
});
