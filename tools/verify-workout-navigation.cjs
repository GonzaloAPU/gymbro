const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { Subject } = require('rxjs');

const effects = [];
const signal = initial => { let value = initial; const read = () => value; read.set = next => { value = next; }; return read; };
const authenticated = signal(true);
const events = new Subject();
class NavigationEnd { constructor(url) { this.urlAfterRedirects = url; } }
class WorkoutRouteComponent {}
const auth = { isAuthenticated: authenticated, logout: () => authenticated.set(false) };
const router = { url: '/', events, navigateByUrl: url => { events.next(new NavigationEnd(url)); effects.forEach(run => run()); } };
const compiled = ts.transpileModule(fs.readFileSync('frontend/src/app/app.component.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
}).outputText;
const output = {};
vm.runInNewContext(compiled, { exports: output, require: name => {
  if (name === '@angular/core') return { Component: () => target => target, signal, computed: read => read, effect: run => { effects.push(run); run(); }, inject: token => token === 'auth' ? auth : router };
  if (name === '@angular/router') return { Router: 'router', NavigationEnd };
  if (name === '@angular/core/rxjs-interop') return { toSignal: (observable, options) => { const value = signal(options.initialValue); observable.subscribe(next => value.set(next)); return value; } };
  if (name.includes('auth.service')) return { AuthService: 'auth' };
  if (name.includes('workout-route.component')) return { WorkoutRouteComponent };
  if (name.includes('workout.component')) return { WorkoutComponent: class {} };
  return require(name);
} });
const shell = new output.AppComponent();
assert.equal(shell.workoutVisited(), false, 'Workout must not be created before first visit');
router.navigateByUrl('/entrenamiento');
shell.onRouteActivated(new WorkoutRouteComponent());
assert.equal(shell.workoutVisible(), true);
assert.equal(shell.workoutVisited(), true);
for (const route of ['/progreso', '/perfil', '/', '/rutinas/nueva']) {
  router.navigateByUrl(route);
  shell.onRouteActivated({});
  assert.equal(shell.workoutVisible(), false);
  assert.equal(shell.workoutVisited(), true, 'Navigation must keep the workout mounted');
}
router.navigateByUrl('/entrenamiento?test=1');
shell.onRouteActivated(new WorkoutRouteComponent());
assert.equal(shell.workoutVisible(), true);
assert.equal(shell.workoutVisited(), true);
shell.logout();
assert.equal(shell.workoutVisited(), false, 'Logout must destroy the old workout');
authenticated.set(true);
effects.forEach(run => run());
assert.equal(shell.workoutVisited(), false, 'Next login must start without the previous workout');
console.log('OK: entrenamiento conservado al navegar, retorno a la misma vista y limpieza al cerrar sesión.');
