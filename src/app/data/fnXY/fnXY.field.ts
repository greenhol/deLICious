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

        v.vX = Math.cos(coord.y*coord.y/2)*coord.y;
        v.vY = -Math.cos(coord.x*coord.x/2)*coord.x;
        
        const realValue = Math.sqrt(v.vX * v.vX + v.vY * v.vY);
        v.value = Math.sin(coord.x*coord.x/2) + Math.sin(coord.y*coord.y/2);

        v.vXn = v.vX / realValue;
        v.vYn = v.vY / realValue;
    
        return v;
    }
}