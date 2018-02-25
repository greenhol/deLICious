export interface Color {
    r: number;
    g: number;
    b: number;
}

export interface ColorMapConfig {
    minValue: number;
    maxValue: number;
    colorSteps: string[];
}

export class ColorMap {

    private static hexToRgb(hex: string): Color | null {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    private _config: ColorMapConfig;
    private _colors: Color[] = [];
    private _intervalRange: number;
    private _intervalCount: number;
    private _lowColor: Color;
    private _highColor: Color;

    private static pad(num, size) {
        var s = '' + num;
        while (s.length < size) s = '0' + s;
        return s;
    }

    constructor(config: ColorMapConfig) {

        this._config = config;
        this._intervalCount = this._config.colorSteps.length - 1;
        this._intervalRange = (config.maxValue - config.minValue) / this._intervalCount;
        if (this._intervalCount < 1) throw new Error('number of color steps invalid (needs to be > 1)');

        this._config.colorSteps.forEach(c => this._colors.push(ColorMap.hexToRgb(c)));

        this._lowColor = ColorMap.hexToRgb(config.colorSteps[0]);
        this._highColor = ColorMap.hexToRgb(config.colorSteps[this._intervalCount]);
    }

    public get config(): ColorMapConfig {
        return this._config;
    }

    public get configAsString(): string {
        let configString = '_minValue_' + this._config.minValue;
        configString += '_maxValue_' + this._config.maxValue;
        for (let i = 0; i < this._config.colorSteps.length; i++) {
            configString += 'C' + (i+1) + this._config.colorSteps[i];
        }
        return configString;
    }

    public getColor(value: number): Color {
        if (value <= this._config.minValue) return this._lowColor;
        if (value >= this._config.maxValue) return this._highColor;

        const intervalIndex = Math.floor((value - this._config.minValue) / this._intervalRange);
        const intervalValue = (value - this._config.minValue) % this._intervalRange;
        const firstColor: Color = this._colors[intervalIndex];
        const secondColor: Color = this._colors[intervalIndex+1];

        return {
            r: Math.floor(0.5*((firstColor.r-secondColor.r)*Math.cos((Math.PI*(intervalValue))/(-this._intervalRange))+firstColor.r+secondColor.r)),
            g: Math.floor(0.5*((firstColor.g-secondColor.g)*Math.cos((Math.PI*(intervalValue))/(-this._intervalRange))+firstColor.g+secondColor.g)),
            b: Math.floor(0.5*((firstColor.b-secondColor.b)*Math.cos((Math.PI*(intervalValue))/(-this._intervalRange))+firstColor.b+secondColor.b))
        };
    }

}
