/**
 * ジャンプアニメーションの問題を調査
 */
import puppeteer from 'puppeteer';

async function testJumpAnimation() {
    console.log('🎮 Testing jump animation issues...\n');
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // コンソールログを収集
        const animationLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('Animation') || text.includes('Sprite') || text.includes('Player render')) {
                animationLogs.push(text);
            }
        });
        
        // ページ読み込み
        await page.goto('http://localhost:3000', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ゲーム開始
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // デバッグモードを有効化
        await page.evaluate(() => {
            if (window.game) {
                window.game.debug = true;
            }
        });
        
        console.log('Monitoring animation states during jump...\n');
        
        // ジャンプ前の状態
        const beforeJump = await page.evaluate(() => {
            const p = window.game?.stateManager?.currentState?.player;
            return {
                animState: p.animState,
                spriteKey: p.spriteKey,
                visible: p.visible,
                y: p.y
            };
        });
        console.log('Before jump:', beforeJump);
        
        // ジャンプ開始
        await page.keyboard.down('Space');
        
        // ジャンプ中のアニメーション状態を記録
        const animationStates = [];
        for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const state = await page.evaluate((index) => {
                const p = window.game?.stateManager?.currentState?.player;
                const renderer = window.game?.renderer;
                
                // スプライトの存在確認
                let spriteExists = false;
                let animationExists = false;
                
                if (renderer?.pixelArtRenderer && p.spriteKey) {
                    spriteExists = renderer.pixelArtRenderer.sprites.has(p.spriteKey);
                    const animKey = p.animState === 'walk' ? 'player/walk' : 
                                   p.animState === 'jump' ? 'player/jump' : null;
                    if (animKey) {
                        animationExists = renderer.pixelArtRenderer.animations.has(animKey);
                    }
                }
                
                return {
                    time: index * 100,
                    y: Math.round(p.y),
                    vy: Math.round(p.vy * 100) / 100,
                    animState: p.animState,
                    spriteKey: p.spriteKey,
                    visible: p.visible,
                    spriteExists,
                    animationExists
                };
            }, i);
            
            animationStates.push(state);
            
            // 状態変化を出力
            console.log(`${state.time}ms: state=${state.animState}, sprite=${state.spriteKey}, visible=${state.visible}, spriteExists=${state.spriteExists}, animExists=${state.animationExists}, y=${state.y}`);
            
            // スペースキーを離す
            if (i === 3) {
                await page.keyboard.up('Space');
                console.log('--- Space released ---');
            }
        }
        
        // アニメーション状態の変化を分析
        console.log('\nAnimation state changes:');
        let lastState = beforeJump.animState;
        animationStates.forEach(state => {
            if (state.animState !== lastState) {
                console.log(`  ${state.time}ms: ${lastState} -> ${state.animState}`);
                lastState = state.animState;
            }
        });
        
        // 問題のある状態を検出
        console.log('\nPotential issues:');
        animationStates.forEach(state => {
            if (!state.visible) {
                console.log(`  ${state.time}ms: Player not visible!`);
            }
            if (state.spriteKey && !state.spriteExists) {
                console.log(`  ${state.time}ms: Sprite "${state.spriteKey}" not found!`);
            }
            if (state.animState === 'jump' && !state.animationExists) {
                console.log(`  ${state.time}ms: Jump animation not found!`);
            }
        });
        
        // 収集したログを表示
        if (animationLogs.length > 0) {
            console.log('\nAnimation-related logs:');
            animationLogs.forEach(log => console.log(`  ${log}`));
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testJumpAnimation();