import puppeteer from 'puppeteer';

async function testMusicDebug() {
    console.log('🎮 Debugging music pause/resume...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if (msg.type() === 'log' || msg.type() === 'error') {
                console.log(`[Browser ${msg.type()}]`, msg.text());
            }
        });
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 音楽を開始
        await page.click('canvas');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // PlayStateに直接遷移
        await page.evaluate(() => {
            window.game.stateManager.setState('play');
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('=== Before Pause ===');
        const beforePause = await page.evaluate(() => {
            const music = window.game.musicSystem;
            console.log('MusicSystem state:', {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM,
                bgmLoopInterval: !!music.bgmLoopInterval
            });
            return {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused
            };
        });
        
        // ポーズ
        console.log('\n=== Pausing ===');
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            console.log('Calling togglePause on:', state.constructor.name);
            state.togglePause();
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const duringPause = await page.evaluate(() => {
            const music = window.game.musicSystem;
            console.log('MusicSystem state after pause:', {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM,
                bgmLoopInterval: !!music.bgmLoopInterval
            });
            return {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM
            };
        });
        
        // 再開
        console.log('\n=== Resuming ===');
        await page.evaluate(() => {
            const state = window.game.stateManager.currentState;
            console.log('Calling togglePause again on:', state.constructor.name);
            state.togglePause();
        });
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const afterResume = await page.evaluate(() => {
            const music = window.game.musicSystem;
            console.log('MusicSystem state after resume:', {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused,
                pausedBGM: music.pausedBGM,
                bgmLoopInterval: !!music.bgmLoopInterval
            });
            return {
                currentBGM: music.currentBGM,
                isPaused: music.isPaused
            };
        });
        
        console.log('\n📊 Results:');
        console.log('Before pause:', beforePause);
        console.log('During pause:', duringPause);
        console.log('After resume:', afterResume);
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testMusicDebug().catch(console.error);