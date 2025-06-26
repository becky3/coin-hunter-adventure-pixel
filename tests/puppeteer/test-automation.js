/**
 * 自動テストスクリプト
 * Puppeteerを使用してゲームの動作を完全自動検証
 */
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// テスト結果を格納
const testResults = {
    passed: [],
    failed: [],
    warnings: []
};

function logTest(name, passed, details = '') {
    if (passed) {
        console.log(`✅ ${name}`);
        testResults.passed.push({ name, details });
    } else {
        console.log(`❌ ${name}: ${details}`);
        testResults.failed.push({ name, details });
    }
}

function logWarning(message) {
    console.log(`⚠️  ${message}`);
    testResults.warnings.push(message);
}

async function runTests() {
    console.log('🚀 Starting Puppeteer automated tests...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // デバッグ用にスローモーションを追加（オプション）
        // slowMo: 50
    });
    
    try {
        const page = await browser.newPage();
        
        // ビューポートを設定
        await page.setViewport({ width: 1280, height: 720 });
        
        // コンソールログを収集
        const consoleLogs = [];
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            consoleLogs.push({ type, text });
            
            // エラーは即座に表示
            if (type === 'error') {
                console.error('  Console Error:', text);
            }
        });
        
        // ページエラーを収集
        const pageErrors = [];
        page.on('pageerror', error => {
            pageErrors.push(error.message);
            console.error('  Page Error:', error.message);
        });
        
        // テスト1: ページの読み込み
        console.log('📄 Testing page load...');
        try {
            await page.goto('http://localhost:3000', { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            logTest('Page loaded', true);
        } catch (error) {
            logTest('Page loaded', false, error.message);
            throw new Error('Failed to load page - cannot continue tests');
        }
        
        // ゲームの初期化を待つ
        await page.waitForTimeout(3000);
        
        // テスト2: ゲームオブジェクトの確認
        console.log('\n🎮 Testing game initialization...');
        const gameState = await page.evaluate(() => {
            if (typeof window.game === 'undefined') {
                return { exists: false };
            }
            
            return {
                exists: true,
                hasRenderer: !!window.game.renderer,
                hasPixelArtRenderer: !!window.game.pixelArtRenderer,
                hasInputSystem: !!window.game.inputSystem,
                hasStateManager: !!window.game.stateManager,
                currentState: window.game.stateManager?.currentState?.constructor.name,
                isRunning: window.game.running
            };
        });
        
        logTest('Game object exists', gameState.exists);
        if (gameState.exists) {
            logTest('Renderer initialized', gameState.hasRenderer);
            logTest('PixelArtRenderer initialized', gameState.hasPixelArtRenderer);
            logTest('InputSystem initialized', gameState.hasInputSystem);
            logTest('StateManager initialized', gameState.hasStateManager);
            logTest('Game is running', gameState.isRunning);
            console.log(`  Current state: ${gameState.currentState}`);
        }
        
        // テスト3: アセットの読み込み確認
        console.log('\n📦 Testing asset loading...');
        const assetState = await page.evaluate(() => {
            if (!window.game?.assetLoader) {
                return { loaderExists: false };
            }
            
            const loader = window.game.assetLoader;
            const loadedKeys = Array.from(loader.loadedAssets.keys());
            
            // PixelArtRendererのアセット確認
            let sprites = [];
            let animations = [];
            if (window.game.pixelArtRenderer) {
                sprites = Array.from(window.game.pixelArtRenderer.sprites.keys());
                animations = Array.from(window.game.pixelArtRenderer.animations.keys());
            }
            
            return {
                loaderExists: true,
                totalLoaded: loadedKeys.length,
                loadedAssets: loadedKeys,
                sprites: sprites,
                animations: animations
            };
        });
        
        logTest('AssetLoader exists', assetState.loaderExists);
        if (assetState.loaderExists) {
            logTest('Assets loaded', assetState.totalLoaded > 0, `Total: ${assetState.totalLoaded}`);
            console.log('  Loaded assets:', assetState.loadedAssets);
            console.log('  Sprites:', assetState.sprites);
            console.log('  Animations:', assetState.animations);
            
            // 必須アセットの確認
            const requiredSprites = ['player/idle'];
            const requiredAnimations = ['player/walk_anim', 'player/jump_anim'];
            
            requiredSprites.forEach(sprite => {
                logTest(`Sprite '${sprite}' loaded`, assetState.sprites.includes(sprite));
            });
            
            requiredAnimations.forEach(anim => {
                logTest(`Animation '${anim}' loaded`, assetState.animations.includes(anim));
            });
        }
        
        // テスト4: プレイ状態への遷移
        console.log('\n🎯 Testing game state transition...');
        await page.evaluate(() => {
            if (window.game?.stateManager) {
                window.game.stateManager.setState('play');
            }
        });
        await page.waitForTimeout(1000);
        
        const playState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.constructor.name !== 'PlayState') {
                return { inPlayState: false };
            }
            
            return {
                inPlayState: true,
                hasPlayer: !!state.player,
                playerInfo: state.player ? {
                    x: state.player.x,
                    y: state.player.y,
                    width: state.player.width,
                    height: state.player.height,
                    animState: state.player.animState,
                    spriteKey: state.player.spriteKey,
                    visible: state.player.visible,
                    hasAssetLoader: !!state.player.assetLoader
                } : null
            };
        });
        
        logTest('Transitioned to PlayState', playState.inPlayState);
        logTest('Player exists', playState.hasPlayer);
        if (playState.playerInfo) {
            console.log('  Player info:', playState.playerInfo);
            logTest('Player has AssetLoader', playState.playerInfo.hasAssetLoader);
        }
        
        // テスト5: プレイヤーの描画確認
        console.log('\n🎨 Testing player rendering...');
        if (playState.hasPlayer) {
            // スクリーンショットを撮影（描画前）
            await page.screenshot({ path: '../screenshots/test-before-render.png' });
            
            // 描画が行われているか確認
            const renderCheck = await page.evaluate(() => {
                // デバッグモードを有効化
                window.game.debug = true;
                
                // 手動で1フレーム描画を実行
                const renderer = window.game.renderer;
                const state = window.game.stateManager.currentState;
                if (renderer && state && state.render) {
                    state.render(renderer);
                }
                
                // プレイヤーのレンダリング情報を取得
                const player = state.player;
                if (player && player._firstRenderLogged) {
                    return {
                        rendered: true,
                        hasPixelArtRenderer: !!renderer.pixelArtRenderer,
                        spriteKey: player.spriteKey
                    };
                }
                
                return { rendered: false };
            });
            
            logTest('Player render attempted', renderCheck.rendered || renderCheck.hasPixelArtRenderer);
            if (renderCheck.spriteKey) {
                console.log(`  Using sprite key: ${renderCheck.spriteKey}`);
            }
        }
        
        // テスト6: 入力シミュレーション
        console.log('\n🎮 Testing player controls...');
        if (playState.hasPlayer) {
            // 初期位置を記録
            const initialPos = await page.evaluate(() => {
                const player = window.game.stateManager.currentState.player;
                return { x: player.x, y: player.y, animState: player.animState };
            });
            
            // 右キーを押す
            await page.keyboard.down('ArrowRight');
            await page.waitForTimeout(500);
            
            const afterRight = await page.evaluate(() => {
                const player = window.game.stateManager.currentState.player;
                return { x: player.x, y: player.y, animState: player.animState };
            });
            
            await page.keyboard.up('ArrowRight');
            
            logTest('Player moves right', afterRight.x > initialPos.x, 
                `Moved from ${initialPos.x} to ${afterRight.x}`);
            logTest('Walk animation activated', afterRight.animState === 'walk',
                `Animation: ${afterRight.animState}`);
            
            // ジャンプテスト
            await page.keyboard.press('Space');
            await page.waitForTimeout(100);
            
            const afterJump = await page.evaluate(() => {
                const player = window.game.stateManager.currentState.player;
                return { 
                    y: player.y, 
                    vy: player.vy,
                    animState: player.animState,
                    grounded: player.grounded
                };
            });
            
            logTest('Player jumps', afterJump.vy < 0 || afterJump.y < afterRight.y,
                `Y velocity: ${afterJump.vy}`);
            
            // 最終スクリーンショット
            await page.screenshot({ path: '../screenshots/test-final.png' });
            console.log('  Screenshots saved: test-before-render.png, test-final.png');
        }
        
        // テスト7: エラーチェック
        console.log('\n⚠️  Checking for errors...');
        const errorCount = pageErrors.length + consoleLogs.filter(log => log.type === 'error').length;
        logTest('No page errors', pageErrors.length === 0, `Found ${pageErrors.length} errors`);
        logTest('No console errors', consoleLogs.filter(log => log.type === 'error').length === 0);
        
        // 警告をチェック
        const warnings = consoleLogs.filter(log => log.type === 'warning');
        if (warnings.length > 0) {
            logWarning(`Found ${warnings.length} console warnings`);
            warnings.slice(0, 5).forEach(w => console.log(`  - ${w.text}`));
        }
        
        // テスト結果のサマリー
        console.log('\n📊 Test Summary:');
        console.log(`  ✅ Passed: ${testResults.passed.length}`);
        console.log(`  ❌ Failed: ${testResults.failed.length}`);
        console.log(`  ⚠️  Warnings: ${testResults.warnings.length}`);
        
        // 詳細レポートを生成
        await generateDetailedReport(testResults, consoleLogs);
        
        return testResults.failed.length === 0;
        
    } catch (error) {
        console.error('\n💥 Test execution error:', error);
        return false;
    } finally {
        await browser.close();
    }
}

async function generateDetailedReport(results, consoleLogs) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            passed: results.passed.length,
            failed: results.failed.length,
            warnings: results.warnings.length
        },
        details: results,
        consoleLogs: consoleLogs.slice(-50) // 最後の50件のログ
    };
    
    await fs.writeFile(
        'test-automation-report.json',
        JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to test-automation-report.json');
}

// メイン実行
console.log('🎮 Coin Hunter Adventure - Automated Test Suite\n');

runTests()
    .then(success => {
        console.log('\n' + (success ? '✅ All tests passed!' : '❌ Some tests failed!'));
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });