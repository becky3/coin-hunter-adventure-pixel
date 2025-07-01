const puppeteer = require('puppeteer');

async function debugConsoleError() {
    console.log('🔍 デバッグ: エラー詳細確認\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    const errors = [];
    
    // コンソールログを捕捉
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        
        if (type === 'error') {
            console.error('❌ ERROR:', text);
            
            // エラーの詳細を取得
            msg.args().forEach(async (arg, index) => {
                try {
                    const value = await arg.jsonValue();
                    if (value && typeof value === 'object' && value.stack) {
                        console.error('Stack trace:', value.stack);
                    }
                } catch (e) {
                    // エラーオブジェクトの場合、直接評価
                    try {
                        const errorDetails = await arg.evaluate(err => {
                            if (err instanceof Error) {
                                return {
                                    message: err.message,
                                    stack: err.stack,
                                    name: err.name
                                };
                            }
                            return String(err);
                        });
                        if (errorDetails && errorDetails.stack) {
                            console.error('\n📋 Error Details:');
                            console.error('  Name:', errorDetails.name);
                            console.error('  Message:', errorDetails.message);
                            console.error('  Stack:\n', errorDetails.stack);
                        }
                    } catch (e2) {
                        // 無視
                    }
                }
            });
        } else if (type === 'warning') {
            console.warn('⚠️  WARN:', text);
        } else {
            console.log('📝 LOG:', text);
        }
    });
    
    // ページエラーを捕捉
    page.on('pageerror', error => {
        console.error('❌ PAGE ERROR:', error.message);
        console.error('Stack:', error.stack);
    });
    
    // Request failed エラーを捕捉
    page.on('requestfailed', request => {
        console.error('❌ Request failed:', request.url());
    });
    
    try {
        console.log('ページを読み込み中...\n');
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // グローバルエラーをチェック
        const globalErrors = await page.evaluate(() => {
            const errors = [];
            if (window.__errors) {
                errors.push(...window.__errors);
            }
            return errors;
        });
        
        if (globalErrors.length > 0) {
            console.error('\n🔴 Global errors found:');
            globalErrors.forEach((err, index) => {
                console.error(`Error ${index + 1}:`, err);
            });
        }
        
    } catch (error) {
        console.error('\n❌ エラー:', error.message);
    } finally {
        await browser.close();
    }
}

debugConsoleError();