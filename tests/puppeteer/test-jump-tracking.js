/**
 * ジャンプの追跡テスト - シンプル版
 */
import puppeteer from 'puppeteer';

async function testJumpTracking() {
    console.log('🎮 Tracking jump behavior...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // ページ読み込み
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Recording jump sequence...\n');
        
        // ジャンプ前の状態
        const before = await page.evaluate(() => {
            const p = window.game?.stateManager?.currentState?.player;
            return { y: p.y, vy: p.vy, grounded: p.grounded };
        });
        console.log('Before jump:', before);
        
        // スペースキーを押してジャンプ
        await page.keyboard.down('Space');
        
        // 100ミリ秒ごとに位置を記録（2秒間）
        const positions = [];
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const pos = await page.evaluate((index) => {
                const p = window.game?.stateManager?.currentState?.player;
                return { 
                    time: index * 100,
                    y: Math.round(p.y), 
                    vy: Math.round(p.vy * 100) / 100,
                    grounded: p.grounded 
                };
            }, i);
            positions.push(pos);
            
            // リアルタイムで出力
            console.log(`${pos.time}ms: y=${pos.y}, vy=${pos.vy}, grounded=${pos.grounded}`);
            
            // スペースキーを離す（300ms後）
            if (i === 3) {
                await page.keyboard.up('Space');
                console.log('--- Space key released ---');
            }
        }
        
        // 最高到達点と最低点を計算
        const minY = Math.min(...positions.map(p => p.y));
        const maxY = Math.max(...positions.map(p => p.y));
        console.log(`\nJump analysis:`);
        console.log(`- Starting Y: ${before.y}`);
        console.log(`- Highest point: ${minY} (${before.y - minY} pixels up)`);
        console.log(`- Lowest point: ${maxY}`);
        console.log(`- Total jump height: ${maxY - minY} pixels`);
        
        // 画面外チェック
        if (minY < 0) {
            console.log('⚠️  WARNING: Player went above screen (Y < 0)!');
        }
        if (maxY > 240) {
            console.log('⚠️  WARNING: Player went below screen bottom!');
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testJumpTracking();