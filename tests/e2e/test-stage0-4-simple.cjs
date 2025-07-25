const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runTest() {
    const test = new GameTestHelpers({ 
        headless: testConfig.headless,
        verbose: true,
        timeout: 60000  // 60秒のタイムアウト
    });
    
    await test.runTest(async (t) => {
        await t.init('Stage 0-4 Enemy Spawn Test');
        
        // Use quickStart for simplified initialization
        await t.quickStart('0-4');
        await t.wait(2000);  // stage0-4のロードに時間がかかるため長めに待機
        
        console.log('✅ Stage 0-4 loaded successfully');
        
        // 少し待つ
        await t.wait(2000);
        
        // Oキーを押して敵生成ダイアログを開く
        console.log('Opening enemy spawn dialog...');
        await t.page.keyboard.press('o');
        await t.wait(1000);
        
        // ダイアログが開いているか確認
        const dialogVisible = await t.page.evaluate(() => {
            const dialog = document.getElementById('enemy-spawn-dialog');
            return dialog && dialog.style.display !== 'none';
        });
        
        if (dialogVisible) {
            console.log('✅ Enemy spawn dialog opened');
            
            // スライムボタンをクリック
            console.log('Clicking SLIME button...');
            await t.page.evaluate(() => {
                const buttons = document.querySelectorAll('#enemy-spawn-dialog button');
                for (const button of buttons) {
                    if (button.textContent === 'SLIME') {
                        button.click();
                        return true;
                    }
                }
                return false;
            });
            
            await t.wait(1000);
            
            // 敵が生成されたか確認
            const enemyInfo = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const enemies = state?.entityManager?.getEnemies() || [];
                return {
                    enemyCount: enemies.length,
                    enemies: enemies.map(e => ({
                        type: e.constructor.name,
                        x: Math.floor(e.x),
                        y: Math.floor(e.y)
                    }))
                };
            });
            
            console.log('Enemy info:', enemyInfo);
            
            t.assert(enemyInfo.enemyCount > 0, 'Enemy spawned successfully');
            if (enemyInfo.enemyCount > 0) {
                console.log('  Enemies:', enemyInfo.enemies);
            }
            
            
        } else {
            t.assert(false, 'Enemy spawn dialog is visible');
        }
        
        // スライムの動きを監視
        console.log('\nMonitoring slime position...');
        
        for (let i = 0; i < 10; i++) {
            await t.wait(1000);
            
            const enemyPos = await t.page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const enemies = state?.entityManager?.getEnemies() || [];
                const physicsSystem = window.game?.physicsSystem;
                const levelManager = state?.levelManager;
                
                return {
                    enemies: enemies.map(e => ({
                        type: e.constructor.name,
                        x: Math.floor(e.x),
                        y: Math.floor(e.y),
                        vx: e.vx?.toFixed(2),
                        vy: e.vy?.toFixed(2),
                        grounded: e.grounded,
                        active: e.active,
                        width: e.width,
                        height: e.height,
                        physicsLayer: e.physicsLayer
                    })),
                    tileMapExists: !!physicsSystem?.tileMap,
                    tileMapHeight: physicsSystem?.tileMap?.length,
                    levelTileMap: !!levelManager?.tileMap
                };
            });
            
            console.log(`[${i+1}s] Enemies:`, JSON.stringify(enemyPos));
        }
        
        
        await t.checkForErrors();
        
        console.log('✅ Test completed');
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;