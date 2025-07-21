/**
 * ArmorKnight踏みつけテスト（シンプル版）
 * 
 * ArmorKnightを踏みつけてもプレイヤーがダメージを受けないことを確認
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runArmorKnightStompTest() {
    const test = new GameTestHelpers({
        headless: true,  // ヘッドレスモードでテスト実行
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Stomp Test (Simple)');
        
        // Use quickStart for simplified initialization
        await t.quickStart('test-armor-knight-stomp');
        
        console.log('\n=== ArmorKnight Stomp Test (Simple) ===');
        
        // 少し待ってから初期状態を確認（物理計算が落ち着くまで）
        await t.wait(100);
        
        // 初期状態を確認
        const initialState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            
            return {
                player: player ? { 
                    x: player.x, 
                    y: player.y, 
                    health: player.health,
                    maxHealth: player.maxHealth
                } : null,
                armorKnight: armorKnight ? { 
                    x: armorKnight.x, 
                    y: armorKnight.y, 
                    health: armorKnight.health
                } : null
            };
        });
        
        console.log('Initial state:', JSON.stringify(initialState, null, 2));
        t.assert(initialState.armorKnight, 'ArmorKnight should exist');
        t.assert(initialState.player.health === initialState.player.maxHealth, 'Player should be at full health');
        
        // ArmorKnightがgroundedかどうか確認
        const armorKnightGrounded = await t.page.evaluate(() => {
            const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            return {
                grounded: armorKnight.grounded,
                vy: armorKnight.vy,
                gravity: armorKnight.gravity
            };
        });
        console.log('ArmorKnight physics state:', armorKnightGrounded);
        
        // 衝突イベントをリッスン
        await t.page.evaluate(() => {
            window.collisionLog = [];
            const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            const originalMethod = armorKnight.onCollisionWithPlayer;
            armorKnight.onCollisionWithPlayer = function(player) {
                const enemyCenter = this.y + this.height / 2;
                const playerCenter = player.y + player.height / 2;
                const isAboveEnemy = playerCenter < enemyCenter;
                const isFalling = player.vy > 0;
                
                window.collisionLog.push({
                    timestamp: Date.now(),
                    phase: 'before',
                    playerY: player.y,
                    playerVy: player.vy,
                    knightY: this.y,
                    playerHealth: player.health,
                    playerCenter: playerCenter,
                    knightCenter: enemyCenter,
                    isAboveEnemy: isAboveEnemy,
                    isFalling: isFalling,
                    invulnerable: player.invulnerable
                });
                originalMethod.call(this, player);
                window.collisionLog.push({
                    timestamp: Date.now(),
                    phase: 'after',
                    playerHealth: player.health,
                    playerVy: player.vy,
                    invulnerable: player.invulnerable
                });
            };
            
            // 物理システムの衝突監視は一旦スキップ（serviceLocatorが利用できないため）
        });
        
        // エンティティのプロパティを確認
        await t.page.evaluate(() => {
            const entityCheck = window.game.stateManager.currentState.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            console.log('ArmorKnight properties:', {
                active: entityCheck.active,
                collidable: entityCheck.collidable,
                physicsLayer: entityCheck.physicsLayer,
                hasOnCollision: !!entityCheck.onCollision,
                width: entityCheck.width,
                height: entityCheck.height
            });
            console.log('Player properties:', {
                active: window.game.stateManager.currentState.player.active,
                collidable: window.game.stateManager.currentState.player.collidable,
                physicsLayer: window.game.stateManager.currentState.player.physicsLayer,
                hasOnCollision: !!window.game.stateManager.currentState.player.onCollision,
                hasTakeDamage: !!window.game.stateManager.currentState.player.takeDamage,
                hasJumpPower: 'jumpPower' in window.game.stateManager.currentState.player,
                width: window.game.stateManager.currentState.player.width,
                height: window.game.stateManager.currentState.player.height
            });
            
            // 物理システムに登録されているか確認
            const physicsSystem = window.game.stateManager.currentState.entityManager.physicsSystem;
            const entitiesInPhysics = Array.from(physicsSystem.getEntities());
            console.log('Entities in physics system:', entitiesInPhysics.length);
            console.log('ArmorKnight in physics?', entitiesInPhysics.some(e => e.constructor.name === 'ArmorKnight'));
            console.log('Player in physics?', entitiesInPhysics.some(e => e.constructor.name === 'Player'));
        });
        
        // プレイヤーは穴の上の地面にスポーンしている
        console.log('Player is on ground above pit, preparing to drop...');
        
        // 初期位置を確認
        const initialPosition = await t.page.evaluate(() => {
            const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            const player = window.game.stateManager.currentState.player;
            return {
                knight: { x: armorKnight.x, y: armorKnight.y },
                player: { x: player.x, y: player.y }
            };
        });
        console.log('Initial positions:', JSON.stringify(initialPosition, null, 2));
        
        // 穴に落ちてArmorKnightを踏みつける
        console.log('Walking into pit to stomp ArmorKnight...');
        
        // 現在の位置を確認
        await t.page.evaluate(() => {
            const player = window.game.stateManager.currentState.player;
            console.log(`Before move - Player position: x=${player.x}, y=${player.y}`);
        });
        
        // プレイヤーを穴に向かって移動させる
        console.log('Moving player to the right towards the pit...');
        
        // 右に移動（movePlayerメソッドを使用）
        // プレイヤーを穴の位置まで移動（初期位置128から穴の中心168まで約40ピクセル）
        await t.movePlayer('right', 300);  // 300ms右に歩く
        await t.wait(200);  // 落下を待つ
        
        console.log('Tracking player fall...');
        
        // 落下を追跡（反発を確認するため、より詳細に追跡）
        const positionHistory = [];
        let bounceDetected = false;
        let previousY = null;
        
        for (let i = 0; i < 30; i++) {
            await t.wait(50);
            const pos = await t.page.evaluate(() => {
                const player = window.game.stateManager.currentState.player;
                const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
                return {
                    player: { x: player.x, y: player.y, vy: player.vy, health: player.health },
                    armorKnight: { x: armorKnight.x, y: armorKnight.y }
                };
            });
            
            positionHistory.push(pos);
            console.log(`Frame ${i}: Player (x:${pos.player.x}, y:${pos.player.y.toFixed(2)}, vy:${pos.player.vy.toFixed(2)}, health:${pos.player.health})`);
            
            // Y座標が上昇に転じたかチェック（反発の検出）
            if (previousY !== null && pos.player.y < previousY && pos.player.vy < 0) {
                console.log(`*** BOUNCE DETECTED at frame ${i}! Y went from ${previousY.toFixed(2)} to ${pos.player.y.toFixed(2)}, vy=${pos.player.vy.toFixed(2)}`);
                bounceDetected = true;
            }
            previousY = pos.player.y;
            
            // 衝突範囲内かチェック
            if (Math.abs(pos.player.x - pos.armorKnight.x) < 16 && 
                Math.abs(pos.player.y - pos.armorKnight.y) < 16) {
                console.log('Player and ArmorKnight are in collision range!');
            }
        }
        
        // 落下後の位置を確認
        await t.page.evaluate(() => {
            const player = window.game.stateManager.currentState.player;
            const armorKnight = window.game.stateManager.currentState.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            console.log(`After falling - Player position: x=${player.x}, y=${player.y}, vy=${player.vy}`);
            console.log(`ArmorKnight position: x=${armorKnight.x}, y=${armorKnight.y}`);
        });
        
        // 踏みつけ後の状態と衝突ログを確認
        const afterStomp = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies.find(e => e.constructor.name === 'ArmorKnight');
            
            return {
                player: player ? { 
                    x: player.x, 
                    y: player.y, 
                    vy: player.vy,
                    health: player.health,
                    maxHealth: player.maxHealth,
                    hasPowerGlove: player.hasPowerGlove
                } : null,
                armorKnight: armorKnight ? { 
                    x: armorKnight.x, 
                    y: armorKnight.y, 
                    health: armorKnight.health,
                    state: armorKnight.state
                } : null,
                collisionLog: window.collisionLog || []
            };
        });
        
        console.log('After stomp:', JSON.stringify(afterStomp, null, 2));
        console.log('Collision log:', JSON.stringify(afterStomp.collisionLog, null, 2));
        
        // 衝突が発生しているか確認
        if (afterStomp.collisionLog.length === 0) {
            console.log('WARNING: No collision detected!');
            console.log('Player position:', afterStomp.player);
            console.log('ArmorKnight position:', afterStomp.armorKnight);
        }
        
        // まず衝突が発生していることを確認
        t.assert(afterStomp.collisionLog.length > 0, 
            'Collision should have occurred between player and ArmorKnight');
        
        // 検証: プレイヤーがダメージを受けていない
        t.assert(afterStomp.player.health === initialState.player.maxHealth, 
            'Player should not take damage from stomping ArmorKnight');
        
        // 検証: ArmorKnightはダメージを受けていない（踏みつけでは倒せない）
        t.assert(afterStomp.armorKnight.health === initialState.armorKnight.health, 
            'ArmorKnight should not take damage from stomping');
        t.assert(afterStomp.armorKnight.state !== 'dead', 'ArmorKnight should not be dead');
        
        // 検証: プレイヤーが実際に跳ね返っている（Y座標の変化で確認）
        t.assert(bounceDetected, 
            'Player should visibly bounce off ArmorKnight (Y position should move upward)');
        
        // 検証: 最終的にプレイヤーがダメージを受けていない
        const finalHealth = afterStomp.player.health;
        t.assert(finalHealth === initialState.player.maxHealth, 
            `Player should have full health after bouncing. Initial: ${initialState.player.maxHealth}, Final: ${finalHealth}`);
        
        console.log('\n=== Test Summary ===');
        console.log(`Bounce detected: ${bounceDetected}`);
        console.log(`Final player health: ${finalHealth}/${initialState.player.maxHealth}`);
        console.log(`Collision count: ${afterStomp.collisionLog.length}`);
        
        if (bounceDetected && finalHealth === initialState.player.maxHealth) {
            console.log('\n✅ ArmorKnight stomp test PASSED!');
        } else {
            console.log('\n❌ ArmorKnight stomp test FAILED!');
            t.assert(false, 'ArmorKnight stomp behavior is not working correctly');
        }
        
        // エラーチェック
        await t.checkForErrors();
    });
}

// テストを実行
if (require.main === module) {
    runArmorKnightStompTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runArmorKnightStompTest;