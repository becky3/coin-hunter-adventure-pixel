/**
 * puppeteer-coreとシステムのChromeを使用するテスト
 */
import puppeteer from 'puppeteer-core';

async function testWithSystemChrome() {
    console.log('🔍 Testing with system Chrome/Chromium...\n');
    
    // 可能なChromeの実行パス
    const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        // Windows側のChromeを使う場合（WSL2）
        '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
        '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe'
    ];
    
    let browser = null;
    let chromePath = null;
    
    // 利用可能なChromeを探す
    for (const path of possiblePaths) {
        try {
            const fs = await import('fs');
            await fs.promises.access(path);
            chromePath = path;
            console.log(`Found Chrome at: ${path}`);
            break;
        } catch {
            // このパスは存在しない
        }
    }
    
    if (!chromePath) {
        console.error('❌ Chrome/Chromium not found. Please install Chrome or Chromium.');
        console.log('\nTo install Chromium on WSL:');
        console.log('sudo apt-get install -y chromium-browser');
        console.log('\nOr use Windows Chrome by ensuring it\'s installed at the default location.');
        return;
    }
    
    try {
        browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // エラーを収集
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        // ページを読み込み
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        // 結果を表示
        if (errors.length > 0) {
            console.log('❌ Errors found:');
            errors.forEach(err => console.log(`  - ${err}`));
        } else {
            console.log('✅ No errors found!');
        }
        
        // スクリーンショット
        await page.screenshot({ path: 'test-screenshot.png' });
        console.log('\n📸 Screenshot saved: test-screenshot.png');
        
    } catch (error) {
        console.error('Test failed:', error.message);
    } finally {
        if (browser) await browser.close();
    }
}

testWithSystemChrome();