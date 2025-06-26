/**
 * ヘッドレスブラウザを使わない簡易テスト
 * JavaScriptの実行結果を取得して検証
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

async function testGameLoading() {
    console.log('=== Testing Game Loading ===');
    
    try {
        // index.htmlを取得
        const response = await fetch('http://localhost:3000');
        const html = await response.text();
        
        // 必要なスクリプトが含まれているか確認
        const hasGameScript = html.includes('src/index.js');
        console.log(`✓ Game script included: ${hasGameScript}`);
        
        // Canvas要素の確認
        const hasCanvas = html.includes('<canvas');
        console.log(`✓ Canvas element exists: ${hasCanvas}`);
        
        return hasGameScript && hasCanvas;
    } catch (error) {
        console.error('✗ Failed to load game:', error.message);
        return false;
    }
}

async function testAssetEndpoints() {
    console.log('\n=== Testing Asset Endpoints ===');
    
    const assets = [
        '/src/assets/sprites/player/idle.json',
        '/src/assets/sprites/player/walk1.json'
    ];
    
    let allAccessible = true;
    for (const asset of assets) {
        try {
            const response = await fetch(`http://localhost:3000${asset}`);
            const data = await response.json();
            console.log(`✓ ${asset} - ${data.width}x${data.height}`);
        } catch (error) {
            console.log(`✗ ${asset} - ${error.message}`);
            allAccessible = false;
        }
    }
    
    return allAccessible;
}

async function generateDebugScript() {
    console.log('\n=== Generating Debug Script ===');
    
    const debugScript = `
// Debug script to check game state
// Run this in browser console at http://localhost:3000

function checkGameState() {
    console.group('🎮 Game State Check');
    
    // 1. Basic checks
    console.log('1️⃣ Basic Objects:');
    console.log('  game exists:', typeof window.game !== 'undefined');
    console.log('  current state:', window.game?.stateManager?.currentState?.constructor.name);
    
    // 2. Player checks
    console.log('\\n2️⃣ Player Status:');
    const player = window.game?.stateManager?.currentState?.player;
    if (player) {
        console.log('  position:', { x: player.x, y: player.y });
        console.log('  animation:', player.animState);
        console.log('  sprite key:', player.spriteKey);
        console.log('  velocity:', { vx: player.vx, vy: player.vy });
    } else {
        console.log('  ⚠️  No player found!');
    }
    
    // 3. Renderer checks
    console.log('\\n3️⃣ Renderer Status:');
    const pixelArt = window.game?.pixelArtRenderer;
    if (pixelArt) {
        console.log('  sprites loaded:', pixelArt.sprites.size);
        console.log('  animations loaded:', pixelArt.animations.size);
        console.log('  sprite keys:', Array.from(pixelArt.sprites.keys()));
        console.log('  animation keys:', Array.from(pixelArt.animations.keys()));
    } else {
        console.log('  ⚠️  No PixelArtRenderer found!');
    }
    
    // 4. Asset loader checks
    console.log('\\n4️⃣ Assets Status:');
    const assets = window.game?.assetLoader;
    if (assets) {
        console.log('  total loaded:', assets.loadedAssets.size);
        console.log('  asset keys:', Array.from(assets.loadedAssets.keys()));
    }
    
    console.groupEnd();
}

// Run the check
checkGameState();

// Test player movement
console.log('\\n🕹️  Testing player movement...');
game.stateManager.setState('play');
setTimeout(() => {
    const player = game.stateManager.currentState.player;
    if (player) {
        console.log('Before move:', { x: player.x, animState: player.animState });
        
        // Simulate right key press
        game.inputSystem.keys.right = true;
        setTimeout(() => {
            console.log('After move:', { x: player.x, animState: player.animState });
            game.inputSystem.keys.right = false;
        }, 500);
    }
}, 1000);
`;

    console.log('Debug script generated. Copy and paste into browser console:');
    console.log('----------------------------------------');
    console.log(debugScript);
    console.log('----------------------------------------');
}

// 実行
async function runTests() {
    const results = {
        gameLoading: await testGameLoading(),
        assetEndpoints: await testAssetEndpoints()
    };
    
    await generateDebugScript();
    
    console.log('\n=== Pre-Browser Test Summary ===');
    console.log(`Game Loading: ${results.gameLoading ? 'PASS' : 'FAIL'}`);
    console.log(`Asset Endpoints: ${results.assetEndpoints ? 'PASS' : 'FAIL'}`);
    
    if (Object.values(results).every(r => r)) {
        console.log('\n✅ All automated tests passed!');
        console.log('\n📋 Next steps:');
        console.log('1. Open http://localhost:3000 in your browser');
        console.log('2. Open DevTools Console (F12)');
        console.log('3. Copy and run the debug script above');
        console.log('4. Check for any errors or warnings');
        console.log('5. Try arrow keys and space to test player movement');
    } else {
        console.log('\n❌ Some tests failed. Fix issues before browser testing.');
    }
}

runTests().catch(console.error);