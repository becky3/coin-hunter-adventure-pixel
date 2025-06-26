import puppeteer from 'puppeteer';

async function testRenderCheck() {
    console.log('🎮 Checking rendering issue...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // エラーログを収集
        const errors = [];
        page.on('error', err => errors.push(err.message));
        page.on('pageerror', err => errors.push(err.message));
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('[Error]', msg.text());
                errors.push(msg.text());
            }
        });
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // レンダラーの状態を確認
        const rendererCheck = await page.evaluate(() => {
            const renderer = window.game?.renderer;
            return {
                exists: !!renderer,
                drawPixelExists: typeof renderer?.drawPixel === 'function',
                pixelArtRendererExists: !!window.game?.pixelArtRenderer,
                canvasContext: !!renderer?.ctx
            };
        });
        console.log('Renderer check:', rendererCheck);
        
        // ゲームを開始
        await page.evaluate(() => {
            window.game.stateManager.setState('play');
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // PlayStateの状態を確認
        const stateCheck = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                stateName: state?.constructor.name,
                hasDrawBorderTile: typeof state?.drawBorderTile === 'function',
                hasRenderHUD: typeof state?.renderHUD === 'function'
            };
        });
        console.log('State check:', stateCheck);
        
        // Canvas描画状態を確認
        const canvasCheck = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            const ctx = canvas?.getContext('2d');
            if (!ctx) return null;
            
            // 1ピクセルでも描画されているか確認
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let hasPixels = false;
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i + 3] > 0) { // アルファ値が0より大きい
                    hasPixels = true;
                    break;
                }
            }
            
            return {
                width: canvas.width,
                height: canvas.height,
                hasPixels: hasPixels
            };
        });
        console.log('Canvas check:', canvasCheck);
        
        // スクリーンショットを保存
        await page.screenshot({ path: 'test-render-issue.png' });
        
        // エラーの確認
        if (errors.length > 0) {
            console.log('\n❌ Errors found:');
            errors.forEach(err => console.log('  -', err));
        }
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testRenderCheck().catch(console.error);