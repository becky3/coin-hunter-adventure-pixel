const puppeteer = require('puppeteer');

async function checkLevelEntities() {
    console.log('🔍 レベルエンティティ確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // メニューのoptionsAlphaを待つ
        await page.waitForFunction(
            () => {
                const game = window.game;
                const state = game?.stateManager?.currentState;
                return state?.name === 'menu' && state?.optionsAlpha >= 1;
            },
            { timeout: 5000 }
        );
        
        // PlayStateに直接遷移
        await page.evaluate(() => {
            window.game.stateManager.changeState('play');
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // レベルデータの詳細を確認
        const levelData = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.getLevelManager?.();
            const entityManager = state?.getEntityManager?.();
            
            // レベルマネージャーのエンティティ設定を確認
            const levelEntities = levelManager?.getEntities?.() || null;
            
            // 実際に作成されたエンティティを確認
            const createdEnemies = entityManager?.getEnemies?.() || [];
            const createdItems = entityManager?.getItems?.() || [];
            
            // レベルデータの詳細
            const rawLevelData = levelManager?.levelData || null;
            
            return {
                levelName: levelManager?.getCurrentLevel?.(),
                levelEntities: {
                    data: levelEntities,
                    length: levelEntities?.length || 0,
                    isEmpty: !levelEntities || levelEntities.length === 0
                },
                createdEntities: {
                    enemies: createdEnemies.map(e => ({
                        type: e.constructor.name,
                        x: Math.round(e.x),
                        y: Math.round(e.y)
                    })),
                    items: createdItems.map(i => ({
                        type: i.constructor.name,
                        x: Math.round(i.x),
                        y: Math.round(i.y)
                    }))
                },
                rawLevelData: {
                    hasData: !!rawLevelData,
                    hasEntities: !!rawLevelData?.entities,
                    entityCount: rawLevelData?.entities?.length || 0
                }
            };
        });
        
        console.log('📊 レベルデータ詳細:', JSON.stringify(levelData, null, 2));
        
        // createTestEntitiesを手動で呼ぶ
        console.log('\n🔧 createTestEntitiesを手動実行...');
        const manualResult = await page.evaluate(() => {
            const entityManager = window.game?.stateManager?.currentState?.getEntityManager?.();
            if (entityManager?.createTestEntities) {
                entityManager.createTestEntities();
                return {
                    success: true,
                    enemies: entityManager.getEnemies().length,
                    items: entityManager.getItems().length
                };
            }
            return { success: false, error: 'createTestEntities not found' };
        });
        
        console.log('手動実行結果:', manualResult);
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

checkLevelEntities();