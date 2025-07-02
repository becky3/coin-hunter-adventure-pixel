const puppeteer = require('puppeteer');

async function checkGameState() {
    console.log('🔍 ゲーム状態詳細確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 全てのコンソールログを記録
    const logs = [];
    page.on('console', msg => {
        const text = msg.text();
        logs.push(text);
        if (text.includes('PlayState') || text.includes('entities') || text.includes('Enemy') || text.includes('Coin')) {
            console.log('📝 LOG:', text);
        }
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // ゲームを開始
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 詳細な状態を取得
        const gameDetails = await page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            
            // レベルマネージャーの詳細
            const levelManager = state?.getLevelManager?.();
            const levelData = levelManager?.getLevelData?.();
            const entities = levelManager?.getEntities?.();
            
            // エンティティマネージャーの詳細
            const entityManager = state?.getEntityManager?.();
            const enemies = entityManager?.getEnemies?.() || [];
            const items = entityManager?.getItems?.() || [];
            
            return {
                stateName: state?.name,
                hasLevelManager: !!levelManager,
                hasEntityManager: !!entityManager,
                levelDataExists: !!levelData,
                levelEntities: entities || [],
                enemiesCreated: enemies.map(e => ({
                    type: e.constructor.name,
                    x: e.x,
                    y: e.y
                })),
                itemsCreated: items.map(i => ({
                    type: i.constructor.name,
                    x: i.x,
                    y: i.y
                }))
            };
        });
        
        console.log('\n📊 ゲーム詳細:');
        console.log('  State:', gameDetails.stateName);
        console.log('  Has Level Manager:', gameDetails.hasLevelManager);
        console.log('  Has Entity Manager:', gameDetails.hasEntityManager);
        console.log('  Level Data Exists:', gameDetails.levelDataExists);
        console.log('  Level Entities:', gameDetails.levelEntities);
        console.log('  Enemies Created:', gameDetails.enemiesCreated);
        console.log('  Items Created:', gameDetails.itemsCreated);
        
        // スクリーンショットを撮る
        await page.screenshot({ path: 'tests/screenshots/game-state-check.png', fullPage: true });
        
        // 手動でレベルをロードしてみる
        const loadResult = await page.evaluate(async () => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.getLevelManager?.();
            
            if (levelManager) {
                try {
                    await levelManager.loadLevel('tutorial');
                    const afterLoad = levelManager.getLevelData();
                    return {
                        loaded: true,
                        levelData: afterLoad,
                        entities: levelManager.getEntities()
                    };
                } catch (error) {
                    return { error: error.message };
                }
            }
            return { error: 'No level manager' };
        });
        
        console.log('\n🔄 手動レベルロード結果:', loadResult);
        
        // PlayStateのログを確認
        const playStateLogs = logs.filter(log => 
            log.includes('PlayState') || 
            log.includes('Loading level') ||
            log.includes('entities')
        );
        
        console.log('\n📋 PlayState関連ログ:');
        playStateLogs.forEach(log => console.log('  -', log));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

checkGameState();