/**
 * シンプルな動作確認スクリプト
 * curlとNode.jsだけで基本的な確認を行う
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

async function checkServerHealth() {
    console.log('=== Server Health Check ===');
    try {
        const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000');
        console.log(`Server status code: ${stdout}`);
        return stdout === '200';
    } catch (error) {
        console.error('Server not responding:', error.message);
        return false;
    }
}

async function checkAssetFiles() {
    console.log('\n=== Asset Files Check ===');
    const requiredFiles = [
        'src/assets/sprites/player/idle.json',
        'src/assets/sprites/player/walk1.json',
        'src/assets/sprites/player/walk2.json',
        'src/assets/sprites/player/walk3.json',
        'src/assets/sprites/player/walk4.json',
        'src/assets/sprites/player/jump.json',
        'src/assets/sprites/player/jump2.json'
    ];
    
    let allExist = true;
    for (const file of requiredFiles) {
        try {
            await fs.access(file);
            console.log(`✓ ${file}`);
        } catch {
            console.log(`✗ ${file} - MISSING`);
            allExist = false;
        }
    }
    return allExist;
}

async function validateSpriteData() {
    console.log('\n=== Sprite Data Validation ===');
    try {
        const idleData = JSON.parse(await fs.readFile('src/assets/sprites/player/idle.json', 'utf8'));
        console.log(`✓ idle.json: ${idleData.width}x${idleData.height}, ${idleData.data.length} rows`);
        
        // データ構造の検証
        if (idleData.data && idleData.data.length === idleData.height) {
            console.log('✓ Sprite data structure is valid');
            return true;
        } else {
            console.log('✗ Invalid sprite data structure');
            return false;
        }
    } catch (error) {
        console.error('✗ Failed to validate sprite data:', error.message);
        return false;
    }
}

async function checkGameFiles() {
    console.log('\n=== Core Game Files Check ===');
    const coreFiles = [
        'src/core/Game.js',
        'src/entities/Player.js',
        'src/states/PlayState.js',
        'src/utils/pixelArt.ts',
        'src/assets/AssetLoader.ts'
    ];
    
    let allValid = true;
    for (const file of coreFiles) {
        try {
            const content = await fs.readFile(file, 'utf8');
            const lines = content.split('\n').length;
            console.log(`✓ ${file} (${lines} lines)`);
            
            // 基本的な構文チェック
            if (file.endsWith('.js')) {
                if (!content.includes('export')) {
                    console.log(`  ⚠ Warning: No exports found`);
                }
            }
        } catch (error) {
            console.log(`✗ ${file} - ${error.message}`);
            allValid = false;
        }
    }
    return allValid;
}

async function generateTestReport() {
    console.log('\n=== Generating Test HTML ===');
    
    const testHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Render Test Report</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
        .test { margin: 20px 0; padding: 10px; border: 1px solid #444; }
        .pass { border-color: #0f0; }
        .fail { border-color: #f00; }
        pre { background: #222; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Player Render Test Report</h1>
    <div class="test">
        <h2>Expected Behavior</h2>
        <ul>
            <li>Player should appear as a 16x16 pixel character</li>
            <li>Idle animation: Standing still animation</li>
            <li>Walk animation: 4-frame walking cycle when moving left/right</li>
            <li>Jump animation: 2-frame jump sequence when pressing space</li>
        </ul>
    </div>
    <div class="test">
        <h2>Common Issues</h2>
        <ul>
            <li><strong>Red square instead of sprite:</strong> Sprite loading failed</li>
            <li><strong>No animation:</strong> Animation key mismatch</li>
            <li><strong>Console errors:</strong> Check for missing assets or code errors</li>
        </ul>
    </div>
    <div class="test">
        <h2>Debug Commands</h2>
        <pre>
// In browser console:
game.debug = true;  // Enable debug mode
game.stateManager.currentState.player  // Check player object
game.pixelArtRenderer.sprites  // List loaded sprites
game.pixelArtRenderer.animations  // List loaded animations
        </pre>
    </div>
    <script>
        console.log('Test report loaded. Check console for game state.');
    </script>
</body>
</html>`;
    
    await fs.writeFile('test-report.html', testHtml);
    console.log('✓ Test report saved as test-report.html');
}

// メイン実行
async function runAllTests() {
    console.log('Running simple tests...\n');
    
    const results = {
        serverHealth: await checkServerHealth(),
        assetFiles: await checkAssetFiles(),
        spriteData: await validateSpriteData(),
        gameFiles: await checkGameFiles()
    };
    
    await generateTestReport();
    
    console.log('\n=== Test Summary ===');
    console.log(`Server Health: ${results.serverHealth ? 'PASS' : 'FAIL'}`);
    console.log(`Asset Files: ${results.assetFiles ? 'PASS' : 'FAIL'}`);
    console.log(`Sprite Data: ${results.spriteData ? 'PASS' : 'FAIL'}`);
    console.log(`Game Files: ${results.gameFiles ? 'PASS' : 'FAIL'}`);
    
    const allPass = Object.values(results).every(r => r);
    console.log(`\nOverall: ${allPass ? 'READY FOR BROWSER TEST' : 'ISSUES FOUND'}`);
    
    if (!allPass) {
        console.log('\n⚠ Fix the issues above before browser testing');
    } else {
        console.log('\n✓ All checks passed! Ready for browser testing at http://localhost:3000');
    }
}

runAllTests().catch(console.error);