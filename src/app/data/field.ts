export interface Coord {
    x: number;
    y: number;
}

export interface MathCoordinate {
    x: number;
    y: number;
}

export interface Vector {
    vX: number;
    vXn: number;
    vY: number;
    vYn: number;
    value: number;
}  

export abstract class Field {
    public abstract getVector(coord: MathCoordinate): Vector;
}
