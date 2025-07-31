
import { UI_PALETTE_INDICES } from './pixelArtPalette';
import { MasterPalette } from '../rendering/MasterPalette';

export type FontData = { [key: string]: number[][] };

let instance: PixelFont | null = null;

/**
 * PixelFont implementation
 */
export class PixelFont {
    private fontData: FontData = {};
    public charWidth: number = 5;
    public charHeight: number = 7;
    public defaultSpacing: number = 1;

    constructor() {

        if (instance) {
            return instance;
        }

        this.fontData = {

            '0': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,1,1],
                [1,0,1,0,1],
                [1,1,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '1': [
                [0,0,1,0,0],
                [0,1,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [1,1,1,1,1]
            ],
            '2': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,0,1,0,0],
                [0,1,0,0,0],
                [1,1,1,1,1]
            ],
            '3': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [0,0,0,0,1],
                [0,0,1,1,0],
                [0,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '4': [
                [0,0,0,1,0],
                [0,0,1,1,0],
                [0,1,0,1,0],
                [1,0,0,1,0],
                [1,1,1,1,1],
                [0,0,0,1,0],
                [0,0,0,1,0]
            ],
            '5': [
                [1,1,1,1,1],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [0,0,0,0,1],
                [0,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '6': [
                [0,0,1,1,0],
                [0,1,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '7': [
                [1,1,1,1,1],
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,0,0,1,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0]
            ],
            '8': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '9': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,1],
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,1,1,0,0]
            ],

            'A': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'B': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,0]
            ],
            'C': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'D': [
                [1,1,1,0,0],
                [1,0,0,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,1,0],
                [1,1,1,0,0]
            ],
            'E': [
                [1,1,1,1,1],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],
            'F': [
                [1,1,1,1,1],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0]
            ],
            'G': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,0],
                [1,0,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'H': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'I': [
                [0,1,1,1,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,1,1,1,0]
            ],
            'J': [
                [0,0,1,1,1],
                [0,0,0,1,0],
                [0,0,0,1,0],
                [0,0,0,1,0],
                [0,0,0,1,0],
                [1,0,0,1,0],
                [0,1,1,0,0]
            ],
            'K': [
                [1,0,0,0,1],
                [1,0,0,1,0],
                [1,0,1,0,0],
                [1,1,0,0,0],
                [1,0,1,0,0],
                [1,0,0,1,0],
                [1,0,0,0,1]
            ],
            'L': [
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],
            'M': [
                [1,0,0,0,1],
                [1,1,0,1,1],
                [1,0,1,0,1],
                [1,0,1,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'N': [
                [1,0,0,0,1],
                [1,1,0,0,1],
                [1,0,1,0,1],
                [1,0,0,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'O': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'P': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0]
            ],
            'Q': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,1,0,1],
                [1,0,0,1,0],
                [0,1,1,0,1]
            ],
            'R': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,0],
                [1,0,1,0,0],
                [1,0,0,1,0],
                [1,0,0,0,1]
            ],
            'S': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,0],
                [0,1,1,1,0],
                [0,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'T': [
                [1,1,1,1,1],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0]
            ],
            'U': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'V': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,0,1,0],
                [0,0,1,0,0]
            ],
            'W': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,1,0,1],
                [1,0,1,0,1],
                [1,1,0,1,1],
                [1,0,0,0,1]
            ],
            'X': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,0,1,0],
                [0,0,1,0,0],
                [0,1,0,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'Y': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,0,1,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0]
            ],
            'Z': [
                [1,1,1,1,1],
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,0,1,0,0],
                [0,1,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],

            '.': [
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,1,1,0,0],
                [0,1,1,0,0]
            ],
            ',': [
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,1,1,0,0],
                [0,0,1,0,0],
                [0,1,0,0,0]
            ],
            '!': [
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,0,0,0],
                [0,0,1,0,0]
            ],
            '?': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,0,1,0,0],
                [0,0,0,0,0],
                [0,0,1,0,0]
            ],
            ':': [
                [0,0,0,0,0],
                [0,1,1,0,0],
                [0,1,1,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,1,1,0,0],
                [0,1,1,0,0]
            ],
            '-': [
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [1,1,1,1,1],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0]
            ],
            '+': [
                [0,0,0,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [1,1,1,1,1],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,0,0,0]
            ],
            '=': [
                [0,0,0,0,0],
                [0,0,0,0,0],
                [1,1,1,1,1],
                [0,0,0,0,0],
                [1,1,1,1,1],
                [0,0,0,0,0],
                [0,0,0,0,0]
            ],
            '/': [
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,0,0,1,0],
                [0,0,1,0,0],
                [0,1,0,0,0],
                [0,1,0,0,0],
                [1,0,0,0,0]
            ],
            ' ': [
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0],
                [0,0,0,0,0]
            ]
        };


        instance = this as PixelFont;
    }

    drawText(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        x: number, 
        y: number, 
        scale: number = 1, 
        color?: string, 
        spacing: number | null = null
    ): void {
        if (!color) {
            color = MasterPalette.getColor(UI_PALETTE_INDICES.primaryText);
        }

        const savedSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        const actualSpacing = spacing !== null ? spacing : this.defaultSpacing;
        let currentX = x;

        for (const char of text.toUpperCase()) {
            if (this.fontData[char]) {
                this.drawChar(ctx, char, currentX, y, scale, color);
                currentX += (this.charWidth + actualSpacing) * scale;
            } else if (char === ' ') {
                currentX += (this.charWidth + actualSpacing) * scale;
            }
        }

        ctx.imageSmoothingEnabled = savedSmoothing;
    }

    private drawChar(
        ctx: CanvasRenderingContext2D, 
        char: string, 
        x: number, 
        y: number, 
        scale: number, 
        color: string
    ): void {
        const charData = this.fontData[char];
        if (!charData) {
            throw new Error(`Character not found in font data: ${char}`);
        }
        ctx.fillStyle = color;

        for (let row = 0; row < charData.length; row++) {
            const rowData = charData[row];
            if (!rowData) {
                throw new Error(`Invalid row data at index ${row} for character: ${char}`);
            }
            for (let col = 0; col < rowData.length; col++) {
                if (rowData[col] === 1) {
                    ctx.fillRect(
                        x + col * scale,
                        y + row * scale,
                        scale,
                        scale
                    );
                }
            }
        }
    }

    getTextWidth(text: string, scale: number = 1, spacing: number | null = null): number {
        const actualSpacing = spacing !== null ? spacing : this.defaultSpacing;
        const charCount = text.length;
        return (this.charWidth * charCount + actualSpacing * (charCount - 1)) * scale;
    }

    getTextHeight(scale: number = 1): number {
        return this.charHeight * scale;
    }

    drawTextCentered(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        centerX: number, 
        y: number, 
        scale: number = 1, 
        color?: string, 
        spacing: number | null = null
    ): void {
        const textWidth = this.getTextWidth(text, scale, spacing);
        const x = centerX - textWidth / 2;
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }

    drawTextRight(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        rightX: number, 
        y: number, 
        scale: number = 1, 
        color?: string, 
        spacing: number | null = null
    ): void {
        const textWidth = this.getTextWidth(text, scale, spacing);
        const x = rightX - textWidth;
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }

    drawTextWithPalette(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        x: number, 
        y: number, 
        scale: number = 1, 
        palette: string[], 
        colorIndex: number = 0, 
        spacing: number | null = null
    ): void {
        const color = palette[colorIndex];
        if (color === undefined) {
            throw new Error(`Color not found at palette index ${colorIndex}`);
        }
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }

    drawTextWithShadow(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        x: number, 
        y: number, 
        scale: number = 1, 
        color?: string, 
        shadowColor?: string, 
        shadowOffset: number = 1
    ): void {
        if (!color) {
            color = MasterPalette.getColor(UI_PALETTE_INDICES.primaryText);
        }
        if (!shadowColor) {
            shadowColor = MasterPalette.getColor(UI_PALETTE_INDICES.background);
        }

        this.drawText(ctx, text, x + shadowOffset * scale, y + shadowOffset * scale, scale, shadowColor);

        this.drawText(ctx, text, x, y, scale, color);
    }

    hasChar(char: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.fontData, char.toUpperCase());
    }

    drawNumber(
        ctx: CanvasRenderingContext2D, 
        number: number, 
        digits: number, 
        x: number, 
        y: number, 
        scale: number = 1, 
        color: string = '#FFFFFF'
    ): void {
        const numStr = Math.floor(number).toString();
        const paddedStr = numStr.padStart(digits, '0');
        this.drawText(ctx, paddedStr, x, y, scale, color);
    }

    drawTime(
        ctx: CanvasRenderingContext2D, 
        seconds: number, 
        x: number, 
        y: number, 
        scale: number = 1, 
        color: string = '#FFFFFF'
    ): void {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.drawText(ctx, timeStr, x, y, scale, color);
    }

    canDrawText(text: string): boolean {
        for (const char of text.toUpperCase()) {
            if (char !== ' ' && !this.hasChar(char)) {
                return false;
            }
        }
        return true;
    }
}

export const pixelFont = new PixelFont();