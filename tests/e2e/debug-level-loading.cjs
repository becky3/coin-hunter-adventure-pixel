const puppeteer = require('puppeteer');

async function debugLevelLoading() {
    console.log('🔍 レベルローディングデバッグ\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // コンソールログを捕捉
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Loading level') || text.includes('entities') || text.includes('Entity')) {
            console.log('📝 LOG:', text);
        }
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // MusicSystemのタイムアウトを待つ
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // ゲームを開始
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // レベルとエンティティの情報を取得
        const levelInfo = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.getLevelManager?.();
            const entityManager = state?.getEntityManager?.();
            
            const levelData = levelManager?.getLevelData?.();
            const entities = levelManager?.getEntities?.();
            
            return {
                levelName: levelManager?.getCurrentLevel?.(),
                levelData: levelData ? {
                    width: levelData.width,
                    height: levelData.height,
                    hasEntities: !!levelData.entities,
                    entityCount: levelData.entities?.length || 0
                } : null,
                entities: entities || [],
                enemyCount: entityManager?.getEnemies?.()?.length || 0,
                itemCount: entityManager?.getItems?.()?.length || 0,
                createdEntities: {
                    enemies: entityManager?.getEnemies?.()?.map(e => e.constructor.name) || [],
                    items: entityManager?.getItems?.()?.map(i => i.constructor.name) || []
                }
            };
        });
        
        console.log('\n📊 レベル情報:');
        console.log('  - Level Name:', levelInfo.levelName);
        console.log('  - Level Data:', levelInfo.levelData);
        console.log('  - Entities from Level:', levelInfo.entities);
        console.log('  - Enemy Count:', levelInfo.enemyCount);
        console.log('  - Item Count:', levelInfo.itemCount);
        console.log('  - Created Enemies:', levelInfo.createdEntities.enemies);
        console.log('  - Created Items:', levelInfo.createdEntities.items);
        
        // createTestEntitiesが呼ばれているか確認
        const testResult = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            
            // createTestEntitiesを手動で呼び出してみる
            if (entityManager?.createTestEntities) {
                console.log('Calling createTestEntities manually...');
                entityManager.createTestEntities();
                
                return {
                    afterTestEnemies: entityManager.getEnemies?.()?.length || 0,
                    afterTestItems: entityManager.getItems?.()?.length || 0
                };
            }
            
            return { error: 'createTestEntities not found' };
        });
        
        console.log('\n🧪 Test Entities Result:', testResult);
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugLevelLoading();