import { ElementRef, ViewChild, Input, Component, OnInit, RenderComponentType, HostListener } from '@angular/core';
import { D3Service, D3, Selection } from 'd3-ng2-service';

enum Border {
  TOP = 'Top',
  BOTTOM = 'Bottom',
  LEFT = 'Left',
  RIGHT = 'Right',
  CENTER = 'Center'
}

interface PointInPixel {
  border: Border;
  pos: MathCoordinate;
}

interface PixelCoordinate {
  left: number;  
  top: number;
}

interface MathCoordinate {
  x: number;
  y: number;
}

interface Charge {
  coord: MathCoordinate;
  magnitude: number;
}

interface Vector {
  x: number;
  y: number;
}

const WIDTH = 800;
const WIDTH_HALF = 800 / 2;
const HEIGHT = 600;
const HEIGHT_HALF = 600 / 2;
const RATIO = WIDTH / HEIGHT;

const OUTPUT_BORDER_SIZE = 1;
const BG_MARGIN = 50;
const BG_WIDTH = WIDTH + 2 * BG_MARGIN;
const BG_HEIGHT = HEIGHT + 2 * BG_MARGIN;

const X_RANGE = 2;
const X_RANGE_HALF = X_RANGE / 2;
const MATH_PIXEL_RATIO = X_RANGE / WIDTH;
const X_MIN = -X_RANGE / 2;
const X_MAX = X_RANGE / 2;
const Y_MIN = X_MIN / RATIO;
const Y_MAX = X_MAX / RATIO;

@Component({
  selector: 'lic-renderer',
  templateUrl: './renderer.component.html',
  styleUrls: ['./renderer.component.scss']
})
export class RendererComponent implements OnInit {

  private static mathToPixel(coord: MathCoordinate): PixelCoordinate {
    return {
      left: Math.round((coord.x + X_MAX) / MATH_PIXEL_RATIO),
      top: Math.round(-(coord.y + Y_MIN) / MATH_PIXEL_RATIO),
    }
  }

  private static pixelToMath(coord: PixelCoordinate): MathCoordinate {
    return {
      x: MATH_PIXEL_RATIO * coord.left + X_MIN,
      y: Y_MAX - MATH_PIXEL_RATIO * coord.top
    }
  }

  private static getVector(coord: MathCoordinate): Vector {
    const charges: Charge[] = [
      {coord: {x: -0.4, y: -0.1}, magnitude: 1},
      {coord: {x: 0.4, y: 0.2}, magnitude: -1},
      {coord: {x: 0.3, y: -0.2}, magnitude: 2}
    ];
    let v: Vector = {x: 0, y: 0};

    for (let i = 0; i< charges.length; i++) {
      const rd: Vector = {x: coord.x - charges[i].coord.x, y: coord.y - charges[i].coord.y};
      const rdAbs = Math.sqrt(rd.x * rd.x + rd.y * rd.y);
      v.x += charges[i].magnitude * rd.x / Math.pow(rdAbs, 3);
      v.y += charges[i].magnitude * rd.y / Math.pow(rdAbs, 3);
    }

    const vAbs = Math.sqrt(v.x * v.x + v.y * v.y) * 15;

    return {x: v.x / vAbs, y: v.y / vAbs};
  }

  @ViewChild('inputCanvasArea') private inputCanvasArea: ElementRef;
  @ViewChild('vectorFieldSvgArea') private vectorFieldSvgArea: ElementRef;
  @ViewChild('outputCanvasArea') private outputCanvasArea: ElementRef;

  @Input() public showInput = true;
  @Input() public showVectorField = true;
  @Input() public showOutput = true;

