export interface Color {
    r: number;
    g: number;
    b: number;
}

export interface ColorStep {
    nextColor: string;
    range: number;
}

export interface ColorMapConfig {
    startValue: number;
    startColor: string;
    colorSteps: ColorStep[];
}

export enum ColorEvalType {
    Linear,
    Trig
}

type ColorEvalFunction = (value: number, firstColor: Color, secondColor: Color, range: number) => Color;

export class ColorMap {

    public static hexToRgb(hex: string): Color | null {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    public static rgbToHex(rgb: Color): string {
        const r = rgb.r.toString(16);
        const g = rgb.g.toString(16);
        const b = rgb.b.toString(16);
        return "#" +
            (r.length == 1 ? "0" + r : r) +
            (g.length == 1 ? "0" + g : g) +
            (b.length == 1 ? "0" + b : b);
    }

    private _config: ColorMapConfig;
    private _colors: Color[] = [];
    private _intervalCount: number;
    private _lowColor: Color;
    private _highColor: Color;
    private _endValue: number;
    private _colorEval: ColorEvalFunction;

    private static pad(num, size) {
        var s = '' + num;
        while (s.length < size) s = '0' + s;
        return s;
    }

    constructor(config: ColorMapConfig, colorEvalType: ColorEvalType) {

        this._config = config;
        this._intervalCount = this._config.colorSteps.length;
        if (this._intervalCount < 1) throw new Error('number of color steps invalid (needs to be > 0)');

        this._colors.push(ColorMap.hexToRgb(config.startColor));
        this._endValue = this._config.startValue;
        this._config.colorSteps.forEach(colorStep => {
            this._endValue += colorStep.range;
            this._colors.push(ColorMap.hexToRgb(colorStep.nextColor));
        });

        this._lowColor = ColorMap.hexToRgb(config.startColor);
        this._highColor = ColorMap.hexToRgb(config.colorSteps[this._intervalCount-1].nextColor);

        switch (colorEvalType) {
            case ColorEvalType.Linear:
                this._colorEval = function(value: number, firstColor: Color, secondColor: Color, range: number): Color {
                    return {
                        r: Math.floor((secondColor.r-firstColor.r)/range*value+firstColor.r),
                        g: Math.floor((secondColor.g-firstColor.g)/range*value+firstColor.g),
                        b: Math.floor((secondColor.b-firstColor.b)/range*value+firstColor.b)
                    };
                }
                break;
            case ColorEvalType.Trig:
                this._colorEval = function(value: number, firstColor: Color, secondColor: Color, range: number): Color {
                    return {
                        r: Math.floor(0.5*((firstColor.r-secondColor.r)*Math.cos((Math.PI*(value))/(-range))+firstColor.r+secondColor.r)),
                        g: Math.floor(0.5*((firstColor.g-secondColor.g)*Math.cos((Math.PI*(value))/(-range))+firstColor.g+secondColor.g)),
                        b: Math.floor(0.5*((firstColor.b-secondColor.b)*Math.cos((Math.PI*(value))/(-range))+firstColor.b+secondColor.b))
                    };
                }
                break;
        }
    }

    public get config(): ColorMapConfig {
        return this._config;
    }

    public get configAsString(): string {
        let configString = '_startValue_' + this._config.startValue;
        configString += '_startColor_' + this._config.startColor;
        for (let i = 0; i < this._config.colorSteps.length; i++) {
            configString += '_R' + this._config.colorSteps[i].range;
            configString += '_C' + this._config.colorSteps[i].nextColor;
        }
        return configString;
    }

    public getColor(value: number): Color {
        if (value <= this._config.startValue) return this._lowColor;
        if (value >= this._endValue) return this._highColor;

        let intervalValue: number;
        let intervalRange: number;
        let intervalIndex = 0;
        let intervalStartValue = this._config.startValue;
        for (let i = 0; i<this._config.colorSteps.length; i++) {
            if (value < intervalStartValue + this._config.colorSteps[i].range) {
                intervalValue = value - intervalStartValue;
                intervalRange = this._config.colorSteps[i].range;
                break;
            }
            intervalStartValue += this.config.colorSteps[i].range;
            intervalIndex++;
        }
        const firstColor: Color = this._colors[intervalIndex];
        const secondColor: Color = this._colors[intervalIndex+1];

        return this._colorEval(intervalValue, firstColor, secondColor, intervalRange);
    }

}
