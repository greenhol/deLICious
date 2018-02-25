import { Field, MathCoordinate, Vector } from '../field';

interface Charge {
    coord: MathCoordinate;
    magnitude: number;
}

export class ChargeField extends Field {

    private charges: Charge[];

    constructor() {
        super();
        this.charges = [
            {coord: {x: -0.4, y: -0.1}, magnitude: 1},
            {coord: {x: 0.4, y: 0.2}, magnitude: -1}
        ];
        // this.charges = [];
        // for (let i = 0; i <= 30; i++) {
        //   this.charges.push({
        //       coord: {
        //         x: -0.95 + 1.9 * Math.random(),
        //         y: -0.7 + 1.4 * Math.random()
        //       },
        //       magnitude: -10 + 20 * Math.random()
        //     });
        // }
    }

    public getVector(coord: MathCoordinate): Vector {
        let v: Vector = {x: 0, y: 0};

        for (let i = 0; i< this.charges.length; i++) {
          const rd: Vector = {x: coord.x - this.charges[i].coord.x, y: coord.y - this.charges[i].coord.y};
          const rdAbs = Math.sqrt(rd.x * rd.x + rd.y * rd.y);
          v.x += this.charges[i].magnitude * rd.x / Math.pow(rdAbs, 3);
          v.y += this.charges[i].magnitude * rd.y / Math.pow(rdAbs, 3);
        }
    
        const vAbs = Math.sqrt(v.x * v.x + v.y * v.y) * 15;
    
        return {x: v.x / vAbs, y: v.y / vAbs}; // Field
        // return {x: -v.y / vAbs, y: v.x / vAbs}; // Potential
    }
}