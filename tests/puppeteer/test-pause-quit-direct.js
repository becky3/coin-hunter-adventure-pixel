import puppeteer from 'puppeteer';

async function testPauseAndQuitDirect() {
    console.log('🎮 Direct Test for Pause and Quit functionality...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 直接JavaScriptでゲームの状態を操作してテスト
        console.log('Testing game functionality directly...\n');
        
        // 1. ゲームを開始
        await page.evaluate(() => {
            window.game.stateManager.setState('play');
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterStart = await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const music = window.game.musicSystem;
            return {
                stateName: state.constructor.name,
                isPaused: state.isPaused,
                currentBGM: music.currentBGM,
                musicIsPaused: music.isPaused
            };
        });
        console.log('After starting game:', afterStart);
        
        // 2. ポーズをトグル
        console.log('\nToggling pause...');
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            if (state && state.togglePause) {
                state.togglePause();
            }
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const afterPause = await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const music = window.game.musicSystem;
            return {
                isPaused: state.isPaused,
                currentBGM: music.currentBGM,
                musicIsPaused: music.isPaused,
                pausedBGM: music.pausedBGM
            };
        });
        console.log('After pause:', afterPause);
        
        // 3. Qキーイベントをシミュレート
        console.log('\nSimulating Q key press while paused...');
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            const inputSystem = window.game.inputSystem;
            
            // InputSystemの内部状態を直接操作
            const event = {
                type: 'keyPress',
                key: 'KeyQ',
                action: null,
                timestamp: Date.now()
            };
            
            // リスナーに直接通知
            for (const listener of inputSystem.listeners.keyPress) {
                listener(event);
            }
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const afterQuit = await page.evaluate(() => {
            return {
                stateName: window.game.stateManager.currentState.constructor.name,
                musicStopped: window.game.musicSystem.currentBGM === null
            };
        });
        console.log('After Q key:', afterQuit);
        
        // 4. 再度ゲームを開始してポーズ/再開をテスト
        console.log('\nTesting pause/resume music...');
        await page.evaluate(() => {
            window.game.stateManager.setState('play');
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // ポーズ
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            state.togglePause();
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const musicPaused = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM,
                currentBGM: music.currentBGM
            };
        });
        console.log('Music when paused:', musicPaused);
        
        // 再開
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            state.togglePause();
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const musicResumed = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                isPaused: music.isPaused,
                currentBGM: music.currentBGM
            };
        });
        console.log('Music when resumed:', musicResumed);
        
        // 5. UIボーダーの確認
        console.log('\nChecking UI borders...');
        const borderCheck = await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            return {
                hasRenderHorizontalBorder: typeof state.renderHorizontalBorder === 'function',
                hasRenderBoxBorder: typeof state.renderBoxBorder === 'function'
            };
        });
        console.log('Border rendering methods:', borderCheck);
        
        // スクリーンショット
        await page.screenshot({ path: 'test-ui-borders-direct.png' });
        
        // 結果
        console.log('\n📊 Test Results:');
        console.log('✅ Game starts in PlayState:', afterStart.stateName === 'PlayState' ? 'PASS' : 'FAIL');
        console.log('✅ Pause toggle works:', afterPause.isPaused === true ? 'PASS' : 'FAIL');
        console.log('✅ Music pauses:', musicPaused.isPaused === true ? 'PASS' : 'FAIL');
        console.log('✅ Music resumes:', musicResumed.isPaused === false ? 'PASS' : 'FAIL');
        console.log('✅ Q key returns to menu:', afterQuit.stateName === 'MenuState' ? 'PASS' : 'FAIL');
        console.log('✅ Border methods exist:', borderCheck.hasRenderHorizontalBorder && borderCheck.hasRenderBoxBorder ? 'PASS' : 'FAIL');
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testPauseAndQuitDirect().catch(console.error);