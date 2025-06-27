/**
 * 物理演算システム
 * 重力、衝突判定、移動処理を統合管理
 */
export class PhysicsSystem {
    constructor() {
        // 物理定数
        this.gravity = 0.65;
        this.maxFallSpeed = 15;
        this.friction = 0.8;
        
        // 衝突レイヤー定義
        this.layers = {
            TILE: 'tile',
            PLAYER: 'player',
            ENEMY: 'enemy',
            ITEM: 'item',
            PLATFORM: 'platform'
        };
        
        // 衝突マトリックス（どのレイヤー同士が衝突するか）
        this.collisionMatrix = {
            [this.layers.PLAYER]: [this.layers.TILE, this.layers.ENEMY, this.layers.ITEM, this.layers.PLATFORM],
            [this.layers.ENEMY]: [this.layers.TILE, this.layers.PLAYER, this.layers.PLATFORM],
            [this.layers.ITEM]: [this.layers.PLAYER],
            [this.layers.PLATFORM]: [this.layers.PLAYER, this.layers.ENEMY]
        };
        
        // 管理するエンティティ
        this.entities = new Set();
        
        // タイルマップ参照
        this.tileMap = null;
        this.tileSize = 16;
    }
    
    /**
     * タイルマップを設定
     * @param {Array} tileMap - タイルマップデータ
     * @param {number} tileSize - タイルサイズ
     */
    setTileMap(tileMap, tileSize = 16) {
        this.tileMap = tileMap;
        this.tileSize = tileSize;
        // console.log('PhysicsSystem: TileMap set', tileMap ? `${tileMap.length}x${tileMap[0]?.length}` : 'null', 'tileSize:', tileSize);
    }
    
    /**
     * エンティティを追加
     * @param {Entity} entity - エンティティ
     * @param {string} layer - 衝突レイヤー
     */
    addEntity(entity, layer = this.layers.TILE) {
        entity.physicsLayer = layer;
        this.entities.add(entity);
        
        // 初期接地判定
        if (entity.gravity) {
            entity.grounded = false;
        }
        
        // console.log(`PhysicsSystem: Added ${entity.constructor.name} at (${entity.x}, ${entity.y}) layer:${layer}`);
    }
    
    /**
     * エンティティを削除
     * @param {Entity} entity - エンティティ
     */
    removeEntity(entity) {
        this.entities.delete(entity);
    }
    
    /**
     * 物理演算の更新
     * @param {number} deltaTime - 経過時間
     */
    update(deltaTime) {
        // 最初に接地判定を更新（前フレームの位置で）
        for (const entity of this.entities) {
            if (entity.active) {
                this.updateGroundedState(entity);
            }
        }
        
        // 各エンティティの物理演算を更新
        for (const entity of this.entities) {
            if (!entity.active) continue;
            
            // 重力適用
            this.applyGravity(entity, deltaTime);
            
            // 速度による位置更新（衝突判定前）
            
            // X軸の移動と衝突判定
            entity.x += entity.vx * (deltaTime / 16.67);
            this.checkCollisionsForEntity(entity, 'horizontal');
            
            // Y軸の移動と衝突判定
            entity.y += entity.vy * (deltaTime / 16.67);
            this.checkCollisionsForEntity(entity, 'vertical');
            
            // 摩擦適用
            this.applyFriction(entity, deltaTime);
        }
        
        // エンティティ間の衝突判定
        this.checkEntityCollisions();
    }
    
    /**
     * 重力を適用
     * @param {Entity} entity - エンティティ
     * @param {number} deltaTime - 経過時間
     */
    applyGravity(entity, deltaTime) {
        if (!entity.gravity || entity.grounded) return;
        
        entity.vy += this.gravity * (deltaTime / 16.67);
        
        // 最大落下速度制限
        if (entity.vy > this.maxFallSpeed) {
            entity.vy = this.maxFallSpeed;
        }
    }
    
    /**
     * 摩擦を適用
     * @param {Entity} entity - エンティティ
     */
    applyFriction(entity, deltaTime) {
        if (!entity.grounded) return;
        
        const frictionFactor = Math.pow(entity.friction || this.friction, deltaTime / 16.67);
        entity.vx *= frictionFactor;
        
        // 小さな速度は0にする
        if (Math.abs(entity.vx) < 0.1) {
            entity.vx = 0;
        }
    }
    
