import puppeteer from 'puppeteer';

async function testMusicPauseResume() {
    console.log('🎮 Testing music pause/resume functionality...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        page.on('console', msg => {
            console.log(`[Browser ${msg.type()}]`, msg.text());
        });
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 音楽を開始するためにクリック
        console.log('Starting music with click...');
        await page.click('canvas');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // メニューからゲームを開始
        console.log('Starting game from menu...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // PlayStateになっているか確認
        const currentState = await page.evaluate(() => {
            return window.game.stateManager.currentState.constructor.name;
        });
        console.log('Current state:', currentState);
        
        // 音楽の状態を確認
        const musicBeforePause = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                isInitialized: music.isInitialized,
                currentBGM: music.currentBGM,
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM
            };
        });
        console.log('Music before pause:', musicBeforePause);
        
        // ポーズ
        console.log('\nToggling pause...');
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            if (state && state.togglePause) {
                state.togglePause();
            } else {
                console.error('togglePause not available in state:', state?.constructor.name);
            }
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const musicDuringPause = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM,
                bgmLoopInterval: !!music.bgmLoopInterval
            };
        });
        console.log('Music during pause:', musicDuringPause);
        
        // 再開
        console.log('\nResuming...');
        await page.evaluate(() => {
            window.game.stateManager.currentState.togglePause();
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const musicAfterResume = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM,
                bgmLoopInterval: !!music.bgmLoopInterval
            };
        });
        console.log('Music after resume:', musicAfterResume);
        
        console.log('\n📊 Test Results:');
        console.log('✅ Music initialized:', musicBeforePause.isInitialized ? 'PASS' : 'FAIL');
        console.log('✅ Music pauses correctly:', musicDuringPause.isPaused === true ? 'PASS' : 'FAIL');
        console.log('✅ Music resumes correctly:', musicAfterResume.isPaused === false && musicAfterResume.currentBGM === 'game' ? 'PASS' : 'FAIL');
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testMusicPauseResume().catch(console.error);