/**
 * ピクセルレンダラー
 * Canvas描画を抽象化し、ピクセルアート表示に特化したレンダリングを提供
 */
export class PixelRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // ピクセルアートのためアンチエイリアスを無効化
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        // キャンバスサイズ
        this.width = canvas.width;
        this.height = canvas.height;
        
        // カメラオフセット
        this.cameraX = 0;
        this.cameraY = 0;
        
        // スプライトキャッシュ
        this.spriteCache = new Map();
        
        // デバッグ表示
        this.debug = false;
    }
    
    /**
     * キャンバスをクリア
     * @param {string} color - 背景色（省略時は透明）
     */
    clear(color = null) {
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, this.width, this.height);
        } else {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }
    
    /**
     * カメラ位置を設定
     * @param {number} x - カメラX座標
     * @param {number} y - カメラY座標
     */
    setCamera(x, y) {
        this.cameraX = Math.floor(x);
        this.cameraY = Math.floor(y);
    }
    
    /**
     * スプライトを描画
     * @param {ImageData|HTMLCanvasElement} sprite - スプライトデータ
     * @param {number} x - ワールドX座標
     * @param {number} y - ワールドY座標
     * @param {number} scale - 描画スケール
     * @param {boolean} flipX - 水平反転
     */
    drawSprite(sprite, x, y, scale = 1, flipX = false) {
        // 整数座標に丸める
        const drawX = Math.floor(x - this.cameraX);
        const drawY = Math.floor(y - this.cameraY);
        
        // 画面外は描画しない
        if (drawX + sprite.width * scale < 0 || drawX > this.width ||
            drawY + sprite.height * scale < 0 || drawY > this.height) {
            return;
        }
        
        this.ctx.save();
        
        if (flipX) {
            // 水平反転
            this.ctx.translate(drawX + sprite.width * scale, drawY);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-drawX, -drawY);
        }
        
        if (sprite instanceof ImageData) {
            // ImageDataの場合は一旦キャンバスに描画
            const tempCanvas = this._getOrCreateTempCanvas(sprite);
            this.ctx.drawImage(
                tempCanvas,
                0, 0, sprite.width, sprite.height,
                drawX, drawY, sprite.width * scale, sprite.height * scale
            );
        } else {
            // Canvas要素の場合はそのまま描画
            this.ctx.drawImage(
                sprite,
                0, 0, sprite.width, sprite.height,
                drawX, drawY, sprite.width * scale, sprite.height * scale
            );
        }
        
        this.ctx.restore();
        
        // デバッグ時は当たり判定ボックスを表示
        if (this.debug) {
            this.drawDebugBox(drawX, drawY, sprite.width * scale, sprite.height * scale);
        }
    }
    
    /**
     * 矩形を描画
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} width - 幅
     * @param {number} height - 高さ
     * @param {string} color - 色
     * @param {boolean} fill - 塗りつぶし
     */
    drawRect(x, y, width, height, color, fill = true) {
        const drawX = Math.floor(x - this.cameraX);
        const drawY = Math.floor(y - this.cameraY);
        
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        
        if (fill) {
            this.ctx.fillRect(drawX, drawY, width, height);
        } else {
            this.ctx.strokeRect(drawX, drawY, width, height);
        }
    }
    
    /**
     * テキストを描画（ピクセルフォント対応）
     * @param {string} text - テキスト
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {string} color - 色
     * @param {number} size - フォントサイズ
     * @param {number} alpha - アルファ値（0-1）
     */
    drawText(text, x, y, color = '#FFFFFF', size = 16, alpha = 1) {
        const drawX = Math.floor(x - this.cameraX);
        const drawY = Math.floor(y - this.cameraY);
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px monospace`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, drawX, drawY);
        this.ctx.restore();
    }
    
    /**
     * ラインを描画
     * @param {number} x1 - 始点X
     * @param {number} y1 - 始点Y
     * @param {number} x2 - 終点X
     * @param {number} y2 - 終点Y
     * @param {string} color - 色
     * @param {number} width - 線幅
     */
    drawLine(x1, y1, x2, y2, color = '#FFFFFF', width = 1) {
        const drawX1 = Math.floor(x1 - this.cameraX);
        const drawY1 = Math.floor(y1 - this.cameraY);
        const drawX2 = Math.floor(x2 - this.cameraX);
        const drawY2 = Math.floor(y2 - this.cameraY);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(drawX1, drawY1);
        this.ctx.lineTo(drawX2, drawY2);
        this.ctx.stroke();
    }
    
    /**
     * デバッグ用の境界ボックスを描画
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} width - 幅
     * @param {number} height - 高さ
     */
    drawDebugBox(x, y, width, height) {
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
    
    /**
     * タイルマップを描画
     * @param {Array<Array<number>>} tilemap - タイルマップデータ
     * @param {Function} getTileSprite - タイルIDからスプライトを取得する関数
     * @param {number} tileSize - タイルサイズ
     * @param {number} scale - 描画スケール
     */
    drawTilemap(tilemap, getTileSprite, tileSize, scale = 1) {
        const startX = Math.floor(this.cameraX / (tileSize * scale));
        const startY = Math.floor(this.cameraY / (tileSize * scale));
        const endX = Math.ceil((this.cameraX + this.width) / (tileSize * scale));
        const endY = Math.ceil((this.cameraY + this.height) / (tileSize * scale));
        
        for (let y = startY; y < Math.min(endY, tilemap.length); y++) {
            if (y < 0) continue;
            
            for (let x = startX; x < Math.min(endX, tilemap[y].length); x++) {
                if (x < 0) continue;
                
                const tileId = tilemap[y][x];
                if (tileId === 0) continue; // 空のタイル
                
                const sprite = getTileSprite(tileId);
                if (sprite) {
                    this.drawSprite(
                        sprite,
                        x * tileSize * scale,
                        y * tileSize * scale,
                        scale
                    );
                }
            }
        }
    }
    
    /**
     * ビューポート内に座標があるかチェック
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} width - オブジェクト幅
     * @param {number} height - オブジェクト高さ
     * @returns {boolean}
     */
    isInView(x, y, width = 0, height = 0) {
        return x + width >= this.cameraX &&
               x <= this.cameraX + this.width &&
               y + height >= this.cameraY &&
               y <= this.cameraY + this.height;
    }
    
    /**
     * ワールド座標をスクリーン座標に変換
     * @param {number} worldX - ワールドX座標
     * @param {number} worldY - ワールドY座標
     * @returns {Object} スクリーン座標
     */
    worldToScreen(worldX, worldY) {
        return {
            x: Math.floor(worldX - this.cameraX),
            y: Math.floor(worldY - this.cameraY)
        };
    }
    
    /**
     * スクリーン座標をワールド座標に変換
     * @param {number} screenX - スクリーンX座標
     * @param {number} screenY - スクリーンY座標
     * @returns {Object} ワールド座標
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.cameraX,
            y: screenY + this.cameraY
        };
    }
    
    /**
     * ImageData用の一時キャンバスを取得または作成
     * @private
     */
    _getOrCreateTempCanvas(imageData) {
        const key = `${imageData.width}x${imageData.height}`;
        
        if (!this.spriteCache.has(key)) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = imageData.width;
            tempCanvas.height = imageData.height;
            this.spriteCache.set(key, tempCanvas);
        }
        
        const tempCanvas = this.spriteCache.get(key);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
        
        return tempCanvas;
    }
    
    /**
     * デバッグモードの切り替え
     * @param {boolean} enabled 
     */
    setDebugMode(enabled) {
        this.debug = enabled;
    }
    
    /**
     * キャンバスサイズを変更
     * @param {number} width - 新しい幅
     * @param {number} height - 新しい高さ
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        
        // アンチエイリアスを再度無効化
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
    }
    
    /**
     * 塗りつぶし矩形を描画（カメラ無視）
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} width - 幅
     * @param {number} height - 高さ
     * @param {string} color - 色
     */
    fillRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }
    
    /**
     * 円を描画（線のみ）
     * @param {number} x - 中心X座標
     * @param {number} y - 中心Y座標
     * @param {number} radius - 半径
     * @param {string} color - 線の色
     * @param {number} lineWidth - 線の太さ
     */
    strokeCircle(x, y, radius, color = '#FFFFFF', lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
}