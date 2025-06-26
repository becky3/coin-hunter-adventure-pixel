/**
 * 軽量版自動テストスクリプト
 * WSL環境でも動作する簡易版
 */
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// テスト結果
const results = {
    passed: [],
    failed: [],
    warnings: []
};

function log(status, message, details = '') {
    const symbols = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
    console.log(`${symbols[status]} ${message}${details ? ': ' + details : ''}`);
    
    if (status === 'pass') results.passed.push({ message, details });
    else if (status === 'fail') results.failed.push({ message, details });
    else if (status === 'warn') results.warnings.push({ message, details });
}

async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function testServerHealth() {
    console.log('\n🌐 Server Health Check');
    try {
        const response = await fetchWithTimeout('http://localhost:3000');
        log('pass', 'Server is running', `Status: ${response.status}`);
        return true;
    } catch (error) {
        log('fail', 'Server not responding', error.message);
        return false;
    }
}

async function testAssetLoading() {
    console.log('\n📦 Asset Loading Check');
    
    const criticalAssets = [
        { path: '/src/assets/sprites/player/idle.json', type: 'sprite' },
        { path: '/src/assets/sprites/player/walk1.json', type: 'sprite' },
        { path: '/src/assets/sprites/player/jump.json', type: 'sprite' },
        { path: '/src/index.js', type: 'script' },
        { path: '/src/core/Game.js', type: 'script' }
    ];
    
    let allLoaded = true;
    
    for (const asset of criticalAssets) {
        try {
            const response = await fetchWithTimeout(`http://localhost:3000${asset.path}`);
            if (response.ok) {
                log('pass', `${asset.type}: ${asset.path}`);
                
                // スプライトの場合、データ構造も確認
                if (asset.type === 'sprite') {
                    const data = await response.json();
                    if (!data.data || !data.width || !data.height) {
                        log('warn', 'Invalid sprite structure', asset.path);
                    }
                }
            } else {
                log('fail', `${asset.type}: ${asset.path}`, `Status: ${response.status}`);
                allLoaded = false;
            }
        } catch (error) {
            log('fail', `${asset.type}: ${asset.path}`, error.message);
            allLoaded = false;
        }
    }
    
    return allLoaded;
}