  @HostListener('click', ['$event']) public onClick(e: PointerEvent) {
    console.log('pixel coord: left: ', e.offsetX + ', top: ' + e.offsetY);
    let coord = RendererComponent.pixelToMath({top: e.offsetY, left: e.offsetX});
    console.log('math coord: x: ', coord.x + ', y: ' + coord.y);
    let v = RendererComponent.getVector(coord);
    console.log('vector: v_x: ', v.x + ', v_y: ' + v.y);
    // const pixel = RendererComponent.mathToPixel(coord);
    // console.log('pixel coord: left: ', pixel.left + ', top: ' + pixel.top);

    let nextArea = this.getNextArea({x: 0.5, y: 0.5}, v);
    console.log('NEXT: ', nextArea);

    let nextX = e.offsetX;
    let nextY = e.offsetY;

    for (let i=0; i<10; i++) {

      switch (nextArea.border) {
        case Border.TOP:
          nextY--;
          break;
        case Border.BOTTOM:
          nextY++;
          break;
        case Border.LEFT:
          nextX--;
          break;
        case Border.RIGHT:
          nextX++;
          break;
      }
  
      coord = RendererComponent.pixelToMath({top: nextY, left: nextX});
      v = RendererComponent.getVector(coord);
      nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
      console.log('NEXTNEXT: ', nextArea);
    }

  }

  private d3: D3;
  private svg: any;
  private svgg: any;

  private someCoords: MathCoordinate[] = [];
  private noise: number[][] = [];
  private licData: number[][] = [];

  constructor(d3Service: D3Service) {
    this.d3 = d3Service.getD3();
  }

  ngOnInit() {
    // Demo Points
    for (let x = -0.95; x <= 0.95; x+=0.06) {
      for (let y = -0.7; y <= 0.7; y+=0.06) {
        this.someCoords.push({x: x, y: y});
      }  
    }
    // inputCanvasArea
    this.inputCanvasArea.nativeElement.width = BG_WIDTH;
    this.inputCanvasArea.nativeElement.height = BG_HEIGHT;
    // vectorFieldSvgArea
    this.vectorFieldSvgArea.nativeElement.style.width = WIDTH + 'px';
    this.vectorFieldSvgArea.nativeElement.style.height = HEIGHT + 'px';
    this.vectorFieldSvgArea.nativeElement.style.left =  BG_MARGIN + 'px';
    this.vectorFieldSvgArea.nativeElement.style.top =  BG_MARGIN + 'px';
    this.svg = this.d3.select(this.vectorFieldSvgArea.nativeElement);
    this.svgg = this.svg.append('g').attr('transform', 'translate(.5, .5)');
    // outputCanvasArea
    this.outputCanvasArea.nativeElement.width = WIDTH - 2 * OUTPUT_BORDER_SIZE;
    this.outputCanvasArea.nativeElement.height = HEIGHT - 2 * OUTPUT_BORDER_SIZE;
    this.outputCanvasArea.nativeElement.style.left = BG_MARGIN + 'px';
    this.outputCanvasArea.nativeElement.style.top = BG_MARGIN + 'px';
    this.outputCanvasArea.nativeElement.style.borderWidth = OUTPUT_BORDER_SIZE + 'px';
    this.drawInit();
  }

