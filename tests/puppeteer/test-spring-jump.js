/**
 * SpringとGoalFlagの動作確認テスト
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSpringJump() {
    console.log('Testing Spring jump power...\n');
    
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
        
        // ゲーム開始
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // スプリングに移動
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.keyboard.up('ArrowRight');
        
        // スプリング手前で位置を記録
        const beforeJump = await page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            const player = state?.player;
            return player ? { y: player.y, vy: player.vy } : null;
        });
        
        console.log('Before jump:', beforeJump);
        
        // ジャンプしてスプリングに乗る
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // スプリング発動後の状態を確認
        const afterSpring = await page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            const player = state?.player;
            const spring = state?.items?.find(item => item.constructor.name === 'Spring');
            return {
                player: player ? { y: player.y, vy: player.vy } : null,
                spring: spring ? { triggered: spring.triggered, compression: spring.compression } : null
            };
        });
        
        console.log('After spring:', afterSpring);
        
        // ジャンプの最高点まで待つ
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const maxHeight = await page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            const player = state?.player;
            return player ? player.y : null;
        });
        
        console.log('Max height reached:', maxHeight);
        
        // スクリーンショットを撮る
        await page.screenshot({ 
            path: path.join(__dirname, 'screenshots', 'spring-jump-height.png'),
            fullPage: false 
        });
        
        // ゴールエリアにワープしてスクリーンショット
        await page.evaluate(() => {
            if (window.debugWarp) {
                window.debugWarp(260, 160);
            }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await page.screenshot({ 
            path: path.join(__dirname, 'screenshots', 'goal-area.png'),
            fullPage: false 
        });
        
        console.log('\nScreenshots saved:');
        console.log('- tests/puppeteer/screenshots/spring-jump-height.png');
        console.log('- tests/puppeteer/screenshots/goal-area.png');
        
        // Jump height analysis
        if (beforeJump && afterSpring.player) {
            const jumpVelocity = afterSpring.player.vy;
            console.log(`\nSpring jump velocity: ${jumpVelocity}`);
            console.log('Normal jump velocity: -10');
            console.log(`Spring power ratio: ${Math.abs(jumpVelocity / 10).toFixed(1)}x`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 実行
testSpringJump().catch(console.error);