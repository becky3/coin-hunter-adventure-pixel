const puppeteer = require('puppeteer');

async function testGameCoreStructure() {
    console.log('🔍 GameCore構造テスト\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // GameCore構造を確認
        const gameStructure = await page.evaluate(() => {
            const game = window.game;
            if (!game) return { hasGame: false };
            
            return {
                hasGame: true,
                hasStateManager: !!game.stateManager,
                hasServiceLocator: !!game.serviceLocator,
                currentState: game.stateManager?.currentState?.name,
                // ServiceLocatorから各サービスを取得
                services: {
                    inputSystem: !!game.serviceLocator?.get?.('input'),
                    renderer: !!game.serviceLocator?.get?.('renderer'),
                    physics: !!game.serviceLocator?.get?.('physics'),
                    audio: !!game.serviceLocator?.get?.('audio'),
                    assetLoader: !!game.serviceLocator?.get?.('assetLoader'),
                    eventBus: !!game.serviceLocator?.get?.('eventBus')
                }
            };
        });
        
        console.log('📊 GameCore構造:', JSON.stringify(gameStructure, null, 2));
        
        // メニューからPlayStateへの遷移
        console.log('\n🎮 PlayState遷移テスト...');
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // PlayState情報を取得
        const playStateInfo = await page.evaluate(() => {
            const game = window.game;
            const currentState = game?.stateManager?.currentState;
            
            // PlayStateのpublicメソッドを確認
            const hasGetters = {
                getEntityManager: typeof currentState?.getEntityManager === 'function',
                getLevelManager: typeof currentState?.getLevelManager === 'function',
                getCameraController: typeof currentState?.getCameraController === 'function',
                getHudManager: typeof currentState?.getHudManager === 'function'
            };
            
            // 各マネージャーの取得を試みる
            let entityInfo = null;
            let levelInfo = null;
            
            if (hasGetters.getEntityManager) {
                const entityManager = currentState.getEntityManager();
                entityInfo = {
                    exists: !!entityManager,
                    enemies: entityManager?.getEnemies?.()?.length || 0,
                    items: entityManager?.getItems?.()?.length || 0
                };
            }
            
            if (hasGetters.getLevelManager) {
                const levelManager = currentState.getLevelManager();
                levelInfo = {
                    exists: !!levelManager,
                    currentLevel: levelManager?.getCurrentLevel?.()
                };
            }
            
            return {
                stateName: currentState?.name,
                hasGetters,
                entityInfo,
                levelInfo,
                playerExists: !!currentState?.player
            };
        });
        
        console.log('\n📊 PlayState情報:', JSON.stringify(playStateInfo, null, 2));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

testGameCoreStructure();