/**
 * ジャンプの視覚的確認
 */
import puppeteer from 'puppeteer';

async function testJumpVisual() {
    console.log('🎮 Visual jump test - browser will stay open for 30 seconds\n');
    
    const browser = await puppeteer.launch({
        headless: false, // ブラウザを表示
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // ページ読み込み
        console.log('1. Loading game...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        console.log('2. Starting game...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('3. Game started - you can now test jump manually');
        console.log('   - Use arrow keys to move');
        console.log('   - Press Space to jump');
        console.log('   - Browser will close in 30 seconds');
        
        // 30秒待機
        await new Promise(resolve => setTimeout(resolve, 30000));
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testJumpVisual();