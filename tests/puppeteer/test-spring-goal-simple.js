/**
 * SpringとGoalFlagの簡易動作確認テスト
 */

import puppeteer from 'puppeteer';

async function runSimpleTest() {
    console.log('Starting simple Spring and GoalFlag test...\n');
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // エラーをキャッチ
        const errors = [];
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        // ゲームページにアクセス
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // SpringとGoalFlagの存在確認
        const itemsCheck = await page.evaluate(() => {
            const game = window.game;
            if (!game || !game.stateManager || !game.stateManager.currentState) {
                return { error: 'Game not properly initialized' };
            }
            
            const state = game.stateManager.currentState;
            const springExists = state.items?.some(item => item.constructor.name === 'Spring');
            const goalExists = state.items?.some(item => item.constructor.name === 'GoalFlag');
            
            return {
                gameState: game.stateManager.currentStateName,
                springExists,
                goalExists,
                totalItems: state.items?.length || 0
            };
        });
        
        console.log('Items check:', itemsCheck);
        
        // Spring機能のテスト（物理システム経由）
        console.log('\n=== Testing Spring Collision ===');
        const springTest = await page.evaluate(() => {
            const game = window.game;
            const state = game.stateManager.currentState;
            
            if (!state || !state.player) return { error: 'No player found' };
            
            // Springを探す
            const spring = state.items?.find(item => item.constructor.name === 'Spring');
            if (!spring) return { error: 'No spring found' };
            
            // プレイヤーをSpringの位置に移動（デバッグ用）
            state.player.x = spring.x;
            state.player.y = spring.y - state.player.height - 10;
            state.player.velY = 5; // 下向きの速度
            
            const beforeVelY = state.player.velY;
            
            // 衝突判定を手動でトリガー
            const collisionInfo = {
                fromTop: true,
                fromBottom: false,
                fromLeft: false,
                fromRight: false
            };
            
            spring.onCollision(state.player, collisionInfo);
            
            return {
                beforeVelY,
                afterVelY: state.player.velY,
                springTriggered: spring.triggered,
                compression: spring.compression
            };
        });
        
        console.log('Spring test result:', springTest);
        
        // GoalFlag機能のテスト
        console.log('\n=== Testing GoalFlag Collision ===');
        const goalTest = await page.evaluate(() => {
            const game = window.game;
            const state = game.stateManager.currentState;
            
            if (!state || !state.player) return { error: 'No player found' };
            
            // GoalFlagを探す
            const goal = state.items?.find(item => item.constructor.name === 'GoalFlag');
            if (!goal) return { error: 'No goal found' };
            
            const beforeCleared = goal.cleared;
            
            // プレイヤーをGoalFlagの位置に移動
            state.player.x = goal.x + 10;
            state.player.y = goal.y;
            
            // checkItemCollisionsを直接呼び出す
            if (state.checkItemCollisions) {
                state.checkItemCollisions();
            }
            
            return {
                beforeCleared,
                afterCleared: goal.cleared,
                hasCheckMethod: !!state.checkItemCollisions
            };
        });
        
        console.log('GoalFlag test result:', goalTest);
        
        // エラーチェック
        console.log('\n=== Error Check ===');
        console.log('JavaScript errors:', errors.length === 0 ? 'None' : errors);
        
        // 結果サマリー
        console.log('\n=== Test Summary ===');
        console.log('Spring exists:', itemsCheck.springExists ? 'PASS' : 'FAIL');
        console.log('GoalFlag exists:', itemsCheck.goalExists ? 'PASS' : 'FAIL');
        console.log('Spring bounce:', springTest.afterVelY && springTest.afterVelY < -20 ? 'PASS' : 'FAIL');
        console.log('GoalFlag clear:', goalTest.afterCleared ? 'PASS' : 'FAIL');
        console.log('No errors:', errors.length === 0 ? 'PASS' : 'FAIL');
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 実行
runSimpleTest().catch(console.error);