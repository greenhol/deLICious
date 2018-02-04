import { ElementRef, ViewChild, Input, Component, OnInit, RenderComponentType } from '@angular/core';

const WIDTH = 800;
const HEIGHT = 600;
const SVG_MARGIN = 50;
const X_RANGE = 2;

@Component({
  selector: 'lic-renderer',
  templateUrl: './renderer.component.html',
  styleUrls: ['./renderer.component.scss']
})
export class RendererComponent implements OnInit {

  @ViewChild('inputCanvasArea') private inputCanvasArea;
  @ViewChild('vectorFieldSvgArea') private vectorFieldSvgArea;
  @ViewChild('outputCanvasArea') private outputCanvasArea;

  @Input() public showInput = true;
  @Input() public showVectorField = true;
  @Input() public showOutput = true;

  constructor(private element: ElementRef) {
  }

  ngOnInit() {
    // inputCanvasArea
    this.inputCanvasArea.nativeElement.width = WIDTH;
    this.inputCanvasArea.nativeElement.height = HEIGHT;
    // vectorFieldSvgArea
    this.vectorFieldSvgArea.nativeElement.style.width = (WIDTH - 2 * SVG_MARGIN) + 'px';
    this.vectorFieldSvgArea.nativeElement.style.height = (HEIGHT - 2 * SVG_MARGIN) + 'px';
    this.vectorFieldSvgArea.nativeElement.style.left =  SVG_MARGIN + 'px';
    this.vectorFieldSvgArea.nativeElement.style.top =  SVG_MARGIN + 'px';
    // outputCanvasArea
    this.outputCanvasArea.nativeElement.width = WIDTH - 2 * SVG_MARGIN - 2;
    this.outputCanvasArea.nativeElement.height = HEIGHT - 2 * SVG_MARGIN - 2;
    this.outputCanvasArea.nativeElement.style.left = SVG_MARGIN + 'px';
    this.outputCanvasArea.nativeElement.style.top = SVG_MARGIN + 'px';
    this.draw();
  }

  private draw(): void {
    const ctx = this.inputCanvasArea.nativeElement.getContext('2d');
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);

    let buf = new ArrayBuffer(imageData.data.length);
    let buf8 = new Uint8ClampedArray(buf);
    let data = new Uint32Array(buf);
    let rowCnt = 0;

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        let value = Math.round(Math.random()*256);
        data[y * WIDTH + x] = 
          (255 << 24) |       // alpha
          (value << 16) |     // blue
          (value << 8) |      // green
          value;              // red
      }
    }

    imageData.data.set(buf8);
    ctx.putImageData(imageData, 0, 0);  
  }

}
