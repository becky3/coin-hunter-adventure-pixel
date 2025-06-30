const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// スクリーンショットディレクトリを作成
const screenshotDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

// 質問を Promise化
const question = (prompt) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
};

class InteractiveGameTester {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        console.log('🎮 Coin Hunter Adventure - インタラクティブテスター');
        console.log('============================================\n');
        
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: { width: 1280, height: 720 }
        });
        
        this.page = await this.browser.newPage();
        
        // コンソール出力を表示
        this.page.on('console', msg => {
            const text = msg.text();
            // 重要なログのみ表示
            if (text.includes('Error') || text.includes('Warning') || 
                text.includes('Space') || text.includes('transition')) {
                console.log(`[Browser] ${text}`);
            }
        });
        
        await this.page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
        
        // ゲーム初期化を待つ
        console.log('ゲーム初期化中...');
        await this.page.waitForFunction(
            () => window.game && window.game.gameLoop && window.game.gameLoop.running,
            { timeout: 10000 }
        );
        console.log('✓ ゲーム初期化完了\n');
    }

    async showMenu() {
        console.log('\n===== テストメニュー =====');
        console.log('1. Space キー問題の調査');
        console.log('2. ゲーム状態の確認');
        console.log('3. 手動キー入力テスト');
        console.log('4. スクリーンショット撮影');
        console.log('5. ゲームプレイフローテスト');
        console.log('6. デバッグ情報の表示');
        console.log('q. 終了');
        console.log('========================\n');
    }

    async testSpaceKey() {
        console.log('\n--- Space キー問題の調査 ---');
        
        // 現在の状態確認
        const currentState = await this.page.evaluate(() => ({
            state: window.game?.stateManager?.currentState?.name,
            optionsAlpha: window.game?.stateManager?.currentState?.optionsAlpha,
            selectedOption: window.game?.stateManager?.currentState?.selectedOption
        }));
        console.log('現在の状態:', currentState);
        
        if (currentState.state !== 'menu') {
            console.log('メニュー画面ではありません。');
            return;
        }
        
        console.log('\nテスト方法を選択してください:');
        console.log('1. Puppeteer keyboard.press');
        console.log('2. Puppeteer keyboard.down/up (遅延あり)');
        console.log('3. JavaScript dispatchEvent');
        console.log('4. InputSystem 直接操作');
        
        const method = await question('方法を選択 (1-4): ');
        
        switch (method) {
            case '1':
                await this.page.keyboard.press('Space');
                break;
            case '2':
                await this.page.keyboard.down('Space');
                await new Promise(resolve => setTimeout(resolve, 100));
                await this.page.keyboard.up('Space');
                break;
            case '3':
                await this.page.evaluate(() => {
                    const event = new KeyboardEvent('keydown', {
                        code: 'Space',
                        key: ' ',
                        bubbles: true
                    });
                    document.dispatchEvent(event);
                    setTimeout(() => {
                        const upEvent = new KeyboardEvent('keyup', {
                            code: 'Space',
                            key: ' ',
                            bubbles: true
                        });
                        document.dispatchEvent(upEvent);
                    }, 100);
                });
                break;
            case '4':
                await this.page.evaluate(() => {
                    const inputSystem = window.game?.inputSystem;
                    if (inputSystem) {
                        inputSystem.keys.set('Space', true);
                        setTimeout(() => {
                            inputSystem.update();
                            setTimeout(() => {
                                inputSystem.keys.set('Space', false);
                                inputSystem.update();
                            }, 100);
                        }, 20);
                    }
                });
                break;
        }
        
        // 結果を待つ
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newState = await this.page.evaluate(() => ({
            state: window.game?.stateManager?.currentState?.name,
            player: window.game?.stateManager?.currentState?.player ? 'exists' : 'null'
        }));
        console.log('\n結果:', newState);
    }

    async checkGameState() {
        console.log('\n--- ゲーム状態の確認 ---');
        
        const info = await this.page.evaluate(() => {
            const game = window.game;
            const state = game?.stateManager?.currentState;
            const inputSystem = game?.inputSystem;
            
            return {
                initialized: game?.isInitialized,
                running: game?.gameLoop?.running,
                currentState: state?.name,
                stateDetails: {
                    optionsAlpha: state?.optionsAlpha,
                    selectedOption: state?.selectedOption,
                    showHowTo: state?.showHowTo,
                    showCredits: state?.showCredits,
                    player: state?.player ? 'exists' : 'null'
                },
                inputSystem: {
                    exists: !!inputSystem,
                    activeKeys: inputSystem ? Array.from(inputSystem.keys.entries()).filter(([_, v]) => v) : [],
                    eventQueueLength: inputSystem?.eventQueue?.length
                },
                systems: {
                    music: game?.serviceLocator?.get('music') ? 'registered' : 'not found',
                    audio: game?.serviceLocator?.get('audio') ? 'registered' : 'not found'
                }
            };
        });
        
        console.log(JSON.stringify(info, null, 2));
    }

    async manualKeyTest() {
        console.log('\n--- 手動キー入力テスト ---');
        console.log('ブラウザウィンドウをクリックしてキーを押してください。');
        console.log('Enterを押すとテストを終了します。');
        
        // キーイベントのログを有効化
        await this.page.evaluate(() => {
            window._keyTestHandler = (e) => {
                console.log(`Key ${e.type}: ${e.code} (${e.key})`);
            };
            document.addEventListener('keydown', window._keyTestHandler);
            document.addEventListener('keyup', window._keyTestHandler);
        });
        
        await question('\nEnterを押して終了...');
        
        // ハンドラを削除
        await this.page.evaluate(() => {
            document.removeEventListener('keydown', window._keyTestHandler);
            document.removeEventListener('keyup', window._keyTestHandler);
        });
    }

    async takeScreenshot() {
        const filename = `test-${Date.now()}.png`;
        const filepath = path.join(screenshotDir, filename);
        await this.page.screenshot({ path: filepath });
        console.log(`\nスクリーンショット保存: ${filename}`);
    }

    async testGameplayFlow() {
        console.log('\n--- ゲームプレイフローテスト ---');
        
        // メニューから開始
        await this.page.reload();
        await this.page.waitForFunction(() => window.game?.gameLoop?.running);
        console.log('1. ゲーム初期化 ✓');
        
        // メニュー表示待ち
        await this.page.waitForFunction(() => 
            window.game?.stateManager?.currentState?.optionsAlpha >= 1
        );
        console.log('2. メニュー表示 ✓');
        
        // START GAME選択
        console.log('3. START GAME 実行中...');
        await this.page.keyboard.down('Space');
        await new Promise(resolve => setTimeout(resolve, 100));
        await this.page.keyboard.up('Space');
        
        // 遷移確認
        const result = await this.page.waitForFunction(
            () => window.game?.stateManager?.currentState?.name === 'play',
            { timeout: 3000 }
        ).then(() => true).catch(() => false);
        
        if (result) {
            console.log('4. PlayState遷移 ✓');
            
            // プレイヤー移動テスト
            console.log('5. プレイヤー移動テスト...');
            await this.page.keyboard.down('ArrowRight');
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.page.keyboard.up('ArrowRight');
            
            const playerMoved = await this.page.evaluate(() => {
                const player = window.game?.stateManager?.currentState?.player;
                return player && player.x > 50;
            });
            
            console.log(`6. プレイヤー移動 ${playerMoved ? '✓' : '✗'}`);
        } else {
            console.log('4. PlayState遷移 ✗ - 失敗');
        }
    }

    async showDebugInfo() {
        console.log('\n--- デバッグ情報 ---');
        
        // デバッグモード切り替え
        await this.page.evaluate(() => {
            if (window.game?.debugOverlay) {
                window.game.debugOverlay.toggle();
            }
        });
        
        console.log('デバッグオーバーレイをトグルしました。');
        
        // 詳細なデバッグ情報
        const debugInfo = await this.page.evaluate(() => {
            const collectSystemInfo = () => {
                const systems = {};
                const services = window.game?.serviceLocator?._services;
                if (services) {
                    for (const [name, service] of services) {
                        systems[name] = {
                            type: service.constructor.name,
                            initialized: service.initialized || service._initialized || 'unknown'
                        };
                    }
                }
                return systems;
            };
            
            return {
                registeredSystems: collectSystemInfo(),
                eventBusListeners: window.game?.eventBus?._listeners ? 
                    Object.keys(window.game.eventBus._listeners) : [],
                memoryUsage: performance.memory ? {
                    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
                } : 'not available'
            };
        });
        
        console.log(JSON.stringify(debugInfo, null, 2));
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            await this.initialize();
            
            let running = true;
            while (running) {
                await this.showMenu();
                const choice = await question('選択してください: ');
                
                switch (choice) {
                    case '1':
                        await this.testSpaceKey();
                        break;
                    case '2':
                        await this.checkGameState();
                        break;
                    case '3':
                        await this.manualKeyTest();
                        break;
                    case '4':
                        await this.takeScreenshot();
                        break;
                    case '5':
                        await this.testGameplayFlow();
                        break;
                    case '6':
                        await this.showDebugInfo();
                        break;
                    case 'q':
                    case 'Q':
                        running = false;
                        break;
                    default:
                        console.log('無効な選択です。');
                }
            }
        } catch (error) {
            console.error('エラーが発生しました:', error);
        } finally {
            await this.cleanup();
        }
    }
}

// 実行
const tester = new InteractiveGameTester();
tester.run().catch(console.error);