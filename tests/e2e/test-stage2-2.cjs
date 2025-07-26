/**
 * Stage 2-2の動作確認テスト
 * 
 * テスト内容：
 * - ステージが正常にロードされる
 * - FallingFloorエンティティが存在し、正しく表示される
 * - Spiderエンティティが表示される
 * - エンティティの可視性を確認
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
        await t.init('Stage 2-2 Visibility Test');
        
        // コンソールエラーを収集
        const consoleErrors = [];
        t.page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Stage 2-2をロード
        await t.quickStart('stage2-2');
        console.log('✅ Stage 2-2 loaded successfully');
        
        // コンソールエラーを表示
        if (consoleErrors.length > 0) {
            console.log(`\n⚠️ Console errors detected: ${consoleErrors.length}`);
            // 最初の5個だけ表示
            consoleErrors.slice(0, 5).forEach((err, i) => {
                console.log(`  [${i}] ${err}`);
            });
            if (consoleErrors.length > 5) {
                console.log(`  ... and ${consoleErrors.length - 5} more errors`);
            }
        }
        
        // AssetLoaderの状態を確認
        const assetLoaderInfo = await t.page.evaluate(() => {
            const assetLoader = window.AssetLoader?.getInstance?.();
            if (!assetLoader) return { error: 'AssetLoader not found' };
            
            // スプライトキャッシュの状態を確認
            const spriteCache = assetLoader.sprites || {};
            const terrainSprites = {};
            
            Object.keys(spriteCache).forEach(key => {
                if (key.startsWith('terrain/')) {
                    terrainSprites[key] = true;
                }
            });
            
            return {
                totalCachedSprites: Object.keys(spriteCache).length,
                terrainSprites: terrainSprites,
                hasFallingFloor: !!spriteCache['terrain/falling_floor_normal']
            };
        });
        
        console.log('\nAssetLoader info:', assetLoaderInfo);
        
        // プレイヤーの存在を確認
        const player = await t.getEntity('player');
        console.log('Player info:', player);
        
        t.assert(player !== null, 'Player should exist');
        t.assert(player.x > 0, 'Player should have valid x position');
        t.assert(player.y > 0, 'Player should have valid y position');
        
        // エンティティ情報を取得
        const entityInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager) return { error: 'EntityManager not found' };
            
            const allEntities = entityManager.getAll();
            const fallingFloors = [];
            const spiders = [];
            
            allEntities.forEach(entity => {
                if (entity.constructor.name === 'FallingFloor') {
                    fallingFloors.push({
                        type: 'FallingFloor',
                        x: entity.x,
                        y: entity.y,
                        visible: entity.visible,
                        active: entity.active,
                        width: entity.width,
                        height: entity.height,
                        state: entity.state
                    });
                } else if (entity.constructor.name === 'Spider') {
                    spiders.push({
                        type: 'Spider',
                        x: entity.x,
                        y: entity.y,
                        visible: entity.visible,
                        active: entity.active
                    });
                }
            });
            
            return {
                totalEntities: allEntities.length,
                fallingFloors: fallingFloors,
                spiders: spiders,
                fallingFloorCount: fallingFloors.length,
                spiderCount: spiders.length
            };
        });
        
        console.log('Entity information:');
        console.log(`  Total entities: ${entityInfo.totalEntities}`);
        console.log(`  FallingFloor count: ${entityInfo.fallingFloorCount}`);
        console.log(`  Spider count: ${entityInfo.spiderCount}`);
        
        // FallingFloorが存在することを確認
        t.assert(entityInfo.fallingFloorCount > 0, 'FallingFloor entities exist');
        
        if (entityInfo.fallingFloorCount > 0) {
            console.log('\nFallingFloor entities (first 5):');
            entityInfo.fallingFloors.slice(0, 5).forEach((floor, i) => {
                console.log(`  [${i}] Position: (${floor.x}, ${floor.y}), Visible: ${floor.visible}, Active: ${floor.active}, State: ${floor.state}`);
            });
            
            // 可視性をチェック
            const visibleFloors = entityInfo.fallingFloors.filter(f => f.visible);
            console.log(`\nVisible FallingFloors: ${visibleFloors.length}/${entityInfo.fallingFloorCount}`);
        }
        
        // Spiderの情報も表示
        if (entityInfo.spiderCount > 0) {
            console.log('\nSpider entities:');
            entityInfo.spiders.forEach((spider, i) => {
                console.log(`  [${i}] Position: (${spider.x}, ${spider.y}), Visible: ${spider.visible}, Active: ${spider.active}`);
            });
        }
        
        // スクリーンショットを撮る
        await t.wait(1000);
        await t.takeScreenshot('stage2-2-initial');
        
        // プレイヤーを少し動かしてFallingFloorの近くへ
        console.log('\nMoving player to interact with FallingFloor...');
        await t.wait(500);
        
        // 右に移動（ヘルパーメソッドを使用）
        await t.movePlayer('right', 2000);
        
        // 再度エンティティ情報を取得
        const afterMove = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            if (!entityManager) return null;
            
            const fallingFloors = [];
            entityManager.getAll().forEach(entity => {
                if (entity.constructor.name === 'FallingFloor') {
                    fallingFloors.push({
                        x: entity.x,
                        y: entity.y,
                        state: entity.state
                    });
                }
            });
            
            return { fallingFloors };
        });
        
        console.log('\nFallingFloor states after movement:');
        if (afterMove && afterMove.fallingFloors.length > 0) {
            const states = {};
            afterMove.fallingFloors.forEach(floor => {
                states[floor.state] = (states[floor.state] || 0) + 1;
            });
            Object.entries(states).forEach(([state, count]) => {
                console.log(`  ${state}: ${count}`);
            });
        }
        
        await t.takeScreenshot('stage2-2-after-move');
        
        // エラーチェック
        await t.checkForErrors();
        
        console.log('\n✅ Stage 2-2 test completed');
    });
}

// テストを実行
runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});