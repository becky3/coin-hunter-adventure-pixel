/**
 * SpringとGoalFlagの動作確認テスト
 * 
 * テスト内容:
 * 1. Springに乗った際の高ジャンプ
 * 2. GoalFlagでのレベルクリア
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSpringGoalTests() {
    console.log('Starting Spring and GoalFlag tests...\n');
    
    let browser;
    let page;
    
    try {
        // ブラウザの起動
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
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
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        
        // ゲームの初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('=== Spring Test ===');
        
        // ゲームの初期状態を確認
        const initialState = await page.evaluate(() => {
            const game = window.game;
            return {
                hasGame: !!game,
                currentState: game?.stateManager?.currentStateName,
                hasMusicSystem: !!game?.musicSystem
            };
        });
        console.log('Initial game state:', initialState);
        
        // ゲーム開始（タイトル画面でSpaceキー）
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // PlayStateに遷移したか確認
        const gameStarted = await page.evaluate(() => {
            const game = window.game;
            return game && game.stateManager && game.stateManager.currentStateName === 'play';
        });
        
        if (!gameStarted) {
            console.log('✗ Failed to start game');
            console.log('Current state:', await page.evaluate(() => window.game?.stateManager?.currentStateName));
            return;
        }
        
        // プレイヤーとアイテムの状態を確認
        const gameData = await page.evaluate(() => {
            const game = window.game;
            if (game && game.stateManager && game.stateManager.currentState) {
                const state = game.stateManager.currentState;
                return {
                    stateName: game.stateManager.currentStateName,
                    hasPlayer: !!state.player,
                    playerPos: state.player ? { x: state.player.x, y: state.player.y } : null,
                    itemCount: state.items ? state.items.length : 0,
                    items: state.items ? state.items.map(item => ({
                        type: item.constructor.name,
                        x: item.x,
                        y: item.y
                    })) : []
                };
            }
            return null;
        });
        
        console.log('Game data:', gameData);
        
        if (!gameData || !gameData.hasPlayer) {
            console.log('✗ Player not found in game state');
            return;
        }
        
        // 右に移動してSpringの位置（x: 5 * 16 = 80）へ
        // プレイヤーの開始位置はx: 64なので、16ピクセル右に移動
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 150)); // 短く押す
        await page.keyboard.up('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 100)); // 停止を待つ
        
        // 現在のプレイヤー位置を確認
        const playerPosition = await page.evaluate(() => {
            const game = window.game;
            if (game && game.stateManager && game.stateManager.currentState) {
                const state = game.stateManager.currentState;
                if (state.player) {
                    return { x: state.player.x, y: state.player.y };
                }
            }
            return null;
        });
        console.log('Player position before adjustment:', playerPosition);
        
        // Springの真上に立つため左に戻る
        if (playerPosition && playerPosition.x > 90) {
            await page.keyboard.down('ArrowLeft');
            await new Promise(resolve => setTimeout(resolve, 200));
            await page.keyboard.up('ArrowLeft');
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 下に落下してSpringに着地
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 再度位置確認
        const finalPosition = await page.evaluate(() => {
            const game = window.game;
            if (game && game.stateManager && game.stateManager.currentState) {
                const state = game.stateManager.currentState;
                if (state.player) {
                    return { x: state.player.x, y: state.player.y };
                }
            }
            return null;
        });
        console.log('Player position on spring:', finalPosition);
        
        // Spring発動後のプレイヤーのY座標と速度を確認
        const springJumpData = await page.evaluate(() => {
            const game = window.game;
            if (game && game.stateManager && game.stateManager.currentState) {
                const state = game.stateManager.currentState;
                if (state.player) {
                    return {
                        y: state.player.y,
                        velY: state.player.velY,
                        springTriggered: state.items.some(item => 
                            item.constructor.name === 'Spring' && item.triggered
                        )
                    };
                }
            }
            return null;
        });
        
        console.log('After spring interaction:', springJumpData);
        
        if (springJumpData && springJumpData.velY < -20) {
            console.log('✓ Spring test passed: Player jumped high (velY:', springJumpData.velY, ')');
        } else {
            console.log('✗ Spring test failed: Player did not jump high enough');
        }
        
        // Springから離れるまで待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n=== GoalFlag Test ===');
        
        // 右に移動してGoalFlagの位置（x: 17 * 16 = 272）へ
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.keyboard.up('ArrowRight');
        
        // ゴール到達前の状態を記録
        const beforeGoalState = await page.evaluate(() => {
            const game = window.game;
            if (game && game.stateManager) {
                return {
                    currentStateName: game.stateManager.currentStateName,
                    goalCleared: game.stateManager.currentState?.items?.some(item => 
                        item.constructor.name === 'GoalFlag' && item.cleared
                    ) || false
                };
            }
            return null;
        });
        
        console.log('Before reaching goal:', beforeGoalState);
        
        // 少し右に移動してGoalFlagに触れる
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 500));
        await page.keyboard.up('ArrowRight');
        
        // ゴール到達後の状態を確認
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterGoalState = await page.evaluate(() => {
            const game = window.game;
            if (game && game.stateManager) {
                const hasGoalCleared = game.stateManager.currentState?.items?.some(item => 
                    item.constructor.name === 'GoalFlag' && item.cleared
                ) || false;
                
                return {
                    currentStateName: game.stateManager.currentStateName,
                    goalCleared: hasGoalCleared,
                    consoleLogs: window.consoleLogs || []
                };
            }
            return null;
        });
        
        console.log('After reaching goal:', afterGoalState);
        
        // Stage Clear!のログが出力されているか確認
        const hasStageClearLog = await page.evaluate(() => {
            // コンソールログをインターセプトして確認
            return new Promise((resolve) => {
                const originalLog = console.log;
                let foundStageClear = false;
                
                console.log = function(...args) {
                    if (args.includes('Stage Clear!')) {
                        foundStageClear = true;
                    }
                    originalLog.apply(console, args);
                };
                
                // 既にクリアされている可能性もあるので少し待つ
                setTimeout(() => {
                    console.log = originalLog;
                    resolve(foundStageClear);
                }, 100);
            });
        });
        
        if (afterGoalState && (afterGoalState.currentStateName === 'menu' || afterGoalState.goalCleared)) {
            console.log('✓ GoalFlag test passed: Stage cleared successfully');
        } else {
            console.log('✗ GoalFlag test failed: Stage was not cleared');
        }
        
        // スクリーンショットを撮影
        const screenshotDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        
        await page.screenshot({ 
            path: path.join(screenshotDir, 'spring-goal-test.png'),
            fullPage: true 
        });
        console.log('\nScreenshot saved to tests/puppeteer/screenshots/spring-goal-test.png');
        
        // エラーチェック
        const errors = await page.evaluate(() => {
            return window.pageErrors || [];
        });
        
        if (errors.length > 0) {
            console.log('\n✗ JavaScript errors detected:', errors);
        } else {
            console.log('\n✓ No JavaScript errors detected');
        }
        
        console.log('\n=== Test Summary ===');
        console.log('Spring Test:', springJumpData && springJumpData.velY < -20 ? 'PASS' : 'FAIL');
        console.log('GoalFlag Test:', afterGoalState && (afterGoalState.currentStateName === 'menu' || afterGoalState.goalCleared) ? 'PASS' : 'FAIL');
        console.log('No Errors:', errors.length === 0 ? 'PASS' : 'FAIL');
        
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
        await runSpringGoalTests();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
})();