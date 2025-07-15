const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// スパイダーの総合テスト
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Spider Comprehensive Test');
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        await t.assertState('play');
        await t.ensureInputFocus();
        
        console.log('\n=== スパイダーの総合テスト ===');
        
        // 1. スパイダーの生成テスト
        console.log('\n1. スパイダーの生成テスト');
        const spawnResult = await t.page.evaluate(() => {
            const entityManager = window.game?.stateManager?.currentState?.entityManager;
            if (!entityManager) return { error: 'EntityManager not found' };
            
            const enemiesBefore = entityManager.enemies.length;
            
            try {
                entityManager.spawnEnemy('spider', 10, 3);
                
                const enemiesAfter = entityManager.enemies.length;
                const spider = entityManager.enemies.find(e => 
                    e.constructor.name === 'Spider'
                );
                
                return {
                    success: true,
                    enemiesBefore,
                    enemiesAfter,
                    spiderFound: !!spider,
                    spiderData: spider ? {
                        x: spider.x,
                        y: spider.y,
                        state: spider.spiderState,
                        surface: spider.currentSurface,
                        health: spider.health,
                        damage: spider.damage,
                        width: spider.width,
                        height: spider.height
                    } : null
                };
            } catch (error) {
                return { 
                    success: false,
                    error: error.message,
                    stack: error.stack
                };
            }
        });
        
        console.log('生成結果:', spawnResult);
        t.assert(spawnResult.success, `スパイダーが正常に生成される (error: ${spawnResult.error || 'none'})`);
        t.assert(spawnResult.spiderFound, 'スパイダーが存在する');
        t.assert(spawnResult.enemiesAfter > spawnResult.enemiesBefore, '敵の数が増加する');
        t.assert(spawnResult.spiderData && spawnResult.spiderData.width === 16, `スパイダーの幅は16ピクセル (actual: ${spawnResult.spiderData?.width})`);
        t.assert(spawnResult.spiderData && spawnResult.spiderData.height === 16, `スパイダーの高さは16ピクセル (actual: ${spawnResult.spiderData?.height})`);
        
        // 2. 天井這い移動テスト
        console.log('\n2. 天井這い移動テスト');
        const crawlingTest = await t.page.evaluate(() => {
            const spider = window.game?.stateManager?.currentState?.entityManager?.enemies.find(e => 
                e.constructor.name === 'Spider'
            );
            
            if (!spider) return { error: 'Spider not found' };
            
            const initialX = spider.x;
            const initialY = spider.y;
            const initialState = spider.spiderState;
            
            // 60フレーム分更新（約1秒）
            for (let i = 0; i < 60; i++) {
                spider.update(0.016);
            }
            
            return {
                initialX,
                initialY,
                finalX: spider.x,
                finalY: spider.y,
                initialState,
                finalState: spider.spiderState,
                moved: Math.abs(spider.x - initialX) > 0.1,
                surface: spider.currentSurface
            };
        });
        
        console.log('移動テスト結果:', crawlingTest);
        t.assert(crawlingTest.moved, 'スパイダーが移動する');
        t.assert(crawlingTest.surface === 'ceiling', `スパイダーは天井にいる (actual: ${crawlingTest.surface})`);
        
        // 3. プレイヤー検知テスト
        console.log('\n3. プレイヤー検知テスト');
        const detectionTest = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const spider = state?.entityManager?.enemies.find(e => 
                e.constructor.name === 'Spider'
            );
            const player = state?.entityManager?.player;
            
            if (!spider || !player) return { error: 'Spider or player not found' };
            
            // プレイヤーをスパイダーの真下に配置
            player.x = spider.x;
            player.y = spider.y + 100;
            
            const beforeState = spider.spiderState;
            
            // プレイヤー検知を強制的に実行
            spider.checkPlayerProximity();
            
            // 状態更新
            for (let i = 0; i < 30; i++) {
                spider.update(0.016);
            }
            
            return {
                beforeState,
                afterState: spider.spiderState,
                playerX: player.x,
                playerY: player.y,
                spiderX: spider.x,
                spiderY: spider.y,
                threadY: spider.threadY,
                detected: spider.spiderState === 'descending' || spider.spiderState === 'waiting'
            };
        });
        
        console.log('検知テスト結果:', detectionTest);
        t.assert(detectionTest.detected, 'プレイヤーを検知して降下状態になる');
        
        // 4. 糸降下テスト
        console.log('\n4. 糸降下テスト');
        await t.wait(1000);
        
        const descendTest = await t.page.evaluate(() => {
            const spider = window.game?.stateManager?.currentState?.entityManager?.enemies.find(e => 
                e.constructor.name === 'Spider'
            );
            
            if (!spider) return { error: 'Spider not found' };
            
            const initialY = spider.y;
            
            // 降下完了まで更新
            for (let i = 0; i < 200 && spider.spiderState === 'descending'; i++) {
                spider.update(0.016);
            }
            
            return {
                initialY,
                finalY: spider.y,
                descended: spider.y > initialY,
                state: spider.spiderState,
                threadLength: spider.threadLength
            };
        });
        
        console.log('降下テスト結果:', descendTest);
        t.assert(descendTest.descended, 'スパイダーが糸で降下する');
        
        // 5. ダメージテスト
        console.log('\n5. ダメージテスト');
        const damageTest = await t.page.evaluate(() => {
            const spider = window.game?.stateManager?.currentState?.entityManager?.enemies.find(e => 
                e.constructor.name === 'Spider'
            );
            
            if (!spider) return { error: 'Spider not found' };
            
            const initialHealth = spider.health;
            spider.takeDamage(1);
            const finalHealth = spider.health;
            
            return {
                initialHealth,
                finalHealth,
                damaged: finalHealth < initialHealth,
                isAlive: spider.active,
                isDead: spider.state === 'dead'
            };
        });
        
        console.log('ダメージテスト結果:', damageTest);
        t.assert(damageTest.damaged, 'スパイダーが踏みつけでダメージを受ける');
        
        // 6. 踏みつけテスト
        console.log('\n6. 踏みつけテスト');
        
        // 新しいスパイダーを生成
        await t.page.evaluate(() => {
            window.game?.stateManager?.currentState?.entityManager?.spawnEnemy('spider', 15, 5);
        });
        
        const stompTest = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const spider = state?.entityManager?.enemies.find(e => 
                e.constructor.name === 'Spider' && e.active
            );
            const player = state?.entityManager?.player;
            
            if (!spider || !player) return { error: 'Spider or player not found' };
            
            // プレイヤーをスパイダーの上に配置
            player.x = spider.x;
            player.y = spider.y - player.height - 5;
            player.vy = 5; // 下向きの速度
            
            const initialScore = state?.ui?.score || 0;
            
            // 物理シミュレーション実行
            const physicsSystem = state?.physicsSystem;
            if (physicsSystem) {
                physicsSystem.checkEnemyCollisions();
            }
            
            const finalScore = state?.ui?.score || 0;
            
            return {
                spiderActive: spider.active,
                spiderState: spider.state,
                scoreIncreased: finalScore > initialScore,
                scoreDiff: finalScore - initialScore
            };
        });
        
        console.log('踏みつけテスト結果:', stompTest);
        
        await t.screenshot('spider-test-complete');
        console.log('\n✅ スパイダーテスト完了');
    });
}

// テスト実行
runTest().catch(error => {
    console.error('テストエラー:', error);
    process.exit(1);
});