  private drawInit(): void {

    for (let y = 0; y < BG_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < BG_WIDTH; x++) {
        row.push(Math.round(Math.random()*256));
      }
      this.noise.push(row);
    }
    for (let y = 0; y < HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < WIDTH; x++) {
        row.push(0);
      }
      this.licData.push(row);
    }
    this.drawCanvas(this.inputCanvasArea, this.noise);

    // Vectors
    this.someCoords.forEach((coord: MathCoordinate) => {
      const p: PixelCoordinate = RendererComponent.mathToPixel(coord);      

      const v = RendererComponent.getVector(coord);        
      const p1: PixelCoordinate = RendererComponent.mathToPixel({x: coord.x - v.x, y: coord.y - v.y});
      const p2: PixelCoordinate = RendererComponent.mathToPixel({x: coord.x + v.x, y: coord.y + v.y});
      this.svgg
        .append('line')
        .style('stroke-width', 2)
        .style('stroke', 'darkred')
        .attr('x1', p.left)
        .attr('y1', p.top)
        .attr('x2', p2.left)
        .attr('y2', p2.top)

      this.svgg
        .append('circle')
        .style('fill', 'darkred')
        .attr('r', 4)
        .attr('cx', p.left)
        .attr('cy', p.top);
    });

    this.calcLic();
  }

  private calcLic() {
    const l = 50;
    let intensity: number;
    let nextI: number;
    let nextJ: number;
    let nextArea: PointInPixel;
    let coord: MathCoordinate;;
    let v: Vector;

    for (let i = 0; i < HEIGHT; i++) {
      for (let j = 0; j < WIDTH; j++) {        

        intensity = this.noise[i + BG_MARGIN][j + BG_MARGIN];
        
        nextI = i;
        nextJ = j;
        
        coord = RendererComponent.pixelToMath({top: nextI, left: nextJ});
        v = RendererComponent.getVector(coord);
        nextArea = this.getNextArea({x: 0.5, y: 0.5}, v);
        
        for (let i=0; i<l; i++) {

          switch (nextArea.border) {
            case Border.TOP:
              nextI--;
              break;
            case Border.BOTTOM:
              nextI++;
              break;
            case Border.LEFT:
              nextJ--;
              break;
            case Border.RIGHT:
              nextJ++;
              break;
          }
      
          intensity += this.noise[nextI + BG_MARGIN][nextJ + BG_MARGIN];
          coord = RendererComponent.pixelToMath({top: nextI, left: nextJ});
          v = RendererComponent.getVector(coord);
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
        }

        nextI = i;
        nextJ = j;
        
        coord = RendererComponent.pixelToMath({top: nextI, left: nextJ});
        v = RendererComponent.getVector(coord);
        v.x *= -1;
        v.y *= -1;
        nextArea = this.getNextArea({x: 0.5, y: 0.5}, v);
        
        for (let i=0; i<l; i++) {

          switch (nextArea.border) {
            case Border.TOP:
              nextI--;
              break;
            case Border.BOTTOM:
              nextI++;
              break;
            case Border.LEFT:
              nextJ--;
              break;
            case Border.RIGHT:
              nextJ++;
              break;
          }
      
          intensity += this.noise[nextI + BG_MARGIN][nextJ + BG_MARGIN];
          coord = RendererComponent.pixelToMath({top: nextI, left: nextJ});
          v = RendererComponent.getVector(coord);
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
        }

        intensity /= (2 * l + 1);
        this.licData[i][j] = intensity;
      }
    }

    this.drawCanvas(this.outputCanvasArea, this.licData);
  }

  private getNextArea(s: MathCoordinate, v: Vector): PointInPixel {

    let alphas: number[] = []
    let beta: number;
    const offset = 0.1;
    // Top, Bottom, Left, Right
    alphas.push((1 - s.y) / v.y);
    alphas.push(-s.y / v.y);
    alphas.push(-s.x / v.x);
    alphas.push((1 - s.x) / v.x);
    alphas.forEach((alpha: number, i: number) => {
      if (alpha <= 0) alphas[i] = Infinity;
    })
    let borderIndex = alphas.indexOf(Math.min(...alphas));
    
    let border: Border;
    let pos: MathCoordinate;
    switch (borderIndex) {
      case 0:
        beta = v.x * alphas[borderIndex] + s.x;
        return {
          border: Border.TOP,
          pos: {x: beta, y: offset}
        }
      case 1:
        beta = v.x * alphas[borderIndex] + s.x;
        return {
          border: Border.BOTTOM,
          pos: {x: beta, y: 1 - offset}
        }
      case 2:
        beta = v.y * alphas[borderIndex] + s.y;
        return {
          border: Border.LEFT,
          pos: {x: 1 - offset, y: beta}
        }
      case 3:
        beta = v.y * alphas[borderIndex] + s.y;
        return {
          border: Border.RIGHT,
          pos: {x: offset, y: beta}
        }
      default:
        return {
          border: Border.CENTER,
          pos: {x: 0.5, y: 0.5}
        }
    }
  }

  private drawCanvas(canvas: ElementRef, data: number[][]): void {

    const width = canvas.nativeElement.width;
    const height = canvas.nativeElement.height;
    const ctx = canvas.nativeElement.getContext('2d');
    const imageData = ctx.getImageData(0, 0, BG_WIDTH, BG_HEIGHT);

    let buf = new ArrayBuffer(imageData.data.length);
    let buf8 = new Uint8ClampedArray(buf);
    let uint32Array = new Uint32Array(buf);
    let rowCnt = 0;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        let value = data[i][j];
        uint32Array[i * BG_WIDTH + j] = 
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
