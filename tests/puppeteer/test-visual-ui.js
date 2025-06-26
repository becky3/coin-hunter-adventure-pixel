import puppeteer from 'puppeteer';

async function testVisualUI() {
    console.log('🎮 Testing visual UI rendering...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ゲームを開始
        console.log('Starting game...');
        await page.evaluate(() => {
            window.game.stateManager.setState('play');
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 通常のゲーム画面
        await page.screenshot({ path: 'test-ui-normal.png' });
        console.log('✅ Normal game UI screenshot saved: test-ui-normal.png');
        
        // ポーズ画面
        console.log('Pausing game...');
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            if (state && state.togglePause) {
                state.togglePause();
            }
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await page.screenshot({ path: 'test-ui-paused.png' });
        console.log('✅ Paused game UI screenshot saved: test-ui-paused.png');
        
        // Canvas内容の確認
        const canvasAnalysis = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas.getContext('2d');
            
            // 上部HUD領域の色をサンプリング
            const hudSample = ctx.getImageData(10, 10, 1, 1).data;
            const borderSample = ctx.getImageData(10, 72, 1, 1).data; // 24 * 3 = 72 (スケール3倍)
            
            return {
                hudColor: `rgb(${hudSample[0]}, ${hudSample[1]}, ${hudSample[2]})`,
                borderColor: `rgb(${borderSample[0]}, ${borderSample[1]}, ${borderSample[2]})`
            };
        });
        
        console.log('\nCanvas color analysis:');
        console.log('HUD area:', canvasAnalysis.hudColor);
        console.log('Border area:', canvasAnalysis.borderColor);
        
        console.log('\n✅ Visual UI test completed');
        console.log('Please check the generated screenshots to verify:');
        console.log('- HUD has black background with white border');
        console.log('- Pause menu has black background with white border');
        console.log('- Borders are rendered as pixel patterns, not solid lines');
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testVisualUI().catch(console.error);