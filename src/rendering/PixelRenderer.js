/**
 * ピクセルレンダラー
 * Canvas描画を抽象化し、ピクセルアート表示に特化したレンダリングを提供
 */
import { GAME_RESOLUTION, DISPLAY, FONT } from '../constants/gameConstants.js';

export class PixelRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // ピクセルアートのためアンチエイリアスを無効化
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;
        
        // ゲーム画面サイズ（論理的なサイズ）
        this.width = GAME_RESOLUTION.WIDTH;
        this.height = GAME_RESOLUTION.HEIGHT;
        
        // 実際のキャンバスサイズ
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        
        // スケール計算
        this.scale = DISPLAY.SCALE;
        
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
        // 物理的なキャンバス全体をクリア
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 変換をリセット
        
        if (color) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        } else {
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        
        this.ctx.restore();
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
     * @param {ImageData|HTMLCanvasElement|string} sprite - スプライトデータまたはスプライト名
     * @param {number} x - ワールドX座標
     * @param {number} y - ワールドY座標
     * @param {number} scale - 描画スケール
     * @param {boolean} flipX - 水平反転
     */
    drawSprite(sprite, x, y, flipX = false) {
        // 文字列の場合はPixelArtRendererまたはassetLoaderから取得
        if (typeof sprite === 'string') {
            // まずPixelArtRendererを試す
            if (this.pixelArtRenderer && this.pixelArtRenderer.sprites.has(sprite)) {
                const pixelSprite = this.pixelArtRenderer.sprites.get(sprite);
                const canvas = flipX ? pixelSprite.flippedCanvas : pixelSprite.canvas;
                sprite = canvas;
            }
            // 次にassetLoaderを試す
            else if (this.assetLoader) {
                const loadedSprite = this.assetLoader.loadedAssets.get(sprite);
                if (!loadedSprite) {
                    // スプライトが読み込まれていない場合はロード
                    this.assetLoader.loadSprite(...sprite.split('/'));
                    return;
                }
                sprite = loadedSprite.imageData || loadedSprite.canvas;
                if (!sprite) return;
            } else {
                return;
            }
        }
        // 整数座標に丸めて、スケールを適用
        const drawX = Math.floor((x - this.cameraX) * this.scale);
        const drawY = Math.floor((y - this.cameraY) * this.scale);
        
        // 画面外は描画しない（実際のキャンバスサイズで判定）
        if (drawX + sprite.width * this.scale < 0 || drawX > this.canvasWidth ||
            drawY + sprite.height * this.scale < 0 || drawY > this.canvasHeight) {
            return;
        }
        
        this.ctx.save();
        
        if (flipX) {
            // 水平反転（スケールを考慮）
            this.ctx.translate(drawX + sprite.width * this.scale, drawY);
            this.ctx.scale(-1, 1);
            this.ctx.translate(-drawX, -drawY);
        }
        
        if (sprite instanceof ImageData) {
            // ImageDataの場合は一旦キャンバスに描画
            const tempCanvas = this._getOrCreateTempCanvas(sprite);
            this.ctx.drawImage(
                tempCanvas,
                0, 0, sprite.width, sprite.height,
                drawX, drawY, sprite.width * this.scale, sprite.height * this.scale
            );
        } else {
            // Canvas要素の場合はそのまま描画
            this.ctx.drawImage(
                sprite,
                0, 0, sprite.width, sprite.height,
                drawX, drawY, sprite.width * this.scale, sprite.height * this.scale
            );
        }
        
        this.ctx.restore();
        
        // デバッグ時は当たり判定ボックスを表示
        if (this.debug) {
            this.drawDebugBox(drawX, drawY, sprite.width * this.scale, sprite.height * this.scale);
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
        const drawX = Math.floor((x - this.cameraX) * this.scale);
        const drawY = Math.floor((y - this.cameraY) * this.scale);
        
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = color;
        
        if (fill) {
            this.ctx.fillRect(drawX, drawY, width * this.scale, height * this.scale);
        } else {
            this.ctx.strokeRect(drawX, drawY, width * this.scale, height * this.scale);
        }
    }
    
    /**
     * テキストを描画（固定サイズピクセルフォント）
     * 8x8ピクセルの固定サイズフォントで描画されます
     * @param {string} text - テキスト
     * @param {number} x - X座標（グリッドに自動的にスナップされる）
     * @param {number} y - Y座標（グリッドに自動的にスナップされる）
     * @param {string} color - 色
     * @param {number} alpha - アルファ値（0-1）
     */
    drawText(text, x, y, color = '#FFFFFF', alpha = 1) {
        // グリッドにスナップ
        const snappedX = Math.floor(x / FONT.GRID) * FONT.GRID;
        const snappedY = Math.floor(y / FONT.GRID) * FONT.GRID;
        
        const drawX = Math.floor((snappedX - this.cameraX) * this.scale);
        const drawY = Math.floor((snappedY - this.cameraY) * this.scale);
        
        // フォントサイズは固定（8x8ピクセルフォント）
        const scaledSize = FONT.SIZE * this.scale;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = color;
        this.ctx.font = `${scaledSize}px ${FONT.FAMILY}`;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(text, drawX, drawY);
        this.ctx.restore();
    }
    
    /**
     * 中央揃えでテキストを描画（固定サイズピクセルフォント・グリッドベース）
     * 8x8ピクセルの固定サイズフォントで描画されます
     * @param {string} text - テキスト
     * @param {number} centerX - 中心X座標
     * @param {number} y - Y座標
     * @param {string} color - 色
     * @param {number} alpha - アルファ値（0-1）
     */
    drawTextCentered(text, centerX, y, color = '#FFFFFF', alpha = 1) {
        // テキストの文字数から幅を計算（各文字は8ピクセル）
        const textWidth = text.length * FONT.GRID;
        const x = centerX - Math.floor(textWidth / 2);
        this.drawText(text, x, y, color, alpha);
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
        const drawX1 = Math.floor((x1 - this.cameraX) * this.scale);
        const drawY1 = Math.floor((y1 - this.cameraY) * this.scale);
        const drawX2 = Math.floor((x2 - this.cameraX) * this.scale);
        const drawY2 = Math.floor((y2 - this.cameraY) * this.scale);
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width * this.scale;
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
                        y * tileSize * scale
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
            x: Math.floor((worldX - this.cameraX) * this.scale),
            y: Math.floor((worldY - this.cameraY) * this.scale)
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
            x: (screenX / this.scale) + this.cameraX,
            y: (screenY / this.scale) + this.cameraY
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
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.canvas.width = width;
        this.canvas.height = height;
        
        // ゲーム画面サイズは固定
        this.width = GAME_RESOLUTION.WIDTH;
        this.height = GAME_RESOLUTION.HEIGHT;
        
        // スケール再計算
        this.scale = Math.min(width / GAME_RESOLUTION.WIDTH, height / GAME_RESOLUTION.HEIGHT);
        
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