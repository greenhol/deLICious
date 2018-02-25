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
        let v: Vector = {
            vX: 0,
            vXn: 1,
            vY: 0,
            vYn: 0,
            value: 1
        };

        for (let i = 0; i< this.charges.length; i++) {
          const rdX = coord.x - this.charges[i].coord.x;
          const rdY = coord.y - this.charges[i].coord.y;
          const rdValue = Math.sqrt(rdX * rdX + rdY * rdY);
          v.vX += this.charges[i].magnitude * rdX / Math.pow(rdValue, 3);
          v.vY += this.charges[i].magnitude * rdY / Math.pow(rdValue, 3);
        }
    
        // Rotate for Potential
        // v = {vX: -v.vY, vXn: 1, vY: v.vX, vYn: 0, value: 1};
        
        v.value = Math.sqrt(v.vX * v.vX + v.vY * v.vY);
        v.vXn = v.vX / v.value;
        v.vYn = v.vY / v.value;
    
        return v;
    }
}