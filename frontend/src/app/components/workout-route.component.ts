import { Component } from '@angular/core';

// The app shell owns the workout view so route changes cannot destroy its clocks.
@Component({ standalone: true, template: '' })
export class WorkoutRouteComponent {}
