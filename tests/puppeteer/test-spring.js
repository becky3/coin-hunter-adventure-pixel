import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSpring() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // コンソールログを出力
    page.on('console', msg => console.log('Browser log:', msg.text()));
    page.on('pageerror', error => console.error('Page error:', error.message));
    
    try {
        console.log('🎮 Testing Spring functionality...\n');
        
        // 開発サーバーのページを開く
        await page.goto('http://localhost:3000');
        
        // ゲームが読み込まれるまで待機
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲームを開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // デバッグワープでジャンプ台の近くへ
        await page.keyboard.press('w');
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.keyboard.press('1'); // Spring position (80, 176)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // プレイヤーの初期位置を記録
        const initialState = await page.evaluate(() => {
            const state = window.game.currentState;
            const player = state?.player;
            const spring = window.game.currentState.entities.find(e => e.constructor.name === 'Spring');
            return {
                player: { x: player.x, y: player.y, vy: player.vy, grounded: player.grounded },
                spring: spring ? { x: spring.x, y: spring.y, compression: spring.compression } : null
            };
        });
        console.log('1. Initial state:', initialState);
        
        // ジャンプ台の上に移動
        await page.keyboard.down('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 300));
        await page.keyboard.up('ArrowRight');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 最初のバウンス
        const firstBounce = await page.evaluate(() => {
            const player = window.game.currentState.player;
            const spring = window.game.currentState.entities.find(e => e.constructor.name === 'Spring');
            return {
                player: { x: player.x, y: player.y, vy: player.vy, grounded: player.grounded },
                spring: spring ? { compression: spring.compression, triggered: spring.triggered } : null,
                physicsSystem: {
                    collisionPairsSize: window.game.currentState.physicsSystem.collisionPairs.size,
                    collisionPairs: Array.from(window.game.currentState.physicsSystem.collisionPairs.keys())
                }
            };
        });
        console.log('2. First bounce:', firstBounce);
        
        // ジャンプの頂点まで待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 着地を待つ
        await page.waitForFunction(() => {
            const player = window.game.currentState.player;
            return player.grounded && player.vy === 0;
        }, { timeout: 3000 });
        
        // 着地後の状態
        const afterLanding = await page.evaluate(() => {
            const player = window.game.currentState.player;
            const spring = window.game.currentState.entities.find(e => e.constructor.name === 'Spring');
            return {
                player: { x: player.x, y: player.y, vy: player.vy, grounded: player.grounded },
                spring: spring ? { compression: spring.compression, triggered: spring.triggered } : null,
                physicsSystem: {
                    collisionPairsSize: window.game.currentState.physicsSystem.collisionPairs.size,
                    collisionPairs: Array.from(window.game.currentState.physicsSystem.collisionPairs.keys())
                }
            };
        });
        console.log('3. After landing:', afterLanding);
        
        // 再度ジャンプ台を踏む（まだ上にいる場合）
        if (Math.abs(afterLanding.player.x - 80) < 20) {
            console.log('4. Still on spring, waiting for second bounce...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const secondBounce = await page.evaluate(() => {
                const player = window.game.currentState.player;
                const spring = window.game.currentState.entities.find(e => e.constructor.name === 'Spring');
                return {
                    player: { x: player.x, y: player.y, vy: player.vy, grounded: player.grounded },
                    spring: spring ? { compression: spring.compression, triggered: spring.triggered } : null,
                    jumped: player.vy < -10
                };
            });
            console.log('5. Second bounce attempt:', secondBounce);
            
            if (secondBounce.jumped) {
                console.log('✅ Spring re-bounce worked!');
            } else {
                console.log('❌ Spring re-bounce failed - player did not jump');
            }
        }
        
        // スクリーンショット
        await page.screenshot({ path: 'test-spring.png' });
        console.log('\n📸 Screenshot saved: test-spring.png');
        
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        await browser.close();
    }
}

testSpring();