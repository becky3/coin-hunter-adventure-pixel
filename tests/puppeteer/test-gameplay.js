/**
 * ゲームプレイ画面のテスト
 * メニューからゲームを開始してエラーを確認
 */
import puppeteer from 'puppeteer';
import { takeScreenshot } from './utils/screenshot.js';

async function testGameplay() {
    console.log('🎮 Testing gameplay screen...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // エラーとログを収集
        const errors = [];
        const warnings = [];
        const logs = [];
        
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            if (type === 'error') {
                errors.push({
                    text: text,
                    location: msg.location(),
                    stackTrace: msg.stackTrace()
                });
            } else if (type === 'warning') {
                warnings.push(text);
            } else if (type === 'log') {
                logs.push(text);
            }
        });
        
        page.on('pageerror', error => {
            errors.push({
                text: error.message,
                stack: error.stack
            });
        });
        
        // ページ読み込み
        console.log('1. Loading game...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // ゲーム初期化を待つ
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // メニュー画面の状態確認
        const menuState = await page.evaluate(() => {
            return {
                gameExists: typeof window.game !== 'undefined',
                currentState: window.game?.stateManager?.currentState?.constructor.name,
                isMenuState: window.game?.stateManager?.currentState?.constructor.name === 'MenuState'
            };
        });
        
        console.log('2. Menu state:', menuState);
        
        // スタートボタンをクリック（キーボードでも可能）
        console.log('3. Starting game...');
        
        // 方法1: Enterキーでゲーム開始
        await page.keyboard.press('Enter');
        
        // または方法2: スペースキーでも開始できる場合
        // await page.keyboard.press('Space');
        
        // 画面遷移を待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // プレイ状態の確認
        const playState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player;
            
            return {
                currentState: state?.constructor.name,
                isPlayState: state?.constructor.name === 'PlayState',
                player: player ? {
                    exists: true,
                    x: player.x,
                    y: player.y,
                    animState: player.animState,
                    spriteKey: player.spriteKey,
                    hasAssetLoader: !!player.assetLoader,
                    hasInputManager: !!player.inputManager
                } : { exists: false },
                levelData: {
                    hasLevel: !!state?.levelData,
                    levelName: state?.currentLevel,
                    tileMapSize: state?.tileMap?.length || 0
                }
            };
        });
        
        console.log('4. Play state:', JSON.stringify(playState, null, 2));
        
        // プレイヤーの動作テスト
        if (playState.isPlayState && playState.player.exists) {
            console.log('\n5. Testing player controls...');
            
            // 右移動
            await page.keyboard.down('ArrowRight');
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.keyboard.up('ArrowRight');
            
            const afterMove = await page.evaluate(() => {
                const player = window.game.stateManager.currentState.player;
                return { x: player.x, animState: player.animState };
            });
            console.log('   After right move:', afterMove);
            
            // ジャンプ
            await page.keyboard.press('Space');
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const afterJump = await page.evaluate(() => {
                const player = window.game.stateManager.currentState.player;
                return { y: player.y, vy: player.vy, grounded: player.grounded };
            });
            console.log('   After jump:', afterJump);
        }
        
        // スクリーンショット
        await page.screenshot({ path: '../screenshots/test-menu.png' });
        console.log('\n📸 Screenshot saved: test-menu.png (before start)');
        
        await page.screenshot({ path: '../screenshots/test-gameplay.png' });
        console.log('📸 Screenshot saved: test-gameplay.png (after start)');
        
        // エラーレポート
        console.log('\n📊 Error Report:');
        if (errors.length > 0) {
            console.log(`\n❌ ERRORS (${errors.length}):`);
            errors.forEach((error, i) => {
                console.log(`\n${i + 1}. ${error.text}`);
                if (error.location) {
                    console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
                }
                if (error.stack) {
                    console.log(`   Stack:\n${error.stack}`);
                }
            });
        } else {
            console.log('✅ No errors found!');
        }
        
        if (warnings.length > 0) {
            console.log(`\n⚠️  Warnings (${warnings.length}):`);
            warnings.forEach(w => console.log(`  - ${w}`));
        }
        
        // 重要なログを表示
        if (logs.length > 0) {
            console.log('\n📝 Recent logs:');
            logs.slice(-10).forEach(log => console.log(`  - ${log}`));
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testGameplay();