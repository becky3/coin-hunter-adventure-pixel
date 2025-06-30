const puppeteer = require('puppeteer');

(async () => {
    // ヘッドレスを無効にして実際のブラウザで確認
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    console.log('ブラウザを開いています...');
    await page.goto('http://localhost:3000');
    
    console.log('手動で以下を確認してください:');
    console.log('1. メニューが表示されるか');
    console.log('2. SpaceキーでSTART GAMEが実行されるか');
    console.log('3. PlayStateに遷移するか');
    console.log('4. キャラクターが動くか');
    console.log('\nCtrl+Cで終了します');
    
    // ブラウザを開いたままにする
    await new Promise(() => {});
})();