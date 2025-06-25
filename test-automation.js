/**
 * 自動テストスクリプト
 * Node.jsで実行してゲームの動作を検証
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
    console.log('Starting automated tests...');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // コンソールログを収集
        const logs = [];
        page.on('console', msg => {
            logs.push({
                type: msg.type(),
                text: msg.text()
            });
        });
        
        // エラーを収集
        const errors = [];
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        // ローカルサーバーにアクセス
        console.log('Navigating to http://localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        
        // ゲームの初期化を待つ
        await page.waitForTimeout(2000);
        
        // テスト1: ゲームオブジェクトの存在確認
        const gameExists = await page.evaluate(() => {
            return typeof window.game !== 'undefined';
        });
        console.log('✓ Game object exists:', gameExists);
        
        // テスト2: プレイヤーの存在確認
        const playerInfo = await page.evaluate(() => {
            if (window.game && window.game.stateManager.currentState) {
                const state = window.game.stateManager.currentState;
                if (state.player) {
                    return {
                        exists: true,
                        x: state.player.x,
                        y: state.player.y,
                        animState: state.player.animState,
                        spriteKey: state.player.spriteKey
                    };
                }
            }
            return { exists: false };
        });
        console.log('✓ Player info:', playerInfo);
        
        // テスト3: レンダラーの確認
        const rendererInfo = await page.evaluate(() => {
            if (window.game) {
                return {
                    pixelRenderer: !!window.game.renderer,
                    pixelArtRenderer: !!window.game.pixelArtRenderer,
                    hasSprites: window.game.pixelArtRenderer ? 
                        window.game.pixelArtRenderer.sprites.size : 0,
                    hasAnimations: window.game.pixelArtRenderer ? 
                        window.game.pixelArtRenderer.animations.size : 0
                };
            }
            return null;
        });
        console.log('✓ Renderer info:', rendererInfo);
        
        // テスト4: アセットの読み込み確認
        const assetInfo = await page.evaluate(() => {
            if (window.game && window.game.assetLoader) {
                const loaded = Array.from(window.game.assetLoader.loadedAssets.keys());
                return {
                    totalLoaded: loaded.length,
                    assets: loaded
                };
            }
            return null;
        });
        console.log('✓ Loaded assets:', assetInfo);
        
        // テスト5: キー入力シミュレーション
        console.log('\nSimulating key presses...');
        
        // 右キー押下
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(500);
        const afterRight = await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            return state.player ? {
                x: state.player.x,
                animState: state.player.animState,
                vx: state.player.vx
            } : null;
        });
        await page.keyboard.up('ArrowRight');
        console.log('✓ After right key:', afterRight);
        
        // スペースキー（ジャンプ）
        await page.keyboard.press('Space');
        await page.waitForTimeout(100);
        const afterJump = await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            return state.player ? {
                y: state.player.y,
                animState: state.player.animState,
                vy: state.player.vy,
                grounded: state.player.grounded
            } : null;
        });
        console.log('✓ After jump:', afterJump);
        
        // スクリーンショット
        await page.screenshot({ path: 'test-screenshot.png' });
        console.log('✓ Screenshot saved as test-screenshot.png');
        
        // エラーチェック
        console.log('\n=== Test Results ===');
        console.log('Errors:', errors.length === 0 ? 'None' : errors);
        console.log('Console warnings:', logs.filter(l => l.type === 'warning').map(l => l.text));
        
        return {
            success: errors.length === 0 && gameExists && playerInfo.exists,
            errors,
            logs
        };
        
    } finally {
        await browser.close();
    }
}

// 実行
runTests()
    .then(result => {
        console.log('\nTest completed:', result.success ? 'SUCCESS' : 'FAILED');
        process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test error:', error);
        process.exit(1);
    });