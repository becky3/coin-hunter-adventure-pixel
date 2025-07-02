const puppeteer = require('puppeteer');

async function checkMenuState() {
    console.log('🔍 メニュー状態詳細確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // メニュー状態を確認
        const menuState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                stateName: state?.name,
                optionsAlpha: state?.optionsAlpha,
                showHowTo: state?.showHowTo,
                showCredits: state?.showCredits,
                selectedOption: state?.selectedOption
            };
        });
        
        console.log('📊 初期メニュー状態:', menuState);
        
        // optionsAlphaが1になるまで待つ
        console.log('optionsAlphaが1になるのを待機中...');
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.optionsAlpha >= 1,
            { timeout: 5000 }
        );
        
        const afterWait = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                optionsAlpha: state?.optionsAlpha
            };
        });
        
        console.log('✅ optionsAlpha:', afterWait.optionsAlpha);
        
        // Spaceキーを押す
        console.log('\n🎮 Spaceキーを押します...');
        await page.keyboard.press('Space');
        
        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 状態を確認
        const afterSpace = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                stateName: state?.name,
                playerExists: !!state?.player
            };
        });
        
        console.log('📊 Space押下後の状態:', afterSpace);
        
        if (afterSpace.stateName === 'play') {
            // PlayStateの詳細を取得
            const playDetails = await page.evaluate(() => {
                const state = window.game?.stateManager?.currentState;
                const entityManager = state?.getEntityManager?.();
                const levelManager = state?.getLevelManager?.();
                
                return {
                    playerExists: !!state?.player,
                    levelName: levelManager?.getCurrentLevel?.(),
                    enemies: entityManager?.getEnemies?.()?.length || 0,
                    items: entityManager?.getItems?.()?.length || 0
                };
            });
            
            console.log('\n🎮 PlayState詳細:', playDetails);
        }
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

checkMenuState();