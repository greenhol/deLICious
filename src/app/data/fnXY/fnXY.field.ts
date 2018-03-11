import { Field, MathCoordinate, Vector } from '../field';

export class FnXYField extends Field {

    public getVector(coord: MathCoordinate): Vector {
        let v: Vector = {
            vX: 0,
            vXn: 1,
            vY: 0,
            vYn: 0,
            value: 1
        };

        v.vX = Math.sin(coord.x*coord.x*Math.PI);
        v.vY = Math.sin(coord.y*coord.y*Math.PI);
        
        // Rotate for Whatever
        v = {vX: -v.vY, vXn: 1, vY: v.vX, vYn: 0, value: 1};

        v.value = Math.sqrt(v.vX * v.vX + v.vY * v.vY);
        v.vXn = v.vX / v.value;
        v.vYn = v.vY / v.value;
    
        return v;
    }
}