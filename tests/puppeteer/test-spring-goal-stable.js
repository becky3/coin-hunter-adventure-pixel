/**
 * SpringとGoalFlagの安定版動作確認テスト
 * 
 * より安定したテストのため、page.waitForFunctionを使用
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runStableSpringGoalTest() {
    console.log('Starting stable Spring and GoalFlag tests...\n');
    
    let browser;
    let page;
    
    try {
        // ブラウザの起動
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // エラーログの収集スクリプトを注入
        await injectErrorCollection(page);
        
        // コンソールログの出力
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Console error:', msg.text());
            }
        });
        
        // ページエラーの検出
        page.on('pageerror', error => {
            console.error('Page error:', error.message);
        });
        
        // ゲームページにアクセス
        try {
            await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        } catch (error) {
            console.error('Failed to connect to http://localhost:3000');
            console.error('Make sure the dev server is running with: npm run dev');
            throw error;
        }
        
        // ゲームの初期化を待つ（タイムアウトを延長）
        await page.waitForFunction(() => {
            return window.game && window.game.stateManager;
        }, { timeout: 10000 });
        
        console.log('=== Spring Test (Stable Version) ===');
        
        // ゲーム開始（タイトル画面でSpaceキー）
        await page.keyboard.press('Space');
        
        // PlayStateへの遷移を待つ（test-spring-goal.jsと同じ方法も試す）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const isPlaying = await page.evaluate(() => {
            return window.game?.stateManager?.currentStateName === 'play';
        });
        
        if (!isPlaying) {
            console.log('Game did not transition to play state, waiting more...');
            await page.waitForFunction(() => {
                return window.game?.stateManager?.currentStateName === 'play';
            }, { timeout: 5000 });
        }
        
        console.log('Game started successfully');
        
        // プレイヤーとアイテムの存在を確認
        const gameInitData = await page.evaluate(() => {
            const game = window.game;
            const state = game.stateManager.currentState;
            
            return {
                hasPlayer: !!state.player,
                playerPos: state.player ? { x: state.player.x, y: state.player.y } : null,
                hasSpring: state.items?.some(item => item.constructor.name === 'Spring'),
                hasGoal: state.items?.some(item => item.constructor.name === 'GoalFlag'),
                springPos: state.items?.find(item => item.constructor.name === 'Spring')
                    ? { x: state.items.find(item => item.constructor.name === 'Spring').x, 
                        y: state.items.find(item => item.constructor.name === 'Spring').y }
                    : null
            };
        });
        
        console.log('Game initialization data:', gameInitData);
        
        // Spring機能のテスト（直接的なアプローチ）
        console.log('\n=== Testing Spring Functionality ===');
        
        const springTestResult = await page.evaluate(() => {
            const game = window.game;
            const state = game.stateManager.currentState;
            
            if (!state || !state.player) return { error: 'No game state or player' };
            
            // Springを探す
            const spring = state.items?.find(item => item.constructor.name === 'Spring');
            if (!spring) return { error: 'No spring found' };
            
            // テスト前の状態を記録
            const initialState = {
                playerX: state.player.x,
                playerY: state.player.y,
                playerVelY: state.player.vy,
                springTriggered: spring.triggered
            };
            
            // プレイヤーをSpringの位置に配置
            state.player.x = spring.x + spring.width / 2 - state.player.width / 2;
            state.player.y = spring.y - state.player.height - 10;
            state.player.vy = 5; // 下向きの速度
            
            // 物理システムを数フレーム更新
            for (let i = 0; i < 5; i++) {
                if (game.physicsSystem) {
                    game.physicsSystem.update(16.67);
                }
                
                // Springがトリガーされたらループを抜ける
                if (spring.triggered || state.player.vy < -20) {
                    break;
                }
            }
            
            // テスト後の状態を記録
            const finalState = {
                playerX: state.player.x,
                playerY: state.player.y,
                playerVelY: state.player.vy,
                springTriggered: spring.triggered,
                springCompression: spring.compression
            };
            
            return {
                initial: initialState,
                final: finalState,
                success: finalState.playerVelY < -20 || spring.triggered,
                bouncePower: spring.bouncePower
            };
        });
        
        console.log('Spring test result:', springTestResult);
        
        if (springTestResult.success) {
            console.log('✓ Spring test passed: Player jumped high');
        } else {
            console.log('✗ Spring test failed');
        }
        
        // ゲームの状態をリセット（GoalFlagテストのため）
        await page.reload();
        await page.waitForFunction(() => {
            return window.game && window.game.stateManager;
        }, { timeout: 5000 });
        
        await page.keyboard.press('Space');
        await page.waitForFunction(() => {
            return window.game?.stateManager?.currentStateName === 'play';
        }, { timeout: 5000 });
        
        // GoalFlag機能のテスト
        console.log('\n=== Testing GoalFlag Functionality ===');
        
        const goalTestResult = await page.evaluate(() => {
            const game = window.game;
            const state = game.stateManager.currentState;
            
            if (!state || !state.player) return { error: 'No game state or player' };
            
            // GoalFlagを探す
            const goal = state.items?.find(item => item.constructor.name === 'GoalFlag');
            if (!goal) return { error: 'No goal found' };
            
            // テスト前の状態
            const initialCleared = goal.cleared;
            const initialState = game.stateManager.currentStateName;
            
            // プレイヤーをGoalFlagの位置に配置
            state.player.x = goal.x + 10;
            state.player.y = goal.y;
            
            // checkItemCollisionsを呼び出す
            if (state.checkItemCollisions) {
                state.checkItemCollisions();
            }
            
            // テスト後の状態
            const finalCleared = goal.cleared;
            const finalState = game.stateManager.currentStateName;
            
            return {
                initialCleared,
                finalCleared,
                initialState,
                finalState,
                success: finalCleared === true
            };
        });
        
        console.log('GoalFlag test result:', goalTestResult);
        
        if (goalTestResult.success) {
            console.log('✓ GoalFlag test passed: Stage cleared');
        } else {
            console.log('✗ GoalFlag test failed');
        }
        
        // エラーチェック
        const errors = await page.evaluate(() => {
            return window.pageErrors || [];
        });
        
        console.log('\n=== Test Summary ===');
        console.log('Spring Test:', springTestResult.success ? 'PASS' : 'FAIL');
        console.log('GoalFlag Test:', goalTestResult.success ? 'PASS' : 'FAIL');
        console.log('No Errors:', errors.length === 0 ? 'PASS' : 'FAIL');
        
        // すべてのテストが成功した場合のみ成功
        const allTestsPassed = springTestResult.success && 
                             goalTestResult.success && 
                             errors.length === 0;
        
        if (allTestsPassed) {
            console.log('\n✅ All tests passed!');
        } else {
            console.log('\n❌ Some tests failed');
        }
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// エラーログの収集スクリプトを注入
async function injectErrorCollection(page) {
    await page.evaluateOnNewDocument(() => {
        window.pageErrors = [];
        window.addEventListener('error', (event) => {
            window.pageErrors.push({
                message: event.message,
                source: event.filename,
                line: event.lineno,
                col: event.colno,
                error: event.error ? event.error.stack : null
            });
        });
    });
}

// メイン実行
(async () => {
    try {
        await runStableSpringGoalTest();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();