import { ElementRef, ViewChild, Input, Output, EventEmitter, Component, AfterViewInit, RenderComponentType, HostListener } from '@angular/core';
import { D3Service, D3, Selection } from 'd3-ng2-service';
import { saveAs } from 'file-saver';
import { timer } from 'rxjs/observable/timer';
// import { noise } from './noise';
import { MathCoordinate, Vector, Field } from 'app/data/field';

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
  distance: number;
}

interface PixelCoordinate {
  left: number;  
  top: number;
}

interface Dimensions {
  width?:number;
  widthHalf?:number;
  height?:number;
  heightHalf?:number;
  ratio?:number;
  outputBorderSize?:number;
  bgMargin?:number;
  bgWidth?:number;
  bgHeight?:number;
  xRange?:number;
  xRangeHalf?:number;
  mathPixelRatio?:number;
  xMin?:number;
  xMax?:number;
  yMin?:number;
  yMax?:number;
}

@Component({
  selector: 'lic-renderer',
  templateUrl: './renderer.component.html',
  styleUrls: ['./renderer.component.scss']
})
export class RendererComponent implements AfterViewInit {

  @ViewChild('inputCanvasArea') private inputCanvasArea: ElementRef;
  @ViewChild('vectorFieldSvgArea') private vectorFieldSvgArea: ElementRef;
  @ViewChild('outputCanvasArea') private outputCanvasArea: ElementRef;

  @Input() public field: Field;
  @Input() public showInput = true;
  @Input() public showVectorField = true;
  @Output() public showVectorFieldChange = new EventEmitter<boolean>();
  @Input() public showOutput = true;

