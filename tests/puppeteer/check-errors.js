/**
 * エラーチェック専用スクリプト
 * Puppeteerでブラウザのエラーを取得
 */
import puppeteer from 'puppeteer';

async function checkErrors() {
    console.log('🔍 Checking for browser errors...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // エラーとログを収集
        const errors = [];
        const warnings = [];
        const logs = [];
        
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            
            if (type === 'error') {
                errors.push({
                    text: text,
                    location: msg.location(),
                    stackTrace: msg.stackTrace()
                });
            } else if (type === 'warning') {
                warnings.push(text);
            } else {
                logs.push({ type, text });
            }
        });
        
        page.on('pageerror', error => {
            errors.push({
                text: error.message,
                stack: error.stack
            });
        });
        
        // ページ読み込み
        console.log('Loading http://localhost:3000...');
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム状態を確認
        const gameInfo = await page.evaluate(() => {
            return {
                gameExists: typeof window.game !== 'undefined',
                gameState: window.game?.stateManager?.currentState?.constructor.name,
                hasError: document.querySelector('#loadingScreen')?.textContent.includes('Error')
            };
        });
        
        // 結果を表示
        console.log('\n📊 Results:');
        console.log('Game loaded:', gameInfo.gameExists);
        console.log('Current state:', gameInfo.gameState || 'None');
        
        if (errors.length > 0) {
            console.log('\n❌ ERRORS FOUND:');
            errors.forEach((error, i) => {
                console.log(`\n${i + 1}. ${error.text}`);
                if (error.location) {
                    console.log(`   Location: ${error.location.url}:${error.location.lineNumber}`);
                }
                if (error.stack) {
                    console.log(`   Stack:\n${error.stack}`);
                }
                if (error.stackTrace && error.stackTrace.length > 0) {
                    console.log('   Stack trace:');
                    error.stackTrace.slice(0, 3).forEach(frame => {
                        console.log(`     at ${frame.functionName || 'anonymous'} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`);
                    });
                }
            });
        } else {
            console.log('\n✅ No errors found!');
        }
        
        if (warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            warnings.forEach(w => console.log(`  - ${w}`));
        }
        
        // スクリーンショット
        await page.screenshot({ path: '../screenshots/error-check-screenshot.png' });
        console.log('\n📸 Screenshot saved: error-check-screenshot.png');
        
    } catch (error) {
        console.error('Check failed:', error);
    } finally {
        await browser.close();
    }
}

checkErrors();