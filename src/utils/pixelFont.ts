/**
 * ビットマップピクセルフォント
 * 5x7ピクセルのレトロゲーム風フォント
 */

export type FontData = { [key: string]: number[][] };

// シングルトンインスタンス
let instance: PixelFont | null = null;

export class PixelFont {
    private fontData: FontData;
    public charWidth: number;
    public charHeight: number;
    public defaultSpacing: number;

    constructor() {
        // シングルトンパターンを実装
        if (instance) {
            return instance;
        }
        
        // 5x7ピクセルのフォントデータ
        this.fontData = {
            // 数字
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

            // アルファベット（大文字）
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

            // 記号
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

        this.charWidth = 5;
        this.charHeight = 7;
        this.defaultSpacing = 1;
        
        // インスタンスを保存
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        instance = this;
    }

    /**
     * テキストを描画
     */
    drawText(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        x: number, 
        y: number, 
        scale: number = 1, 
        color: string = '#FFFFFF', 
        spacing: number | null = null
    ): void {
        // Canvas設定を保存
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
        
        // Canvas設定を復元
        ctx.imageSmoothingEnabled = savedSmoothing;
    }

    /**
     * 単一文字を描画
     * @private
     */
    private drawChar(
        ctx: CanvasRenderingContext2D, 
        char: string, 
        x: number, 
        y: number, 
        scale: number, 
        color: string
    ): void {
        const charData = this.fontData[char];
        ctx.fillStyle = color;

        for (let row = 0; row < charData.length; row++) {
            for (let col = 0; col < charData[row].length; col++) {
                if (charData[row][col] === 1) {
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

    /**
     * テキストの描画幅を計算
     */
    getTextWidth(text: string, scale: number = 1, spacing: number | null = null): number {
        const actualSpacing = spacing !== null ? spacing : this.defaultSpacing;
        const charCount = text.length;
        return (this.charWidth * charCount + actualSpacing * (charCount - 1)) * scale;
    }

    /**
     * テキストの描画高さを取得
     */
    getTextHeight(scale: number = 1): number {
        return this.charHeight * scale;
    }

    /**
     * 中央揃えでテキストを描画
     */
    drawTextCentered(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        centerX: number, 
        y: number, 
        scale: number = 1, 
        color: string = '#FFFFFF', 
        spacing: number | null = null
    ): void {
        const textWidth = this.getTextWidth(text, scale, spacing);
        const x = centerX - textWidth / 2;
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }

    /**
     * 右揃えでテキストを描画
     */
    drawTextRight(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        rightX: number, 
        y: number, 
        scale: number = 1, 
        color: string = '#FFFFFF', 
        spacing: number | null = null
    ): void {
        const textWidth = this.getTextWidth(text, scale, spacing);
        const x = rightX - textWidth;
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }
    
    /**
     * パレットインデックスを使用してテキストを描画
     */
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
        const color = palette[colorIndex] || '#FFFFFF';
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }
    
    /**
     * 影付きテキストを描画（レトロゲーム風）
     */
    drawTextWithShadow(
        ctx: CanvasRenderingContext2D, 
        text: string, 
        x: number, 
        y: number, 
        scale: number = 1, 
        color: string = '#FFFFFF', 
        shadowColor: string = '#000000', 
        shadowOffset: number = 1
    ): void {
        // 影を描画
        this.drawText(ctx, text, x + shadowOffset * scale, y + shadowOffset * scale, scale, shadowColor);
        // メインテキストを描画
        this.drawText(ctx, text, x, y, scale, color);
    }
    
    /**
     * 文字が存在するかチェック
     */
    hasChar(char: string): boolean {
        return Object.prototype.hasOwnProperty.call(this.fontData, char.toUpperCase());
    }
    
    /**
     * 数字を指定桁数でゼロパディングして描画
     */
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
    
    /**
     * 時間を MM:SS 形式で描画
     */
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
    
    /**
     * テキスト内のすべての文字が描画可能かチェック
     */
    canDrawText(text: string): boolean {
        for (const char of text.toUpperCase()) {
            if (char !== ' ' && !this.hasChar(char)) {
                return false;
            }
        }
        return true;
    }
}

// デフォルトインスタンスをエクスポート
export const pixelFont = new PixelFont();