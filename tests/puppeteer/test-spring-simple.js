import puppeteer from 'puppeteer';

async function testSpringSimple() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    page.on('console', msg => console.log('Browser:', msg.text()));
    
    try {
        console.log('🎮 Testing Spring functionality (simplified)...\n');
        
        await page.goto('http://localhost:3000');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム状態を確認
        const gameState = await page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            return {
                hasGame: !!game,
                currentStateName: game?.stateManager?.currentStateName,
                hasPlayer: !!state?.player,
                hasEntities: !!state?.entities,
                entityCount: state?.entities?.length || 0,
                playerInfo: state?.player ? { x: state.player.x, y: state.player.y, id: state.player.id } : null
            };
        });
        console.log('Game state:', gameState);
        
        // スプリングを探す
        const springInfo = await page.evaluate(() => {
            const entities = Array.from(window.game?.physicsSystem?.entities || []);
            const spring = entities.find(e => e.constructor.name === 'Spring');
            return {
                hasSpring: !!spring,
                springPosition: spring ? { x: spring.x, y: spring.y, id: spring.id } : null,
                totalEntities: entities.length,
                entityTypes: entities.map(e => ({ name: e.constructor.name, id: e.id }))
            };
        });
        console.log('Spring info:', springInfo);
        
        // デバッグワープを試す
        await page.keyboard.press('w');
        await new Promise(resolve => setTimeout(resolve, 200));
        await page.keyboard.press('1');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // プレイヤー位置を確認
        const playerPos = await page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player;
            return player ? { x: player.x, y: player.y, id: player.id } : null;
        });
        console.log('Player position after warp:', playerPos);
        
        await page.screenshot({ path: 'test-spring-simple.png' });
        console.log('\n📸 Screenshot saved: test-spring-simple.png');
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

testSpringSimple();