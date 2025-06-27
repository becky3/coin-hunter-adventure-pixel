// 敵の物理シミュレーションテスト
// 実際のゲームと同じ条件で敵の動きをシミュレート

class MockEntity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 16;
        this.height = 16;
        this.gravity = true;
        this.grounded = false;
        this.active = true;
        this.physicsEnabled = true;
        this.moveSpeed = 20;
        this.direction = 1;
        this.jumpHeight = 30;
    }
}

// PhysicsSystemの主要部分を再現
class MockPhysicsSystem {
    constructor() {
        this.gravity = 0.65;
        this.entities = new Set();
        this.tileMap = this.createTestTileMap();
        this.tileSize = 16;
    }
    
    createTestTileMap() {
        // PlayStateのテストレベルと同じ
        return [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
    }
    
    update(deltaTime) {
        console.log(`\n--- Physics Update (deltaTime: ${deltaTime}) ---`);
        
        for (const entity of this.entities) {
            if (!entity.active) continue;
            
            console.log(`Before: pos(${entity.x.toFixed(1)}, ${entity.y.toFixed(1)}) vel(${entity.vx.toFixed(1)}, ${entity.vy.toFixed(1)}) grounded=${entity.grounded}`);
            
            // 重力適用
            this.applyGravity(entity, deltaTime);
            
            // X軸の移動
            const oldX = entity.x;
            entity.x += entity.vx * (deltaTime / 16.67);
            console.log(`  X movement: ${oldX.toFixed(1)} -> ${entity.x.toFixed(1)} (delta: ${(entity.x - oldX).toFixed(1)})`);
            this.checkTileCollisions(entity, 'horizontal');
            
            // Y軸の移動
            const oldY = entity.y;
            entity.y += entity.vy * (deltaTime / 16.67);
            console.log(`  Y movement: ${oldY.toFixed(1)} -> ${entity.y.toFixed(1)} (delta: ${(entity.y - oldY).toFixed(1)})`);
            this.checkTileCollisions(entity, 'vertical');
            
            // 摩擦適用
            this.applyFriction(entity, deltaTime);
            
            console.log(`After: pos(${entity.x.toFixed(1)}, ${entity.y.toFixed(1)}) vel(${entity.vx.toFixed(1)}, ${entity.vy.toFixed(1)}) grounded=${entity.grounded}`);
        }
    }
    
    applyGravity(entity, deltaTime) {
        if (!entity.gravity || entity.grounded) return;
        
        const oldVy = entity.vy;
        entity.vy += this.gravity * (deltaTime / 16.67);
        console.log(`  Gravity: vy ${oldVy.toFixed(1)} -> ${entity.vy.toFixed(1)}`);
        
        if (entity.vy > 15) {
            entity.vy = 15;
            console.log(`  Max fall speed capped at 15`);
        }
    }
    
    applyFriction(entity, deltaTime) {
        if (!entity.grounded) return;
        
        const friction = 0.85;
        const oldVx = entity.vx;
        entity.vx *= Math.pow(friction, deltaTime / 16.67);
        console.log(`  Friction: vx ${oldVx.toFixed(1)} -> ${entity.vx.toFixed(1)}`);
    }
    
    checkTileCollisions(entity, axis) {
        const bounds = {
            left: entity.x,
            top: entity.y,
            right: entity.x + entity.width,
            bottom: entity.y + entity.height
        };
        
        const startCol = Math.floor(bounds.left / this.tileSize);
        const endCol = Math.floor(bounds.right / this.tileSize);
        const startRow = Math.floor(bounds.top / this.tileSize);
        const endRow = Math.floor(bounds.bottom / this.tileSize);
        
        for (let row = Math.max(0, startRow); row <= Math.min(this.tileMap.length - 1, endRow); row++) {
            for (let col = Math.max(0, startCol); col <= Math.min(this.tileMap[0].length - 1, endCol); col++) {
                if (this.tileMap[row][col] === 1) {
                    const tileBounds = {
                        left: col * this.tileSize,
                        top: row * this.tileSize,
                        right: (col + 1) * this.tileSize,
                        bottom: (row + 1) * this.tileSize
                    };
                    
                    if (this.checkAABB(bounds, tileBounds)) {
                        console.log(`  Collision with tile at (${col}, ${row})`);
                        this.resolveTileCollision(entity, tileBounds, axis);
                    }
                }
            }
        }
    }
    
    checkAABB(a, b) {
        return a.left < b.right &&
               a.right > b.left &&
               a.top < b.bottom &&
               a.bottom > b.top;
    }
    
    resolveTileCollision(entity, tileBounds, axis) {
        if (axis === 'horizontal') {
            if (entity.vx > 0) {
                entity.x = tileBounds.left - entity.width;
                entity.vx = 0;
                console.log(`    Resolved: pushed left to ${entity.x}`);
            } else if (entity.vx < 0) {
                entity.x = tileBounds.right;
                entity.vx = 0;
                console.log(`    Resolved: pushed right to ${entity.x}`);
            }
        } else if (axis === 'vertical') {
            if (entity.vy > 0) {
                entity.y = tileBounds.top - entity.height;
                entity.vy = 0;
                entity.grounded = true;
                console.log(`    Resolved: landed at ${entity.y}, grounded=true`);
            } else if (entity.vy < 0) {
                entity.y = tileBounds.bottom;
                entity.vy = 0;
                console.log(`    Resolved: hit ceiling at ${entity.y}`);
            }
        }
    }
}

// スライムのAI更新を再現
function updateSlimeAI(enemy, deltaTime) {
    if (enemy.grounded) {
        enemy.vx = enemy.moveSpeed * enemy.direction;
    }
}

// シミュレーション実行
console.log('=== Enemy Physics Simulation ===');
console.log('Simulating enemy at position (150, 180) like in the game\n');

const physicsSystem = new MockPhysicsSystem();
const enemy = new MockEntity(150, 180);
physicsSystem.entities.add(enemy);

// 60フレーム（1秒）シミュレート
for (let frame = 0; frame < 60; frame++) {
    console.log(`\n========== FRAME ${frame + 1} ==========`);
    
    // Entity.jsのupdate
    if (!enemy.physicsEnabled) {
        // Entity.js:94-102 の位置更新（physicsEnabledがfalseの場合）
        console.log('Entity.js update would run here (but physicsEnabled=true, so skipped)');
    }
    
    // Enemy.jsのupdate -> Slime.jsのupdateAI
    updateSlimeAI(enemy, 16.67);
    
    // PhysicsSystem.update
    physicsSystem.update(16.67);
    
    // 異常チェック
    if (Math.abs(enemy.x) > 500 || Math.abs(enemy.y) > 500) {
        console.log('\n⚠️ ENEMY FLEW OFF THE SCREEN!');
        console.log(`Final position: (${enemy.x}, ${enemy.y})`);
        console.log(`Final velocity: (${enemy.vx}, ${enemy.vy})`);
        break;
    }
    
    if (frame === 59) {
        console.log('\n✅ Simulation complete - enemy stayed on screen');
        console.log(`Final position: (${enemy.x}, ${enemy.y})`);
        console.log(`Final velocity: (${enemy.vx}, ${enemy.vy})`);
    }
}