    /**
     * エンティティの衝突判定
     * @param {Entity} entity - エンティティ
     * @param {string} axis - 軸（horizontal/vertical）
     */
    checkCollisionsForEntity(entity, axis) {
        if (!entity.collidable) return;
        
        // タイルとの衝突判定
        if (this.tileMap && entity.physicsLayer !== this.layers.TILE) {
            this.checkTileCollisions(entity, axis);
        }
    }
    
    /**
     * タイルとの衝突判定
     * @param {Entity} entity - エンティティ
     * @param {string} axis - 軸
     */
    checkTileCollisions(entity, axis) {
        const bounds = entity.getBounds();
        
        // チェックするタイル範囲を計算
        const startCol = Math.floor(bounds.left / this.tileSize);
        const endCol = Math.floor(bounds.right / this.tileSize);
        const startRow = Math.floor(bounds.top / this.tileSize);
        const endRow = Math.floor(bounds.bottom / this.tileSize);
        
        // デバッグ：最初のフレームのみログ出力
        // if (!this._firstCheckDone) {
        //     console.log(`PhysicsSystem: Checking tiles for ${entity.constructor.name} ${axis}`);
        //     console.log(`  Bounds: (${bounds.left}, ${bounds.top}) to (${bounds.right}, ${bounds.bottom})`);
        //     console.log(`  Tile range: cols ${startCol}-${endCol}, rows ${startRow}-${endRow}`);
        //     this._firstCheckDone = true;
        // }
        
        // 範囲を制限
        const clampedStartCol = Math.max(0, startCol);
        const clampedEndCol = Math.min(this.tileMap[0].length - 1, endCol);
        const clampedStartRow = Math.max(0, startRow);
        const clampedEndRow = Math.min(this.tileMap.length - 1, endRow);
        
        // 各タイルをチェック
        for (let row = clampedStartRow; row <= clampedEndRow; row++) {
            for (let col = clampedStartCol; col <= clampedEndCol; col++) {
                if (this.tileMap[row][col] === 1) {
                    // 固体タイルとの衝突
                    const tileBounds = {
                        left: col * this.tileSize,
                        top: row * this.tileSize,
                        right: (col + 1) * this.tileSize,
                        bottom: (row + 1) * this.tileSize,
                        width: this.tileSize,
                        height: this.tileSize
                    };
                    
                    if (this.checkAABB(bounds, tileBounds)) {
                        this.resolveTileCollision(entity, tileBounds, axis);
                    }
                }
            }
        }
    }
    
    /**
     * タイルとの衝突解決
     * @param {Entity} entity - エンティティ
     * @param {Object} tileBounds - タイルの境界
     * @param {string} axis - 軸
     */
    resolveTileCollision(entity, tileBounds, axis) {
        if (axis === 'horizontal') {
            // 水平方向の衝突解決
            if (entity.vx > 0) {
                // 右に移動中
                entity.x = tileBounds.left - entity.width;
                entity.vx = 0;
            } else if (entity.vx < 0) {
                // 左に移動中
                entity.x = tileBounds.right;
                entity.vx = 0;
            }
        } else if (axis === 'vertical') {
            // 垂直方向の衝突解決
            if (entity.vy > 0) {
                // 下に移動中（着地）
                entity.y = tileBounds.top - entity.height;
                entity.vy = 0;
                entity.grounded = true;
            } else if (entity.vy < 0) {
                // 上に移動中（頭をぶつける）
                entity.y = tileBounds.bottom;
                entity.vy = 0;
            }
        }
    }
    
    /**
     * エンティティ間の衝突判定
     */
    checkEntityCollisions() {
        const entitiesArray = Array.from(this.entities);
        
        for (let i = 0; i < entitiesArray.length; i++) {
            const entityA = entitiesArray[i];
            if (!entityA.active || !entityA.collidable) continue;
            
            // このエンティティが衝突するレイヤーを取得
            const collisionLayers = this.collisionMatrix[entityA.physicsLayer] || [];
            
            for (let j = i + 1; j < entitiesArray.length; j++) {
                const entityB = entitiesArray[j];
                if (!entityB.active || !entityB.collidable) continue;
                
                // 衝突するレイヤーかチェック
                if (collisionLayers.includes(entityB.physicsLayer) ||
                    (this.collisionMatrix[entityB.physicsLayer] || []).includes(entityA.physicsLayer)) {
                    
                    if (this.checkAABB(entityA.getBounds(), entityB.getBounds())) {
                        // 衝突を通知
                        this.notifyCollision(entityA, entityB);
                    }
                }
            }
        }
    }
    
