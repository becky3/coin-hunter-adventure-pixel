const puppeteer = require('puppeteer');

async function debugEntityCreation() {
    console.log('🔍 エンティティ作成デバッグ\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // エンティティ関連のログを捕捉
    const entityLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Entity') || text.includes('enemy') || text.includes('Enemy') || 
            text.includes('item') || text.includes('Item') || text.includes('createTestEntities')) {
            console.log('📝 LOG:', text);
            entityLogs.push(text);
        }
    });
    
    try {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // メニューまで待機
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'menu' &&
                  window.game?.stateManager?.currentState?.optionsAlpha >= 1,
            { timeout: 10000 }
        );
        
        console.log('✅ メニュー準備完了\n');
        
        // PlayStateのメソッドにパッチを当てる
        await page.evaluate(() => {
            // createTestEntitiesが呼ばれるかチェック
            const originalMethod = window.PlayState?.prototype?.createTestEntities;
            if (originalMethod) {
                window.PlayState.prototype.createTestEntities = function(...args) {
                    console.log('createTestEntities called!');
                    const result = originalMethod.apply(this, args);
                    console.log('createTestEntities completed');
                    return result;
                };
            }
        });
        
        // Spaceキーを押してゲーム開始
        console.log('🎮 ゲーム開始...');
        await page.keyboard.press('Space');
        
        // PlayState遷移を待つ
        await page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'play',
            { timeout: 5000 }
        );
        
        console.log('✅ PlayState遷移完了\n');
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // エンティティ情報を取得
        const entityInfo = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            
            // createTestEntitiesメソッドの存在確認
            const hasCreateTestMethod = typeof state?.createTestEntities === 'function';
            
            // 手動でcreateTestEntitiesを呼んでみる
            let manualCreationResult = null;
            if (hasCreateTestMethod && state) {
                try {
                    state.createTestEntities();
                    manualCreationResult = 'Success';
                } catch (error) {
                    manualCreationResult = `Error: ${error.message}`;
                }
            }
            
            return {
                hasEntityManager: !!entityManager,
                hasCreateTestMethod,
                manualCreationResult,
                enemies: {
                    count: entityManager?.getEnemies?.()?.length || 0,
                    list: entityManager?.getEnemies?.()?.map(e => ({
                        type: e.constructor.name,
                        x: Math.round(e.x),
                        y: Math.round(e.y)
                    })) || []
                },
                items: {
                    count: entityManager?.getItems?.()?.length || 0,
                    list: entityManager?.getItems?.()?.map(i => ({
                        type: i.constructor.name,
                        x: Math.round(i.x),
                        y: Math.round(i.y)
                    })) || []
                },
                player: {
                    exists: !!state?.player,
                    position: state?.player ? {
                        x: Math.round(state.player.x),
                        y: Math.round(state.player.y)
                    } : null
                }
            };
        });
        
        console.log('📊 エンティティ情報:');
        console.log('  EntityManager存在:', entityInfo.hasEntityManager);
        console.log('  createTestEntitiesメソッド存在:', entityInfo.hasCreateTestMethod);
        console.log('  手動作成結果:', entityInfo.manualCreationResult);
        console.log('\n  敵:', entityInfo.enemies);
        console.log('  アイテム:', entityInfo.items);
        console.log('  プレイヤー:', entityInfo.player);
        
        // レベルマネージャー情報も確認
        const levelInfo = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const levelManager = state?.getLevelManager?.();
            
            return {
                hasLevelManager: !!levelManager,
                currentLevel: levelManager?.getCurrentLevel?.(),
                hasLevelData: !!levelManager?.levelData
            };
        });
        
        console.log('\n📊 レベル情報:', levelInfo);
        
        // ログ確認
        console.log('\n📋 エンティティ関連ログ:');
        entityLogs.forEach(log => console.log('  -', log));
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugEntityCreation();