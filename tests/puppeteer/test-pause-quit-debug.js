import puppeteer from 'puppeteer';

async function testPauseAndQuitDebug() {
    console.log('🎮 Debug Test for Pause and Quit functionality...\n');
    
    const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // すべてのコンソールログを表示
        page.on('console', msg => {
            console.log(`[Browser ${msg.type()}]`, msg.text());
        });
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // デバッグ: InputSystemの状態を確認
        const inputSystemCheck = await page.evaluate(() => {
            const input = window.game?.inputSystem;
            return {
                exists: !!input,
                keyMap: input?.keyMap,
                reverseKeyMap: Array.from(input?.reverseKeyMap || new Map())
            };
        });
        console.log('InputSystem check:', JSON.stringify(inputSystemCheck, null, 2));
        
        // メニューから開始
        console.log('\nStarting game...');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // PlayStateのリスナーを確認
        const listenerCheck = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                stateName: state?.constructor.name,
                isPaused: state?.isPaused,
                inputListeners: state?.inputListeners?.length
            };
        });
        console.log('PlayState check:', listenerCheck);
        
        // ESCキーイベントをデバッグ
        console.log('\nPressing Escape key...');
        await page.evaluate(() => {
            console.log('Before ESC press - isPaused:', window.game?.stateManager?.currentState?.isPaused);
        });
        
        await page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const afterEsc = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                isPaused: state?.isPaused,
                eventQueue: window.game?.inputSystem?.eventQueue
            };
        });
        console.log('After ESC:', afterEsc);
        
        // Qキーイベントをデバッグ
        console.log('\nPressing Q key...');
        
        // 複数の方法でQキーを送信
        await page.keyboard.press('q');
        await new Promise(resolve => setTimeout(resolve, 200));
        await page.keyboard.press('Q');
        await new Promise(resolve => setTimeout(resolve, 200));
        await page.keyboard.press('KeyQ');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const afterQ = await page.evaluate(() => {
            return {
                currentState: window.game?.stateManager?.currentState?.constructor.name,
                isPaused: window.game?.stateManager?.currentState?.isPaused
            };
        });
        console.log('After Q key attempts:', afterQ);
        
        // InputSystemのイベントキューを確認
        const eventQueueCheck = await page.evaluate(() => {
            const input = window.game?.inputSystem;
            if (input) {
                // update()を手動で呼び出してイベントを処理
                input.update();
                return {
                    eventQueue: input.getEventQueue(),
                    justPressedKeys: Array.from(input.justPressedKeys || new Set())
                };
            }
            return null;
        });
        console.log('Event queue check:', eventQueueCheck);
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await browser.close();
    }
}

testPauseAndQuitDebug().catch(console.error);