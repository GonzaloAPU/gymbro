/** La ruta conserva sus guardas; AppComponent presenta la vista persistente del carrusel. */
import {Component,inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
@Component({standalone:true,template:''})
export class TabRouteComponent {
  readonly index=inject(ActivatedRoute).snapshot.data['tab'] as number;
}
