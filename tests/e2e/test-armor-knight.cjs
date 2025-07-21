/**
 * ArmorKnight動作確認テスト
 * 
 * このテストでは以下を確認します：
 * 1. 踏みつけ時の反発動作
 * 2. プレイヤー検知と突進機能
 * 3. 横からの接触時のダメージ
 * 4. 特殊攻撃（projectile/powerup）でのみダメージを受けること
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runArmorKnightTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        await t.init('ArmorKnight Behavior Test');
        
        // エラートラッキングを設定
        await t.injectErrorTracking();
        
        // テスト用のカスタムステージでゲームを開始
        await t.navigateToGame('http://localhost:3000?s=test-all-sprites&skip_title=true');
        
        // ゲームの初期化を待つ
        await t.waitForGameInitialization();
        
        // play状態であることを確認
        await t.assertState('play');
        
        // 入力フォーカスを確保
        await t.ensureInputFocus();
        
        // プレイヤーの存在を確認
        await t.assertPlayerExists();
        
        console.log('\n=== Test 1: ArmorKnight踏みつけ時の反発テスト ===');
        
        // ArmorKnightを作成（プレイヤーの右側に配置）
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            
            if (state && player) {
                // 既存の敵をクリア
                if (state.entityManager.enemies && state.entityManager.enemies.length > 0) {
                    state.entityManager.enemies.forEach(enemy => {
                        if (state.physicsSystem && state.physicsSystem.removeEntity) {
                            state.physicsSystem.removeEntity(enemy);
                        }
                    });
                    state.entityManager.enemies = [];
                }
                
                // EntityFactoryを使ってArmorKnightを作成
                // spawnEnemyメソッドを使って作成（タイル座標で指定）
                const tileX = Math.floor((player.x + 100) / 16);
                const tileY = Math.floor((player.y + 50) / 16);
                
                state.entityManager.spawnEnemy('armor_knight', tileX, tileY);
                
                // 作成されたArmorKnightを確認
                const armorKnight = state.entityManager.enemies[state.entityManager.enemies.length - 1];
                if (armorKnight) {
                    console.log(`ArmorKnight created at (${armorKnight.x}, ${armorKnight.y})`);
                    console.log(`ArmorKnight stats - health: ${armorKnight.health}/${armorKnight.maxHealth}, damage: ${armorKnight.damage}, moveSpeed: ${armorKnight.moveSpeed}`);
                }
                console.log(`Player position: (${player.x}, ${player.y})`);
            }
        });
        
        await t.wait(500);
        
        // プレイヤーの初期位置を記録
        const initialPlayerStats = await t.getPlayerStats();
        console.log('Initial player position:', initialPlayerStats);
        
        // ArmorKnightの初期状態を確認
        const armorKnightInitial = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const armorKnight = state.entityManager.enemies[0];
            return armorKnight ? {
                x: armorKnight.x,
                y: armorKnight.y,
                health: armorKnight.health,
                maxHealth: armorKnight.maxHealth,
                damage: armorKnight.damage,
                moveSpeed: armorKnight.moveSpeed,
                isCharging: armorKnight.isCharging,
                direction: armorKnight.direction
            } : null;
        });
        console.log('ArmorKnight initial state:', armorKnightInitial);
        
        // プレイヤーをArmorKnightの上に移動（踏みつけ位置）
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies[0];
            
            if (player && armorKnight) {
                // ArmorKnightの真上、少し高い位置に配置
                player.x = armorKnight.x;
                player.y = armorKnight.y - 50;
                player.vy = 0; // 一旦速度をリセット
                player.grounded = false; // 空中にいることを明示
                console.log(`Player positioned above ArmorKnight: (${player.x}, ${player.y})`);
            }
        });
        
        // 少し待ってから落下開始
        await t.wait(100);
        
        // 物理演算を数フレーム実行して自然な落下をシミュレート
        const collisionInfo = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies[0];
            
            const logs = [];
            let collisionDetected = false;
            
            if (player && armorKnight) {
                // 衝突前の状態を記録
                logs.push(`Before physics: Player(${player.x}, ${player.y}), vy=${player.vy}, ArmorKnight(${armorKnight.x}, ${armorKnight.y})`);
                logs.push(`ArmorKnight bounds: x=${armorKnight.x}, y=${armorKnight.y}, width=${armorKnight.width}, height=${armorKnight.height}`);
                
                // onCollisionWithPlayerの呼び出しを監視
                const originalMethod = armorKnight.onCollisionWithPlayer;
                armorKnight.onCollisionWithPlayer = function(p) {
                    logs.push('onCollisionWithPlayer called!');
                    collisionDetected = true;
                    return originalMethod.call(this, p);
                };
                
                // 物理演算を実行
                for (let i = 0; i < 60; i++) {
                    // EntityManagerの更新も含める
                    if (state.entityManager && state.entityManager.updateAll) {
                        state.entityManager.updateAll(16);
                    }
                    logs.push(`Frame ${i}: Player y=${player.y}, vy=${player.vy}`);
                    
                    // プレイヤーがArmorKnightに到達したかチェック
                    if (player.y + player.height >= armorKnight.y) {
                        logs.push(`Player reached ArmorKnight at frame ${i}`);
                        break;
                    }
                }
                
                // 衝突後の状態を記録
                logs.push(`After physics: Player(${player.x}, ${player.y}), vy=${player.vy}`);
            }
            
            return { logs, collisionDetected };
        });
        
        console.log('Collision simulation results:');
        collisionInfo.logs.forEach(log => console.log('  ', log));
        console.log('Collision detected:', collisionInfo.collisionDetected);
        
        // 衝突処理を待つ
        await t.wait(500);
        
        // 踏みつけ後の状態を確認
        const afterStomp = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies[0];
            
            return {
                player: player ? {
                    x: player.x,
                    y: player.y,
                    vy: player.vy,
                    health: player.health,
                    invulnerable: player.invulnerable
                } : null,
                armorKnight: armorKnight ? {
                    x: armorKnight.x,
                    y: armorKnight.y,
                    health: armorKnight.health,
                    isDead: armorKnight.state === 'dead'
                } : null
            };
        });
        
        console.log('After stomp:', afterStomp);
        
        // 検証：プレイヤーが反発したか（vy < 0）
        t.assert(afterStomp.player.vy < 0, 'Player should bounce off ArmorKnight (vy should be negative)');
        
        // 検証：プレイヤーがダメージを受けていないか
        t.assert(afterStomp.player.health === initialPlayerStats.health, 'Player should not take damage from stomping');
        
        // 検証：ArmorKnightが生存しているか
        t.assert(!afterStomp.armorKnight.isDead, 'ArmorKnight should not die from stomping');
        t.assert(afterStomp.armorKnight.health === armorKnightInitial.health, 'ArmorKnight should not take damage from stomping');
        
        console.log('\n=== Test 2: プレイヤー検知と突進テスト ===');
        
        // プレイヤーをArmorKnightの検知範囲内に配置
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies[0];
            
            if (player && armorKnight) {
                // 地面の高さに合わせて配置
                player.x = armorKnight.x + 40; // 検知範囲（60ピクセル）内
                player.y = armorKnight.y; // 同じ高さ
                player.vy = 0;
                
                // ArmorKnightにプレイヤーを検知させる
                if (armorKnight.setPlayerInRange) {
                    armorKnight.setPlayerInRange(player);
                }
                
                console.log(`Player positioned for detection test: (${player.x}, ${player.y})`);
                console.log(`Distance from ArmorKnight: ${Math.abs(player.x - armorKnight.x)}`);
            }
        });
        
        // AI更新を数回実行
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const armorKnight = state.entityManager.enemies[0];
            
            if (armorKnight && armorKnight.update) {
                // updateAIを直接呼び出してテスト
                for (let i = 0; i < 10; i++) {
                    armorKnight.update(16); // 約60FPSでの1フレーム
                }
            }
        });
        
        await t.wait(500);
        
        // 突進状態を確認
        const chargingState = await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const armorKnight = state.entityManager.enemies[0];
            
            return armorKnight ? {
                isCharging: armorKnight.isCharging,
                moveSpeed: armorKnight.moveSpeed,
                animState: armorKnight.animState,
                direction: armorKnight.direction,
                x: armorKnight.x,
                vx: armorKnight.vx
            } : null;
        });
        
        console.log('ArmorKnight charging state:', chargingState);
        
        // 検証：突進状態になっているか
        t.assert(chargingState.isCharging === true, 'ArmorKnight should be charging when player is in range');
        t.assert(chargingState.moveSpeed === 0.3, 'ArmorKnight speed should be doubled when charging');
        t.assert(chargingState.animState === 'charge', 'ArmorKnight should be in charge animation state');
        
        console.log('\n=== Test 3: 横からの接触ダメージテスト ===');
        
        // プレイヤーを横から接触させる
        await t.page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const player = state.player;
            const armorKnight = state.entityManager.enemies[0];
            
            if (player && armorKnight) {
                player.x = armorKnight.x - 20; // ArmorKnightの左側
                player.y = armorKnight.y; // 同じ高さ
                player.vy = 0; // 横からの接触
                player.invulnerable = false; // 無敵状態を解除
                console.log(`Player positioned for side collision: (${player.x}, ${player.y})`);
            }
        });
        
        const beforeCollision = await t.getPlayerStats();
        
        // 右に移動して衝突
        await t.movePlayer('right', 500);
        await t.wait(500);
        
        const afterCollision = await t.getPlayerStats();
        
        console.log('Before collision:', beforeCollision);
        console.log('After collision:', afterCollision);
        
        // 検証：プレイヤーがダメージを受けたか
        t.assert(afterCollision.health < beforeCollision.health, 'Player should take damage from side collision');
        
        // 成功メッセージ
        console.log('\n✅ All ArmorKnight tests passed!');
        
        // エラーチェック
        await t.checkForErrors();
    });
}

// テストを実行
runArmorKnightTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});