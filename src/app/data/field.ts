export interface Coord {
    x: number;
    y: number;
}

export interface MathCoordinate {
    x: number;
    y: number;
}

export interface Vector {
    x: number;
    y: number;
}  

export abstract class Field {
    public abstract getVector(coord: MathCoordinate): Vector;
}
