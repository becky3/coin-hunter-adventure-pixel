/**
 * ビットマップピクセルフォント
 * 5x7ピクセルのレトロゲーム風フォント
 */

// シングルトンインスタンス
let instance = null;

class PixelFont {
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
        instance = this;
    }

    /**
     * テキストを描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {string} text - 描画するテキスト
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} scale - 拡大率
     * @param {string} color - 色
     * @param {number} spacing - 文字間隔（ピクセル単位）
     */
    drawText(ctx, text, x, y, scale = 1, color = '#FFFFFF', spacing = null) {
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
    drawChar(ctx, char, x, y, scale, color) {
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
     * @param {string} text - テキスト
     * @param {number} scale - 拡大率
     * @param {number} spacing - 文字間隔
     * @returns {number} 描画幅
     */
    getTextWidth(text, scale = 1, spacing = null) {
        const actualSpacing = spacing !== null ? spacing : this.defaultSpacing;
        const charCount = text.length;
        return (this.charWidth * charCount + actualSpacing * (charCount - 1)) * scale;
    }

    /**
     * テキストの描画高さを取得
     * @param {number} scale - 拡大率
     * @returns {number} 描画高さ
     */
    getTextHeight(scale = 1) {
        return this.charHeight * scale;
    }

    /**
     * 中央揃えでテキストを描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {string} text - 描画するテキスト
     * @param {number} centerX - 中心X座標
     * @param {number} y - Y座標
     * @param {number} scale - 拡大率
     * @param {string} color - 色
     */
    drawTextCentered(ctx, text, centerX, y, scale = 1, color = '#FFFFFF', spacing = null) {
        const textWidth = this.getTextWidth(text, scale, spacing);
        const x = centerX - textWidth / 2;
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }

    /**
     * 右揃えでテキストを描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {string} text - 描画するテキスト
     * @param {number} rightX - 右端X座標
     * @param {number} y - Y座標
     * @param {number} scale - 拡大率
     * @param {string} color - 色
     */
    drawTextRight(ctx, text, rightX, y, scale = 1, color = '#FFFFFF', spacing = null) {
        const textWidth = this.getTextWidth(text, scale, spacing);
        const x = rightX - textWidth;
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }
    
    /**
     * パレットインデックスを使用してテキストを描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {string} text - 描画するテキスト
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} scale - 拡大率
     * @param {Array} palette - パレット配列
     * @param {number} colorIndex - パレットインデックス
     * @param {number} spacing - 文字間隔
     */
    drawTextWithPalette(ctx, text, x, y, scale = 1, palette, colorIndex = 0, spacing = null) {
        const color = palette[colorIndex] || '#FFFFFF';
        this.drawText(ctx, text, x, y, scale, color, spacing);
    }
    
    /**
     * 影付きテキストを描画（レトロゲーム風）
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {string} text - 描画するテキスト
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} scale - 拡大率
     * @param {string} color - メイン色
     * @param {string} shadowColor - 影の色
     * @param {number} shadowOffset - 影のオフセット（ピクセル単位）
     */
    drawTextWithShadow(ctx, text, x, y, scale = 1, color = '#FFFFFF', shadowColor = '#000000', shadowOffset = 1) {
        // 影を描画
        this.drawText(ctx, text, x + shadowOffset * scale, y + shadowOffset * scale, scale, shadowColor);
        // メインテキストを描画
        this.drawText(ctx, text, x, y, scale, color);
    }
    
    /**
     * 文字が存在するかチェック
     * @param {string} char - チェックする文字
     * @returns {boolean} 文字が存在する場合true
     */
    hasChar(char) {
        return Object.prototype.hasOwnProperty.call(this.fontData, char.toUpperCase());
    }
    
    /**
     * 数字を指定桁数でゼロパディングして描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {number} number - 描画する数値
     * @param {number} digits - 桁数
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} scale - 拡大率
     * @param {string} color - 色
     */
    drawNumber(ctx, number, digits, x, y, scale = 1, color = '#FFFFFF') {
        const numStr = Math.floor(number).toString();
        const paddedStr = numStr.padStart(digits, '0');
        this.drawText(ctx, paddedStr, x, y, scale, color);
    }
    
    /**
     * 時間を MM:SS 形式で描画
     * @param {CanvasRenderingContext2D} ctx - Canvas コンテキスト
     * @param {number} seconds - 秒数
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} scale - 拡大率
     * @param {string} color - 色
     */
    drawTime(ctx, seconds, x, y, scale = 1, color = '#FFFFFF') {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.drawText(ctx, timeStr, x, y, scale, color);
    }
    
    /**
     * テキスト内のすべての文字が描画可能かチェック
     * @param {string} text - チェックするテキスト
     * @returns {boolean} すべて描画可能な場合true
     */
    canDrawText(text) {
        for (const char of text.toUpperCase()) {
            if (char !== ' ' && !this.hasChar(char)) {
                return false;
            }
        }
        return true;
    }
}

// デフォルトインスタンスをエクスポート
const pixelFont = new PixelFont();

export { PixelFont, pixelFont };