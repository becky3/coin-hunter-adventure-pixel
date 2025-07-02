const puppeteer = require('puppeteer');

async function waitAndCheck() {
    console.log('🔍 待機してゲーム状態確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // コンソールログを記録
    page.on('console', msg => {
        const text = msg.text();
        console.log('📝 LOG:', text);
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // 初期化完了を待つ
        console.log('初期化を待機中...');
        await page.waitForFunction(
            () => window.game?.gameLoop?.isRunning?.() === true,
            { timeout: 10000 }
        );
        
        console.log('ゲームループ開始確認！');
        
        // メニュー状態を待つ
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'menu',
            { timeout: 5000 }
        );
        
        console.log('メニュー状態確認！');
        
        // Spaceキーを押す
        await page.keyboard.press('Space');
        console.log('Spaceキー押下！');
        
        // PlayState遷移を待つ
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'play',
            { timeout: 5000 }
        );
        
        console.log('PlayState遷移確認！');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ゲーム状態を取得
        const gameState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            const levelManager = state?.getLevelManager?.();
            const hudManager = state?.getHudManager?.();
            
            return {
                stateName: state?.name,
                playerExists: !!state?.player,
                enemies: entityManager?.getEnemies?.()?.map(e => ({
                    type: e.constructor.name,
                    x: Math.round(e.x),
                    y: Math.round(e.y)
                })) || [],
                items: entityManager?.getItems?.()?.map(i => ({
                    type: i.constructor.name,
                    x: Math.round(i.x),
                    y: Math.round(i.y)
                })) || [],
                levelName: levelManager?.getCurrentLevel?.(),
                hudData: hudManager?.getHUDData?.() || {}
            };
        });
        
        console.log('\n📊 ゲーム状態:');
        console.log('  State:', gameState.stateName);
        console.log('  Player:', gameState.playerExists);
        console.log('  Level:', gameState.levelName);
        console.log('  Enemies:', gameState.enemies);
        console.log('  Items:', gameState.items);
        console.log('  HUD:', gameState.hudData);
        
        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/wait-and-check.png' });
        console.log('\n📸 スクリーンショット: tests/screenshots/wait-and-check.png');
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
        
        // エラー時の状態を確認
        const errorState = await page.evaluate(() => ({
            gameExists: !!window.game,
            gameLoopRunning: window.game?.gameLoop?.isRunning?.(),
            currentState: window.game?.stateManager?.currentState?.name
        }));
        
        console.log('エラー時の状態:', errorState);
    } finally {
        await browser.close();
    }
}

waitAndCheck();