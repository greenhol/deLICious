import { Component } from '@angular/core';
import { ChargeField } from './data/charge/charge.field';

@Component({
  selector: 'lic-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public showInput = true;
  public showVectorField = true;
  public showOutput = true;
  public chargeField = new ChargeField();
}
