const puppeteer = require('puppeteer');

async function checkGameIssues() {
    console.log('🔍 ゲーム問題調査\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // コンソールログを捕捉
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Coin collected') || text.includes('Stage Clear') || text.includes('enemy') || text.includes('Enemy')) {
            console.log('📝 重要ログ:', text);
        }
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // MusicSystemのタイムアウトを待つ
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // ゲームを開始
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム状態を確認
        const gameState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            
            return {
                stateName: state?.name,
                player: !!state?.player,
                enemies: {
                    count: entityManager?.getEnemies?.()?.length || 0,
                    list: entityManager?.getEnemies?.()?.map(e => ({
                        type: e.constructor.name,
                        x: e.x,
                        y: e.y,
                        visible: e.visible !== false
                    })) || []
                },
                items: {
                    count: entityManager?.getItems?.()?.length || 0,
                    list: entityManager?.getItems?.()?.map(i => ({
                        type: i.constructor.name,
                        x: i.x,
                        y: i.y,
                        collected: i.isCollected?.() || false
                    })) || []
                },
                hudData: state?.hudManager?.getHUDData?.() || {},
                score: state?.hudManager?.getHUDData?.()?.score || 0
            };
        });
        
        console.log('\n📊 初期ゲーム状態:');
        console.log('  - State:', gameState.stateName);
        console.log('  - Player:', gameState.player);
        console.log('  - Enemies:', gameState.enemies.count);
        if (gameState.enemies.count > 0) {
            gameState.enemies.list.forEach((e, i) => {
                console.log(`    Enemy ${i + 1}: ${e.type} at (${e.x}, ${e.y}) visible:${e.visible}`);
            });
        }
        console.log('  - Items:', gameState.items.count);
        if (gameState.items.count > 0) {
            gameState.items.list.forEach((item, i) => {
                console.log(`    Item ${i + 1}: ${item.type} at (${item.x}, ${item.y})`);
            });
        }
        console.log('  - Score:', gameState.score);
        console.log('  - HUD:', gameState.hudData);
        
        // EventBusのリスナーを確認
        const eventListeners = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const eventBus = state?.eventBus;
            
            if (eventBus && eventBus.listeners) {
                return Object.keys(eventBus.listeners);
            }
            return [];
        });
        
        console.log('\n📡 EventBusリスナー:', eventListeners);
        
        // コインの近くに移動してみる
        if (gameState.items.count > 0) {
            const coin = gameState.items.list.find(i => i.type === 'Coin');
            if (coin) {
                console.log('\n🪙 コインテスト:');
                console.log(`  コイン位置: (${coin.x}, ${coin.y})`);
                
                // デバッグワープでコインの近くに移動
                await page.evaluate((x, y) => {
                    if (window.debugWarp) {
                        window.debugWarp(x - 20, y);
                    }
                }, coin.x, coin.y);
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 右に移動してコインを取る
                await page.keyboard.down('ArrowRight');
                await new Promise(resolve => setTimeout(resolve, 1000));
                await page.keyboard.up('ArrowRight');
                
                // スコアを確認
                const afterCoin = await page.evaluate(() => ({
                    score: window.game?.stateManager?.currentState?.hudManager?.getHUDData?.()?.score || 0,
                    coinsCollected: window.game?.stateManager?.currentState?.hudManager?.getHUDData?.()?.coinsCollected || 0
                }));
                
                console.log(`  取得後スコア: ${afterCoin.score}`);
                console.log(`  コイン数: ${afterCoin.coinsCollected}`);
            }
        }
        
        // ゴールフラグの近くに移動
        const goal = gameState.items.list.find(i => i.type === 'GoalFlag');
        if (goal) {
            console.log('\n🏁 ゴールテスト:');
            console.log(`  ゴール位置: (${goal.x}, ${goal.y})`);
            
            await page.evaluate((x, y) => {
                if (window.debugWarp) {
                    window.debugWarp(x - 20, y);
                }
            }, goal.x, goal.y);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 右に移動してゴールに触れる
            await page.keyboard.down('ArrowRight');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.keyboard.up('ArrowRight');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 状態を確認
            const afterGoal = await page.evaluate(() => ({
                stateName: window.game?.stateManager?.currentState?.name,
                goalCleared: window.game?.stateManager?.currentState?.items?.find(i => i.constructor.name === 'GoalFlag')?.isCleared?.() || false
            }));
            
            console.log(`  ゴール後の状態: ${afterGoal.stateName}`);
            console.log(`  ゴールクリア: ${afterGoal.goalCleared}`);
        }
        
        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/game-issues-check.png', fullPage: true });
        console.log('\n📸 スクリーンショット保存: tests/screenshots/game-issues-check.png');
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

checkGameIssues();