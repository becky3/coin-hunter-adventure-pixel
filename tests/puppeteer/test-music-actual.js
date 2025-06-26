import puppeteer from 'puppeteer';

async function testMusicActual() {
    console.log('🎮 Testing actual music playback...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // クリックで音楽システムを初期化
        console.log('Initializing music system with click...');
        await page.click('canvas');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const musicInit = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                isInitialized: music.isInitialized,
                audioContextState: music.audioContext?.state,
                currentBGM: music.currentBGM
            };
        });
        console.log('Music after click:', musicInit);
        
        // ゲームを開始
        console.log('\nStarting game...');
        await page.evaluate(() => {
            window.game.stateManager.setState('play');
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const musicInGame = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                currentBGM: music.currentBGM,
                bgmLoopInterval: !!music.bgmLoopInterval,
                activeNodes: music.activeNodes?.length || 0
            };
        });
        console.log('Music in game:', musicInGame);
        
        // 実際に音が出ているか（アクティブノードがあるか）
        await new Promise(resolve => setTimeout(resolve, 1000));
        const activeCheck = await page.evaluate(() => {
            const music = window.game.musicSystem;
            return {
                activeNodes: music.activeNodes?.length || 0,
                audioContextTime: music.audioContext?.currentTime
            };
        });
        console.log('Active audio nodes:', activeCheck);
        
        console.log('\n📊 Summary:');
        console.log('✅ Music initialized:', musicInit.isInitialized ? 'YES' : 'NO');
        console.log('✅ AudioContext state:', musicInit.audioContextState);
        console.log('✅ BGM playing:', musicInGame.currentBGM || 'NONE');
        console.log('✅ Active audio nodes:', activeCheck.activeNodes);
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testMusicActual().catch(console.error);