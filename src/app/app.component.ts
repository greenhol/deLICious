import { Component, ViewChild } from '@angular/core';
import { ChargeField } from './data/charge/charge.field';
import { RendererComponent } from './renderer/renderer.component';

@Component({
  selector: 'lic-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  @ViewChild(RendererComponent) private renderer;

  public showInput = true;
  public showVectorField = true;
  public showOutput = true;
  public chargeField = new ChargeField();

  public onDownloadButtonClick(): void {
    this.renderer.saveLicCanvas();
  }
}
