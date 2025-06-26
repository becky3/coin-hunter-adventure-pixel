import puppeteer from 'puppeteer';

async function testPauseAndQuit() {
    console.log('🎮 Testing Pause and Quit functionality...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // エラーとコンソールログを収集
        const errors = [];
        const logs = [];
        
        page.on('error', err => errors.push(err.message));
        page.on('pageerror', err => errors.push(err.message));
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
            logs.push(`[${msg.type()}] ${msg.text()}`);
        });
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        
        // ゲーム開始を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 現在の状態を確認
        let currentState = await page.evaluate(() => {
            return window.game?.stateManager?.currentState?.constructor.name;
        });
        console.log('Initial state:', currentState);
        
        // メニューからゲームを開始
        if (currentState === 'MenuState') {
            console.log('Starting game from menu...');
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // PlayStateになったか確認
        currentState = await page.evaluate(() => {
            return window.game?.stateManager?.currentState?.constructor.name;
        });
        console.log('State after Enter:', currentState);
        
        // 音楽の状態を確認
        const musicBeforePause = await page.evaluate(() => {
            const musicSystem = window.game?.musicSystem;
            return {
                isPlaying: musicSystem?.currentBGM,
                isPaused: musicSystem?.isPaused
            };
        });
        console.log('Music before pause:', musicBeforePause);
        
        // ESCキーでポーズ
        console.log('\nPressing ESC to pause...');
        await page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ポーズ状態を確認
        const pauseState = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const musicSystem = window.game?.musicSystem;
            return {
                isPaused: state?.isPaused,
                currentBGM: musicSystem?.currentBGM,
                musicPaused: musicSystem?.isPaused,
                pausedBGM: musicSystem?.pausedBGM
            };
        });
        console.log('Pause state:', pauseState);
        
        // ポーズメニューのテキストを確認
        const pauseMenuText = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            // Canvasのテキストは直接取得できないので、描画されたかどうかだけ確認
            return canvas ? 'Canvas found' : 'Canvas not found';
        });
        console.log('Pause menu:', pauseMenuText);
        
        // Qキーを押してタイトルに戻る
        console.log('\nPressing Q to quit...');
        await page.keyboard.press('KeyQ');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // メニューに戻ったか確認
        const stateAfterQuit = await page.evaluate(() => {
            return window.game?.stateManager?.currentState?.constructor.name;
        });
        console.log('State after Q key:', stateAfterQuit);
        
        // 音楽が停止したか確認
        const musicAfterQuit = await page.evaluate(() => {
            const musicSystem = window.game?.musicSystem;
            return {
                currentBGM: musicSystem?.currentBGM,
                isPaused: musicSystem?.isPaused
            };
        });
        console.log('Music after quit:', musicAfterQuit);
        
        // もう一度ゲームを開始して音楽の再開を確認
        console.log('\nStarting game again...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ESCでポーズ
        console.log('Pausing again...');
        await page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const pauseState2 = await page.evaluate(() => {
            const musicSystem = window.game?.musicSystem;
            return {
                isPaused: musicSystem?.isPaused,
                pausedBGM: musicSystem?.pausedBGM
            };
        });
        console.log('Music paused:', pauseState2);
        
        // ESCで再開
        console.log('Resuming...');
        await page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const resumeState = await page.evaluate(() => {
            const musicSystem = window.game?.musicSystem;
            return {
                isPaused: musicSystem?.isPaused,
                currentBGM: musicSystem?.currentBGM
            };
        });
        console.log('Music resumed:', resumeState);
        
        // UIボーダーの確認（スクリーンショットで視覚的に確認）
        console.log('\nTaking screenshot for UI border check...');
        await page.screenshot({ path: 'test-ui-borders.png' });
        
        // エラーチェック
        if (errors.length > 0) {
            console.log('\n❌ Errors found:');
            errors.forEach(err => console.log('  -', err));
        }
        
        // テスト結果
        console.log('\n📊 Test Results:');
        console.log('✅ Pause functionality:', pauseState.isPaused === true ? 'PASS' : 'FAIL');
        console.log('✅ Music pause:', pauseState2.isPaused === true ? 'PASS' : 'FAIL');
        console.log('✅ Music resume:', resumeState.isPaused === false ? 'PASS' : 'FAIL');
        console.log('✅ Q key quit to menu:', stateAfterQuit === 'MenuState' ? 'PASS' : 'FAIL');
        console.log('✅ No errors:', errors.length === 0 ? 'PASS' : 'FAIL');
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testPauseAndQuit().catch(console.error);