    /**
     * AABB衝突判定
     * @param {Object} a - 境界ボックスA
     * @param {Object} b - 境界ボックスB
     * @returns {boolean} 衝突している場合true
     */
    checkAABB(a, b) {
        return a.left < b.right &&
               a.right > b.left &&
               a.top < b.bottom &&
               a.bottom > b.top;
    }
    
    /**
     * 衝突を通知
     * @param {Entity} entityA - エンティティA
     * @param {Entity} entityB - エンティティB
     */
    notifyCollision(entityA, entityB) {
        // 衝突情報を作成
        const collisionInfoA = {
            other: entityB,
            side: this.getCollisionSide(entityA, entityB)
        };
        
        const collisionInfoB = {
            other: entityA,
            side: this.getCollisionSide(entityB, entityA)
        };
        
        // 各エンティティに衝突を通知
        if (entityA.onCollision) {
            entityA.onCollision(collisionInfoA);
        }
        
        if (entityB.onCollision) {
            entityB.onCollision(collisionInfoB);
        }
    }
    
    /**
     * 衝突の方向を取得
     * @param {Entity} entity - 判定元エンティティ
     * @param {Entity} other - 相手エンティティ
     * @returns {string} 衝突方向（top/bottom/left/right）
     */
    getCollisionSide(entity, other) {
        const dx = (entity.x + entity.width / 2) - (other.x + other.width / 2);
        const dy = (entity.y + entity.height / 2) - (other.y + other.height / 2);
        const width = (entity.width + other.width) / 2;
        const height = (entity.height + other.height) / 2;
        const crossWidth = width * dy;
        const crossHeight = height * dx;
        
        if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
            if (crossWidth > crossHeight) {
                return (crossWidth > -crossHeight) ? 'bottom' : 'left';
            } else {
                return (crossWidth > -crossHeight) ? 'right' : 'top';
            }
        }
        
        return 'none';
    }
    
    /**
     * 接地判定を更新
     * @param {Entity} entity - エンティティ
     */
    updateGroundedState(entity) {
        // 毎フレーム接地状態をリセットして再チェック
        entity.grounded = false;
        
        // 足元のタイルをチェック
        const testBounds = {
            left: entity.x,
            top: entity.y + entity.height + 1, // 1ピクセル下をチェック
            right: entity.x + entity.width,
            bottom: entity.y + entity.height + 2,
            width: entity.width,
            height: 1
        };
        
        // タイルマップチェック
        if (this.tileMap) {
            const row = Math.floor(testBounds.top / this.tileSize);
            const startCol = Math.floor(testBounds.left / this.tileSize);
            const endCol = Math.floor(testBounds.right / this.tileSize);
            
            if (row >= 0 && row < this.tileMap.length) {
                for (let col = startCol; col <= endCol; col++) {
                    if (col >= 0 && col < this.tileMap[row].length && this.tileMap[row][col] === 1) {
                        entity.grounded = true;
                        break;
                    }
                }
            }
        }
    }
    
    /**
     * 点がタイル内にあるかチェック
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @returns {boolean} タイル内にある場合true
     */
    isPointInTile(x, y) {
        if (!this.tileMap) return false;
        
        const col = Math.floor(x / this.tileSize);
        const row = Math.floor(y / this.tileSize);
        
        if (row >= 0 && row < this.tileMap.length &&
            col >= 0 && col < this.tileMap[row].length) {
            return this.tileMap[row][col] === 1;
        }
        
        return false;
    }
    
    /**
     * レイキャスト（直線上の衝突判定）
     * @param {number} x1 - 開始X座標
     * @param {number} y1 - 開始Y座標
     * @param {number} x2 - 終了X座標
     * @param {number} y2 - 終了Y座標
     * @returns {Object|null} 衝突点の情報
     */
    raycast(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (x !== x2 || y !== y2) {
            if (this.isPointInTile(x, y)) {
                return { x, y, tile: true };
            }
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return null;
    }
    
    /**
     * デバッグ情報を描画
     * @param {PixelRenderer} renderer - レンダラー
     */
    renderDebug(renderer) {
        // 衝突判定ボックスの描画
        for (const entity of this.entities) {
            if (!entity.active) continue;
            
            const bounds = entity.getBounds();
            const color = entity.grounded ? '#00FF00' : '#FF0000';
            
            renderer.drawRect(
                bounds.left,
                bounds.top,
                bounds.width,
                bounds.height,
                color,
                false
            );
        }
    }
}