  @HostListener('click', ['$event']) public onClick(e: PointerEvent) {
    console.log('pixel coord: left: ', e.offsetX + ', top: ' + e.offsetY);
    let coord = this.pixelToMath({top: e.offsetY, left: e.offsetX});
    console.log('math coord: x: ', coord.x + ', y: ' + coord.y);
    let v = this.field.getVector(coord);
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
  
      coord = this.pixelToMath({top: nextY, left: nextX});
      v = this.field.getVector(coord);
      nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
      console.log('NEXTNEXT: ', nextArea);
    }
  }

  private DIM: Dimensions = {};

  private d3: D3;
  private svg: any;
  private svgg: any;

  private someCoords: MathCoordinate[] = [];
  private noise: number[][] = [];
  private licData: number[][] = [];

  constructor(d3Service: D3Service, private hostElement: ElementRef) {
    this.d3 = d3Service.getD3();
  }

  ngAfterViewInit() {

    this.DIM.bgMargin = 99;
    this.DIM.outputBorderSize = 1;
    this.DIM.xRange = 2;

    this.DIM.bgWidth = this.hostElement.nativeElement.clientWidth;
    this.DIM.bgHeight = this.hostElement.nativeElement.clientHeight;
    this.DIM.width = this.DIM.bgWidth - 2 * this.DIM.bgMargin;
    this.DIM.widthHalf = this.DIM.width / 2;    
    this.DIM.height = this.DIM.bgHeight - 2 * this.DIM.bgMargin;
    this.DIM.heightHalf = this.DIM.height / 2;
    this.DIM.ratio = this.DIM.width / this.DIM.height;
    this.DIM.xRangeHalf = this.DIM.xRange;
    this.DIM.mathPixelRatio = this.DIM.xRange / this.DIM.width;
    this.DIM.xMin = -this.DIM.xRange / 2;
    this.DIM.xMax = this.DIM.xRange / 2;
    this.DIM.yMin = this.DIM.xMin / this.DIM.ratio;
    this.DIM.yMax = this.DIM.xMax / this.DIM.ratio;

    console.log('width: ', this.hostElement.nativeElement.clientWidth);
    console.log('height: ', this.hostElement.nativeElement.clientHeight);

    // Demo Points
    for (let x = -0.95; x <= 0.95; x+=0.06) {
      for (let y = -0.7; y <= 0.7; y+=0.06) {
        this.someCoords.push({x: x, y: y});
      }  
    }
    // inputCanvasArea
    this.inputCanvasArea.nativeElement.width = this.DIM.bgWidth;
    this.inputCanvasArea.nativeElement.height = this.DIM.bgHeight;
    // vectorFieldSvgArea
    this.vectorFieldSvgArea.nativeElement.style.width = this.DIM.width + 'px';
    this.vectorFieldSvgArea.nativeElement.style.height = this.DIM.height + 'px';
    this.vectorFieldSvgArea.nativeElement.style.left = this.DIM.bgMargin + 'px';
    this.vectorFieldSvgArea.nativeElement.style.top = this.DIM.bgMargin + 'px';
    this.svg = this.d3.select(this.vectorFieldSvgArea.nativeElement);
    this.svgg = this.svg.append('g').attr('transform', 'translate(.5, .5)');
    // outputCanvasArea
    this.outputCanvasArea.nativeElement.width = this.DIM.width - 2 * this.DIM.outputBorderSize;
    this.outputCanvasArea.nativeElement.height = this.DIM.height - 2 * this.DIM.outputBorderSize;
    this.outputCanvasArea.nativeElement.style.left = this.DIM.bgMargin + 'px';
    this.outputCanvasArea.nativeElement.style.top = this.DIM.bgMargin + 'px';
    this.outputCanvasArea.nativeElement.style.borderWidth = this.DIM.outputBorderSize + 'px';
    this.drawInit();
  }

  public saveLicCanvas(): void {
    this.outputCanvasArea.nativeElement.toBlob((blob) => {
      const filename = 'deLICious.png';
      console.info('Saving as: ' + filename);
      saveAs(blob, filename);
    });
  }

  private mathToPixel(coord: MathCoordinate): PixelCoordinate {
    return {
      left: Math.round((coord.x + this.DIM.xMax) / this.DIM.mathPixelRatio),
      top: Math.round(-(coord.y + this.DIM.yMin) / this.DIM.mathPixelRatio),
    }
  }

  private pixelToMath(coord: PixelCoordinate): MathCoordinate {
    return {
      x: this.DIM.mathPixelRatio * coord.left + this.DIM.xMin,
      y: this.DIM.yMax - this.DIM.mathPixelRatio * coord.top
    }
  }

  private drawInit(): void {

    for (let y = 0; y < this.DIM.bgHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.DIM.bgWidth; x++) {
        let intensity = Math.random();
        // if (intensity > 0.1) intensity = 1;
        // else intensity = 0;
        row.push(Math.round(intensity * 255));
      }
      this.noise.push(row);
    }
    // this.noise = JSON.parse(noise);

    for (let y = 0; y < this.DIM.height; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.DIM.width; x++) {
        row.push(0);
      }
      this.licData.push(row);
    }
    this.drawCanvas(this.inputCanvasArea, this.noise);

    // Vectors
    this.someCoords.forEach((coord: MathCoordinate) => {
      const p: PixelCoordinate = this.mathToPixel(coord);      

      const v = this.field.getVector(coord);        
      const p1: PixelCoordinate = this.mathToPixel({x: coord.x - v.x, y: coord.y - v.y});
      const p2: PixelCoordinate = this.mathToPixel({x: coord.x + v.x, y: coord.y + v.y});
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

    timer(0).subscribe(() => {
      this.calcLicByPixel();
      this.drawCanvas(this.outputCanvasArea, this.licData);
      this.showVectorField = false;
      this.showVectorFieldChange.emit(this.showVectorField);
    })
  }

  private calcLicByPixel() {
    const l = 10;
    let intensity: number;
    let nextI: number;
    let nextJ: number;
    let nextArea: PointInPixel;
    let coord: MathCoordinate;;
    let v: Vector;
    let rowCnt = 0;
    let timeStamp = Date.now();
    console.info('calculation started (type: PIXEL, l: ' + (2*l) + ')');

    for (let i = 0; i < this.DIM.height; i++) {
      for (let j = 0; j < this.DIM.width; j++) {        
        intensity = this.noise[i + this.DIM.bgMargin][j + this.DIM.bgMargin];        
        nextI = i;
        nextJ = j;
        coord = this.pixelToMath({top: nextI, left: nextJ});
        v = this.field.getVector(coord);
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
          intensity += this.noise[nextI + this.DIM.bgMargin][nextJ + this.DIM.bgMargin];
          coord = this.pixelToMath({top: nextI, left: nextJ});
          v = this.field.getVector(coord);
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
        }

        nextI = i;
        nextJ = j;        
        coord = this.pixelToMath({top: nextI, left: nextJ});
        v = this.field.getVector(coord);
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
      
          intensity += this.noise[nextI + this.DIM.bgMargin][nextJ + this.DIM.bgMargin];
          coord = this.pixelToMath({top: nextI, left: nextJ});
          v = this.field.getVector(coord);
          v.x *= -1;
          v.y *= -1;
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
        }

        intensity /= (2 * l + 1);
        this.licData[i][j] = intensity;
      }
      if (rowCnt > 49) {
        console.info('calculating: ' + Math.round(100 * i / this.DIM.height) + '%');
        rowCnt = 0;
      }
      rowCnt++;
    }
    console.info('calculation done in ' + (Date.now() - timeStamp)/1000 + 's');
  }

  private calcLicByLength() {
    const l = 20/Math.SQRT2;
    let intensity: number;
    let factor: number;
    let nextI: number;
    let nextJ: number;
    let restDistance: number;
    let nextArea: PointInPixel;
    let coord: MathCoordinate;;
    let v: Vector;
    let rowCnt = 0;
    let timeStamp = Date.now();
    console.info('calculation started (type: LENGTH, l: ' + (2*l) + ')');

    for (let i = 0; i < this.DIM.height; i++) {
      for (let j = 0; j < this.DIM.width; j++) {        
        nextI = i;
        nextJ = j;
        restDistance = l;        
        coord = this.pixelToMath({top: nextI, left: nextJ});
        v = this.field.getVector(coord);
        nextArea = this.getNextArea({x: 0.5, y: 0.5}, v);
        factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
        intensity = this.noise[i + this.DIM.bgMargin][j + this.DIM.bgMargin] * factor;
        restDistance = l - nextArea.distance;
        while (restDistance > 0) {
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
      
          coord = this.pixelToMath({top: nextI, left: nextJ});
          v = this.field.getVector(coord);
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
          factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
          intensity += (this.noise[nextI + this.DIM.bgMargin][nextJ + this.DIM.bgMargin]) * factor;
          restDistance -= nextArea.distance;
        }

        nextI = i;
        nextJ = j;
        restDistance = l;
        coord = this.pixelToMath({top: nextI, left: nextJ});
        v = this.field.getVector(coord);
        v.x *= -1;
        v.y *= -1;
        nextArea = this.getNextArea({x: 0.5, y: 0.5}, v);
        factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
        intensity += this.noise[i + this.DIM.bgMargin][j + this.DIM.bgMargin] * factor;
        restDistance = l - nextArea.distance;
        while (restDistance > 0) {
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
      
          coord = this.pixelToMath({top: nextI, left: nextJ});
          v = this.field.getVector(coord);
          v.x *= -1;
          v.y *= -1;
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
          factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
          intensity += (this.noise[nextI + this.DIM.bgMargin][nextJ + this.DIM.bgMargin]) * factor;
          restDistance -= nextArea.distance;
        }

        intensity = Math.round(intensity / (2*l));
        if (intensity > 255) intensity = 255;
        this.licData[i][j] = intensity;
      }
      if (rowCnt > 49) {
        console.info('calculating: ' + Math.round(100 * i / this.DIM.height) + '%');
        rowCnt = 0;
      }
      rowCnt++;
    }
    console.info('calculation done in ' + (Date.now() - timeStamp)/1000 + 's');
  }

  private getNextArea(s: MathCoordinate, v: Vector): PointInPixel {

    let alphas: number[] = []
    let beta: number;
    const offset = 0.01;
    // Top, Bottom, Left, Right
    alphas.push((1 - s.y) / v.y);
    alphas.push(-s.y / v.y);
    alphas.push(-s.x / v.x);
    alphas.push((1 - s.x) / v.x);
    alphas.forEach((alpha: number, i: number) => {
      if (alpha <= 0) alphas[i] = Infinity;
    })
    const borderIndex = alphas.indexOf(Math.min(...alphas));
    const distance = Math.sqrt(Math.pow(alphas[borderIndex] * v.x, 2) + Math.pow(alphas[borderIndex] * v.y, 2)) / Math.SQRT2;
    
    switch (borderIndex) {
      case 0: // Top
        beta = v.x * alphas[borderIndex] + s.x;
        return {
          border: Border.TOP,
          pos: {x: beta, y: offset},
          distance: distance
        }
      case 1: // Bottom
        beta = v.x * alphas[borderIndex] + s.x;
        return {
          border: Border.BOTTOM,
          pos: {x: beta, y: 1 - offset},
          distance: distance
        }
      case 2: // Left
        beta = v.y * alphas[borderIndex] + s.y;
        return {
          border: Border.LEFT,
          pos: {x: 1 - offset, y: beta},
          distance: distance
        }
      case 3: // Right
        beta = v.y * alphas[borderIndex] + s.y;
        return {
          border: Border.RIGHT,
          pos: {x: offset, y: beta},
          distance: distance
        }
      default:
        return {
          border: Border.CENTER,
          pos: {x: 0.5, y: 0.5},
          distance: distance
        }
    }
  }

  private drawCanvas(canvas: ElementRef, data: number[][]): void {

    const width = canvas.nativeElement.width;
    const height = canvas.nativeElement.height;
    const ctx = canvas.nativeElement.getContext('2d');
    const imageData = ctx.getImageData(0, 0, this.DIM.bgWidth, this.DIM.bgHeight);

    let buf = new ArrayBuffer(imageData.data.length);
    let buf8 = new Uint8ClampedArray(buf);
    let uint32Array = new Uint32Array(buf);
    let rowCnt = 0;

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        let value = data[i][j];
        uint32Array[i * this.DIM.bgWidth + j] = 
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
