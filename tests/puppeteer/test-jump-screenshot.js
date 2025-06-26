/**
 * ジャンプ時のスクリーンショットを撮影
 */
import puppeteer from 'puppeteer';
import { takeDebugScreenshot } from './utils/screenshot.js';

async function testJumpScreenshot() {
    console.log('📸 Taking screenshots during jump...\n');
    
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
        
        // ジャンプ前
        await takeDebugScreenshot(page, 'jump-0-before.png', 'Before jump (idle state)');
        
        // ジャンプ開始
        await page.keyboard.down('Space');
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // ジャンプ上昇中
        await takeDebugScreenshot(page, 'jump-1-ascending.png', 'Ascending (jump state)');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // ジャンプ頂点付近
        await takeDebugScreenshot(page, 'jump-2-peak.png', 'Peak of jump');
        
        // スペースキーを離す
        await page.keyboard.up('Space');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 下降中
        await takeDebugScreenshot(page, 'jump-3-falling.png', 'Falling (fall state)');
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // 着地後
        await takeDebugScreenshot(page, 'jump-4-landed.png', 'After landing');
        
        console.log('\nAll screenshots saved successfully.');
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testJumpScreenshot();