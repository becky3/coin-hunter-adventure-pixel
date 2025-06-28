/**
 * SpringとGoalFlagの見た目を確認するテスト
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureGameplay() {
    console.log('Capturing Spring and GoalFlag visuals...\n');
    
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // ゲームページにアクセス
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始（メニューでEnterキーを押す）
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム状態を確認
        const gameState = await page.evaluate(() => {
            const game = window.game;
            return {
                currentState: game?.stateManager?.currentStateName,
                hasPlayState: game?.stateManager?.currentState?.constructor?.name
            };
        });
        console.log('Game state after Enter:', gameState);
        
        // レベルが読み込まれるまで待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 初期画面のスクリーンショット
        await page.screenshot({ 
            path: path.join(__dirname, 'screenshots', 'spring-visual.png'),
            fullPage: false 
        });
        
        // デバッグ：ゴール付近にワープ
        await page.evaluate(() => {
            if (window.debugWarp) {
                // ゴールは17*16=272, 12*16=192の位置
                // 少し左の位置にワープして全体が見えるようにする
                window.debugWarp(240, 180);
            } else {
                console.warn('debugWarp function not available');
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500)); // 描画を待つ
        
        // ゴール付近のスクリーンショット
        await page.screenshot({ 
            path: path.join(__dirname, 'screenshots', 'goal-visual.png'),
            fullPage: false 
        });
        
        // スプライトの読み込み状態を確認
        const spriteStatus = await page.evaluate(() => {
            const game = window.game;
            if (!game || !game.assetLoader) {
                return { error: 'No asset loader' };
            }
            
            const assetLoader = game.assetLoader;
            const pixelArtRenderer = game.pixelArtRenderer;
            
            // SpringとGoalFlagがどのように描画されているか確認
            const state = game.stateManager?.currentState;
            const spring = state?.items?.find(item => item.constructor.name === 'Spring');
            const hasSprite = spring && game.renderer.assetLoader && 
                            game.renderer.assetLoader.hasSprite && 
                            game.renderer.assetLoader.hasSprite('terrain/spring');
            
            return {
                hasSpringSprite: assetLoader.loadedAssets.has('terrain/spring'),
                hasGoalSprite: assetLoader.loadedAssets.has('terrain/goal_flag'),
                pixelArtHasSpring: pixelArtRenderer?.sprites?.has('terrain/spring'),
                pixelArtHasGoal: pixelArtRenderer?.sprites?.has('terrain/goal_flag'),
                springHasSprite: hasSprite,
                loadedSprites: Array.from(assetLoader.loadedAssets.keys())
            };
        });
        
        console.log('Sprite loading status:', spriteStatus);
        
        // アイテムの位置と状態を確認
        const itemStatus = await page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            
            if (!state) return { error: 'No game state' };
            
            const spring = state.items?.find(item => item.constructor.name === 'Spring');
            const goal = state.items?.find(item => item.constructor.name === 'GoalFlag');
            
            return {
                spring: spring ? {
                    x: spring.x,
                    y: spring.y,
                    width: spring.width,
                    height: spring.height
                } : null,
                goal: goal ? {
                    x: goal.x,
                    y: goal.y,
                    width: goal.width,
                    height: goal.height
                } : null
            };
        });
        
        console.log('Item positions:', itemStatus);
        
        console.log('\nScreenshots saved:');
        console.log('- tests/puppeteer/screenshots/spring-visual.png (Spring area)');
        console.log('- tests/puppeteer/screenshots/goal-visual.png (Goal area)');
        console.log('Please check the screenshots to verify sprite rendering.');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 実行
captureGameplay().catch(console.error);