async function testGameInitialization() {
    console.log('\n🎮 Game Initialization Test');
    
    // テスト用HTMLを作成
    const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Automated Test</title>
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <div id="test-output"></div>
    <script type="module">
        import { Game } from './src/core/Game.js';
        import { GAME_RESOLUTION, DISPLAY } from './src/constants/gameConstants.js';
        
        const output = document.getElementById('test-output');
        const results = {};
        
        try {
            // Canvas setup
            const canvas = document.getElementById('gameCanvas');
            canvas.width = GAME_RESOLUTION.WIDTH * DISPLAY.SCALE;
            canvas.height = GAME_RESOLUTION.HEIGHT * DISPLAY.SCALE;
            
            // Game initialization
            window.game = new Game(canvas);
            results.gameCreated = true;
            
            const initialized = await game.initialize();
            results.initialized = initialized;
            
            // Check components
            results.components = {
                renderer: !!game.renderer,
                pixelArtRenderer: !!game.pixelArtRenderer,
                inputSystem: !!game.inputSystem,
                stateManager: !!game.stateManager,
                assetLoader: !!game.assetLoader
            };
            
            // Check assets
            if (game.assetLoader) {
                results.assetsLoaded = game.assetLoader.loadedAssets.size;
            }
            
            // Check sprites
            if (game.pixelArtRenderer) {
                results.sprites = Array.from(game.pixelArtRenderer.sprites.keys());
                results.animations = Array.from(game.pixelArtRenderer.animations.keys());
            }
            
            // Switch to play state
            if (game.stateManager) {
                game.stateManager.setState('play');
                setTimeout(() => {
                    const state = game.stateManager.currentState;
                    results.currentState = state?.constructor.name;
                    results.hasPlayer = !!state?.player;
                    
                    if (state?.player) {
                        results.playerInfo = {
                            x: state.player.x,
                            y: state.player.y,
                            animState: state.player.animState,
                            spriteKey: state.player.spriteKey
                        };
                    }
                    
                    output.textContent = JSON.stringify(results);
                }, 1000);
            }
            
        } catch (error) {
            results.error = error.message;
            output.textContent = JSON.stringify(results);
        }
    </script>
</body>
</html>`;
    
    // テストHTMLを保存
    await fs.writeFile('test-runner.html', testHtml);
    
    // curl経由で実行結果を取得（WSLでも動作）
    console.log('  Running initialization test...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 待機
    
    try {
        // テストページにアクセス
        const response = await fetchWithTimeout('http://localhost:3000/test-runner.html', 10000);
        if (response.ok) {
            log('pass', 'Test page loaded');
            
            // 実際のブラウザでの実行結果は取得できないため、
            // 代わりに必要なファイルの存在確認で代替
            log('info', 'Manual verification required', 'Open http://localhost:3000/test-runner.html');
        } else {
            log('fail', 'Test page failed to load');
        }
    } catch (error) {
        log('fail', 'Test execution failed', error.message);
    }
}

async function generateTestInstructions() {
    console.log('\n📋 Manual Test Instructions');
    
    const instructions = `
## Manual Browser Test Steps

1. Open http://localhost:3000 in Chrome
2. Open DevTools (F12) → Console
3. Run these commands:

\`\`\`javascript
// Check game initialization
console.log('Game exists:', !!window.game);
console.log('State:', game.stateManager?.currentState?.constructor.name);

// Check player
game.stateManager.setState('play');
setTimeout(() => {
    const player = game.stateManager.currentState?.player;
    console.log('Player:', player ? {
        pos: { x: player.x, y: player.y },
        anim: player.animState,
        sprite: player.spriteKey
    } : 'Not found');
    
    // Check renderer
    console.log('Sprites:', Array.from(game.pixelArtRenderer?.sprites.keys() || []));
    console.log('Animations:', Array.from(game.pixelArtRenderer?.animations.keys() || []));
}, 1000);
\`\`\`

4. Test controls:
   - Arrow keys → Player should move
   - Space → Player should jump
   
5. Expected results:
   - Player appears as pixel art (not red square)
   - Animations work (walk, jump, idle)
   - No console errors
`;
    
    await fs.writeFile('MANUAL_TEST_GUIDE.md', instructions);
    log('info', 'Manual test guide created', 'MANUAL_TEST_GUIDE.md');
}

async function runAllTests() {
    console.log('🚀 Coin Hunter Adventure - Automated Test Suite (Lite)\n');
    console.log('Running tests compatible with WSL environment...');
    
    // サーバーチェック
    const serverOk = await testServerHealth();
    if (!serverOk) {
        console.log('\n❌ Server not running. Start with: npm run dev');
        return false;
    }
    
    // アセットチェック
    await testAssetLoading();
    
    // 初期化テスト
    await testGameInitialization();
    
    // 手動テストガイド生成
    await generateTestInstructions();
    
    // 結果サマリー
    console.log('\n📊 Test Summary:');
    console.log(`  ✅ Passed: ${results.passed.length}`);
    console.log(`  ❌ Failed: ${results.failed.length}`);
    console.log(`  ⚠️  Warnings: ${results.warnings.length}`);
    
    // 詳細レポート
    const report = {
        timestamp: new Date().toISOString(),
        environment: 'WSL',
        summary: {
            passed: results.passed.length,
            failed: results.failed.length,
            warnings: results.warnings.length
        },
        details: results,
        nextSteps: [
            'Open http://localhost:3000 in browser',
            'Follow MANUAL_TEST_GUIDE.md for visual verification',
            'Check test-runner.html for initialization test'
        ]
    };
    
    await fs.writeFile('test-report-lite.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to test-report-lite.json');
    
    return results.failed.length === 0;
}

// 実行
runAllTests()
    .then(success => {
        console.log('\n' + (success ? '✅ Automated tests passed!' : '❌ Some tests failed!'));
        console.log('\n👉 Next: Follow MANUAL_TEST_GUIDE.md for browser verification');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });