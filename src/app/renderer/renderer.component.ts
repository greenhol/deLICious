import { ElementRef, ViewChild, Input, Output, EventEmitter, Component, AfterViewInit, RenderComponentType, HostListener } from '@angular/core';
import { D3Service, D3, Selection } from 'd3-ng2-service';
import { saveAs } from 'file-saver';
import { timer } from 'rxjs/observable/timer';
import { MathCoordinate, Vector, Field } from './../data/field';
import { ColorMap, Color, ColorEvalType } from './../data/color-map';
// import { NOISE } from '../data/_noise';
// import { DRAW_NOISE } from '../data/_drawNoise';

function roundByMaxDigits(value: number, digitsFactor: 100): number {
  return Math.round(value * digitsFactor) / digitsFactor;
}

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
  @Input() public xMin: number = -1;
  @Input() public xMax: number = 1;
  @Input() public yOffset: number = 0;
  @Input() public showInput = true;
  @Input() public showVectorField = true;
  @Output() public showVectorFieldChange = new EventEmitter<boolean>();
  @Input() public showOutput = true;

  @HostListener('click', ['$event']) public onClick(e: PointerEvent) {
    
    console.log('pixel coord: left: ', e.offsetX + ', top: ' + e.offsetY);
    let coord = this.pixelToMath({top: e.offsetY, left: e.offsetX});
    console.log('math coord: x: ', coord.x + ', y: ' + coord.y);
    // let coordPixel = this.mathToPixel(coord);
    // console.log('pixel coord: left: ', coordPixel.left + ', top: ' + coordPixel.top);
    
    let v = this.field.getVector(coord);
    console.log('vector: ', v);

    // const pixel = RendererComponent.mathToPixel(coord);
    // console.log('pixel coord: left: ', pixel.left + ', top: ' + pixel.top);
    // let nextArea = this.getNextArea({x: 0.5, y: 0.5}, v);
    // console.log('NEXT: ', nextArea);
    // let nextX = e.offsetX;
    // let nextY = e.offsetY;
    // for (let i=0; i<10; i++) {
    //   switch (nextArea.border) {
    //     case Border.TOP:
    //       nextY--;
    //       break;
    //     case Border.BOTTOM:
    //       nextY++;
    //       break;
    //     case Border.LEFT:
    //       nextX--;
    //       break;
    //     case Border.RIGHT:
    //       nextX++;
    //       break;
    //   }
    //   coord = this.pixelToMath({top: nextY, left: nextX});
    //   v = this.field.getVector(coord);
    //   nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
    //   console.log('NEXTNEXT: ', nextArea);
    // }
  }

  private DIM: Dimensions = {};

  private d3: D3;
  private svg: any;
  private svgg: any;

  private someCoords: MathCoordinate[] = [];
  private noise: number[][] = [];
  private licData: Color[][] = [];
  private colorMap: ColorMap;

  constructor(d3Service: D3Service, private hostElement: ElementRef) {
    this.d3 = d3Service.getD3();
  }

  ngAfterViewInit() {

    this.DIM.bgMargin = 99;
    this.DIM.outputBorderSize = 1;
    this.DIM.xRange = this.xMax - this.xMin;

    this.DIM.bgWidth = this.hostElement.nativeElement.clientWidth;
    this.DIM.bgHeight = this.hostElement.nativeElement.clientHeight;
    this.DIM.width = this.DIM.bgWidth - 2 * this.DIM.bgMargin;
    this.DIM.widthHalf = this.DIM.width / 2;    
    this.DIM.height = this.DIM.bgHeight - 2 * this.DIM.bgMargin;
    this.DIM.heightHalf = this.DIM.height / 2;
    this.DIM.ratio = this.DIM.width / this.DIM.height;
    this.DIM.mathPixelRatio = this.DIM.xRange / this.DIM.width;
    this.DIM.xMin = this.xMin;
    this.DIM.xMax = this.xMax;
    this.DIM.yMin = this.yOffset - (this.DIM.xRange / this.DIM.ratio / 2);
    this.DIM.yMax = this.yOffset + (this.DIM.xRange / this.DIM.ratio / 2);

    // Demo Points
    const distanceBetweenArrows = this.DIM.xRange / this.DIM.width / 0.0375;
    for (let x = this.DIM.xMin; x <= this.DIM.xMax; x+=distanceBetweenArrows) {
      for (let y = this.DIM.yMin; y <= this.DIM.yMax; y+=distanceBetweenArrows) {
        this.someCoords.push({x: x, y: y});
      }  
    }
    this.colorMap = new ColorMap({
        startValue: 0,
        startColor: '#4682B4',
        // startColor: '#000000',
        colorSteps: [
          {nextColor: '#FFFF00', range: 0.1},
          {nextColor: '#FF8C00', range: 0.1},
          {nextColor: '#8A0000', range: 0.65},
          {nextColor: '#440000', range: 20}
        ]
      }, ColorEvalType.Trig);
    
    console.log(this.colorMap.configAsString);

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
      left: Math.round((coord.x - this.DIM.xMin) / this.DIM.mathPixelRatio),
      top: -Math.round((coord.y - this.DIM.yMax) / this.DIM.mathPixelRatio),
    }
  }

  private pixelToMath(coord: PixelCoordinate): MathCoordinate {
    return {
      x: this.DIM.mathPixelRatio * coord.left + this.DIM.xMin,
      y: this.DIM.yMax - this.DIM.mathPixelRatio * coord.top
    }
  }

  private drawInit(): void {
    const drawNoise: Color[][] = [];
    for (let y = 0; y < this.DIM.bgHeight; y++) {
      const row: number[] = [];
      const rowDraw: Color[] = [];
      for (let x = 0; x < this.DIM.bgWidth; x++) {
        let intensity = Math.random();
        if (intensity > 0.25) intensity = 1;
        else intensity = 0;
        row.push(Math.round(intensity * 255));
        rowDraw.push({
          r: Math.round(intensity * 255),
          g: Math.round(intensity * 255),
          b: Math.round(intensity * 255)
        })
      }
      this.noise.push(row);
      drawNoise.push(rowDraw);
    }
    // this.noise = JSON.parse(NOISE);
    // let drawNoise = JSON.parse(DRAW_NOISE);

    for (let y = 0; y < this.DIM.height; y++) {
      const row: Color[] = [];
      for (let x = 0; x < this.DIM.width; x++) {
        row.push({r: 0, g: 0, b: 0});
      }
      this.licData.push(row);
    }
    this.drawCanvas(this.inputCanvasArea, drawNoise);

    // Vectors
    const arrorFactor = 20 * this.DIM.xRange / this.DIM.width;
    this.someCoords.forEach((coord: MathCoordinate) => {
      const p: PixelCoordinate = this.mathToPixel(coord);
      const v = this.field.getVector(coord); 
      const p1: PixelCoordinate = this.mathToPixel({x: coord.x, y: coord.y});
      const p2: PixelCoordinate = this.mathToPixel({x: coord.x + v.vXn * arrorFactor, y: coord.y + v.vYn * arrorFactor});
      const vColor = ColorMap.rgbToHex(this.colorMap.getColor(v.value));
      this.svgg
        .append('line')
        .style('stroke-width', 2)
        .style('stroke', vColor)
        .attr('x1', p.left)
        .attr('y1', p.top)
        .attr('x2', p2.left)
        .attr('y2', p2.top);

      this.svgg
        .append('circle')
        .style('fill', vColor)
        .attr('r', 4)
        .attr('cx', p.left)
        .attr('cy', p.top);
    });
    // Coordinate System
    const xAxis1: PixelCoordinate = this.mathToPixel({x: this.DIM.xMin, y: 0});
    const xAxis2: PixelCoordinate = this.mathToPixel({x: this.DIM.xMax, y: 0});
    const yAxis1: PixelCoordinate = this.mathToPixel({x: 0, y: this.DIM.yMin});
    const yAxis2: PixelCoordinate = this.mathToPixel({x: 0, y: this.DIM.yMax});
    const origin: PixelCoordinate = this.mathToPixel({x: 0, y: 0});
    const texts = [
      {hAnchor: 'middle', vAnchor: 'middle', x: origin.left, y: origin.top, text: `(0,0)`},
      {hAnchor: 'start', vAnchor: 'middle', x: xAxis1.left + 10, y: xAxis1.top, text: `(${roundByMaxDigits(this.DIM.xMin, 100)},0)`},
      {hAnchor: 'end', vAnchor: 'middle', x: xAxis2.left - 10, y: xAxis2.top, text: `(${roundByMaxDigits(this.DIM.xMax, 100)},0)`},
      {hAnchor: 'middle', vAnchor: 'ideographic', x: yAxis1.left, y: yAxis1.top - 10, text: `(0,${roundByMaxDigits(this.DIM.yMin, 100)})`},
      {hAnchor: 'middle', vAnchor: 'hanging', x: yAxis2.left, y: yAxis2.top + 10, text: `(0,${roundByMaxDigits(this.DIM.yMax, 100)})`}
    ];
    this.svgg
      .append('line')
      .style('stroke-width', 3)
      .style('stroke', 'darkblue')
      .attr('x1', xAxis1.left)
      .attr('y1', xAxis1.top)
      .attr('x2', xAxis2.left)
      .attr('y2', xAxis2.top);
    this.svgg
      .append('line')
      .style('stroke-width', 3)
      .style('stroke', 'darkblue')
      .attr('x1', yAxis1.left)
      .attr('y1', yAxis1.top)
      .attr('x2', yAxis2.left)
      .attr('y2', yAxis2.top);
    this.svgg.selectAll('text.text')
      .data(texts)
      .enter()
      .append('text')
      .classed('text', true)
      .style('text-anchor', d => d.hAnchor)
      .style('alignment-baseline', d => d.vAnchor)
      .attr('font-size', 36)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .text(d => d.text);

    timer(0).subscribe(() => {
      this.calcLicByLength(30);
      this.drawCanvas(this.outputCanvasArea, this.licData);
      this.showVectorField = false;
      this.showVectorFieldChange.emit(this.showVectorField);
    });
  }

  private calcLicByPixel(l: number) {
    let intensity: number;
    let nextI: number;
    let nextJ: number;
    let nextArea: PointInPixel;
    let coord: MathCoordinate;;
    let v: Vector;
    let vColor: Color;
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
        vColor = this.colorMap.getColor(v.value);
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
        v.vXn *= -1;
        v.vYn *= -1;
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
          v.vXn *= -1;
          v.vYn *= -1;
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
        }
        intensity /= (2 * l + 1);
        this.licData[i][j] = {
          r: Math.floor(intensity * vColor.r / 255),
          g: Math.floor(intensity * vColor.g / 255),
          b: Math.floor(intensity * vColor.b / 255)
        };
      }
      if (rowCnt > 49) {
        console.info('calculating: ' + Math.round(100 * i / this.DIM.height) + '%');
        rowCnt = 0;
      }
      rowCnt++;
    }
    console.info('calculation done in ' + (Date.now() - timeStamp)/1000 + 's');
  }

  private calcLicByLength(l: number) {
    l = l/Math.SQRT2;
    let intensity: number;
    let factor: number;
    let nextI: number;
    let nextJ: number;
    let restDistance: number;
    let nextArea: PointInPixel;
    let coord: MathCoordinate;;
    let v: Vector;
    let vColor: Color;
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
        vColor = this.colorMap.getColor(v.value);
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
        v.vXn *= -1;
        v.vYn *= -1;
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
          v.vXn *= -1;
          v.vYn *= -1;
          nextArea = this.getNextArea({x: nextArea.pos.x, y: nextArea.pos.y}, v);
          factor = (nextArea.distance < restDistance) ? nextArea.distance : restDistance;
          intensity += (this.noise[nextI + this.DIM.bgMargin][nextJ + this.DIM.bgMargin]) * factor;
          restDistance -= nextArea.distance;
        }

        intensity = Math.round(intensity / (2*l));
        if (intensity > 255) intensity = 255;
        this.licData[i][j] = {
          r: Math.floor(intensity * vColor.r / 255),
          g: Math.floor(intensity * vColor.g / 255),
          b: Math.floor(intensity * vColor.b / 255)
        };
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
    alphas.push((1 - s.y) / v.vYn);
    alphas.push(-s.y / v.vYn);
    alphas.push(-s.x / v.vXn);
    alphas.push((1 - s.x) / v.vXn);
    alphas.forEach((alpha: number, i: number) => {
      if (alpha <= 0) alphas[i] = Infinity;
    })
    const borderIndex = alphas.indexOf(Math.min(...alphas));
    const distance = Math.sqrt(Math.pow(alphas[borderIndex] * v.vXn, 2) + Math.pow(alphas[borderIndex] * v.vYn, 2)) / Math.SQRT2;
    
    switch (borderIndex) {
      case 0: // Top
        beta = v.vXn * alphas[borderIndex] + s.x;
        return {
          border: Border.TOP,
          pos: {x: beta, y: offset},
          distance: distance
        }
      case 1: // Bottom
        beta = v.vXn * alphas[borderIndex] + s.x;
        return {
          border: Border.BOTTOM,
          pos: {x: beta, y: 1 - offset},
          distance: distance
        }
      case 2: // Left
        beta = v.vYn * alphas[borderIndex] + s.y;
        return {
          border: Border.LEFT,
          pos: {x: 1 - offset, y: beta},
          distance: distance
        }
      case 3: // Right
        beta = v.vYn * alphas[borderIndex] + s.y;
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

  private drawCanvas(canvas: ElementRef, data: Color[][]): void {

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
          (value.b << 16) |     // blue
          (value.g << 8) |      // green
          value.r;              // red
      }
    }

    imageData.data.set(buf8);
    ctx.putImageData(imageData, 0, 0);  
  }

}
