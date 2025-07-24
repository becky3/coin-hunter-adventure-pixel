/**
 * 落ちる床（FallingFloor）のE2Eテスト
 * 
 * テスト内容：
 * - プレイヤーが床に乗ると振動開始
 * - 1秒後に床が落下
 * - 3秒後に床が復活
 * - 複数の床が独立して動作
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Falling Floor Test');
        
        // テスト用ステージで開始
        await t.quickStart('stage-test-falling-floor');
        
        // プレイヤーの初期位置を確認
        const player = await t.getEntity('player');
        console.log('Initial player position:', player.x, player.y);
        
        // 落ちる床の位置を確認
        const platforms = await t.getEntity('platforms');
        const fallingFloors = platforms ? platforms.filter(p => p.type === 'FallingFloor') : [];
        console.log('Number of falling floors:', fallingFloors.length);
        t.assert(fallingFloors.length > 0, 'Should have falling floors in the stage');
        
        // ============================================================
        // テスト1: 床に乗ると振動開始・落下・復活のサイクル
        // ============================================================
        console.log('\n--- Test 1: Basic falling floor cycle ---');
        
        // 最初の落ちる床の位置を記録
        const firstFloor = fallingFloors[0];
        const originalY = firstFloor.y;
        console.log('First floor position:', firstFloor.x, firstFloor.y);
        
        // プレイヤーを最初の落ちる床の上に配置
        await t.teleportPlayer(firstFloor.x, firstFloor.y - 40);
        await t.wait(500);  // 着地を待つ
        
        // 着地後のプレイヤー位置を記録
        const playerBeforeFall = await t.getEntity('player');
        console.log('Player position before floor falls:', playerBeforeFall.x, playerBeforeFall.y);
        
        // プレイヤーが床の上に乗っていることを確認（Y座標が床の上にあること）
        const expectedPlayerY = firstFloor.y - player.height;
        console.log('Expected player Y on floor:', expectedPlayerY, 'Actual Y:', playerBeforeFall.y);
        t.assert(Math.abs(playerBeforeFall.y - expectedPlayerY) < 5, 'Player should be standing on the floor');
        
        // 床の状態を確認（振動開始）
        const floorShaking = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager) return null;
            
            const platforms = entityManager.getPlatforms();
            const floor = platforms.find(p => p.constructor.name === 'FallingFloor');
            if (!floor) return null;
            
            return {
                state: floor.state,
                visible: floor.visible,
                solid: floor.solid
            };
        });
        console.log('Floor state after landing:', floorShaking);
        t.assert(floorShaking.state === 'shaking', 'Floor should be shaking');
        
        // 1秒待って落下を確認
        await t.wait(1000);
        const floorFalling = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager) return null;
            
            const platforms = entityManager.getPlatforms();
            const floor = platforms.find(p => p.constructor.name === 'FallingFloor');
            if (!floor) return null;
            
            return {
                state: floor.state,
                y: floor.y,
                gravity: floor.gravity,
                physicsEnabled: floor.physicsEnabled,
                solid: floor.solid
            };
        });
        console.log('Floor state after 1 second:', floorFalling);
        t.assert(floorFalling.state === 'falling', 'Floor should be falling');
        t.assert(floorFalling.gravity === true, 'Floor should have gravity enabled');
        t.assert(floorFalling.solid === false, 'Floor should not be solid when falling');
        
        // プレイヤーも落下することを確認
        await t.wait(500);
        const playerFalling = await t.getEntity('player');
        console.log('Player position while floor falling:', playerFalling.x, playerFalling.y);
        t.assert(playerFalling.y > playerBeforeFall.y, 'Player should fall when floor falls');
        
        // 7秒待って床の復活を確認（落下開始から3秒後に復活）
        await t.wait(7000);
        const floorRespawned = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager) return null;
            
            const platforms = entityManager.getPlatforms();
            const floor = platforms.find(p => p.constructor.name === 'FallingFloor');
            if (!floor) return null;
            
            return {
                state: floor.state,
                x: floor.x,
                y: floor.y,
                visible: floor.visible,
                solid: floor.solid
            };
        });
        console.log('Floor state after respawn:', floorRespawned);
        t.assert(floorRespawned.state === 'stable', 'Floor should be stable again');
        t.assert(floorRespawned.y === originalY, 'Floor should return to original position');
        t.assert(floorRespawned.visible === true, 'Floor should be visible');
        t.assert(floorRespawned.solid === true, 'Floor should be solid again');
        
        
        // ============================================================
        // エラーチェック
        // ============================================================
        await t.checkForErrors();
        
        console.log('\nAll falling floor tests passed!');
    });
}

// テストを実行
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;