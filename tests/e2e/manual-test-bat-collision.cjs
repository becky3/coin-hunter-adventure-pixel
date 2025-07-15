const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Bat Collision Test');
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        await t.assertState('play');
        await t.ensureInputFocus();
        
        console.log('\n=== コウモリ衝突判定テスト ===');
        
        // 初期状態の確認
        const initialInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            const bats = state?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            
            return {
                playerHealth: player?.health || 0,
                playerMaxHealth: player?.maxHealth || 0,
                playerLives: player?.lives || 0,
                playerScore: player?.score || 0,
                batCount: bats.length,
                firstBat: bats.length > 0 ? {
                    x: bats[0].x,
                    y: bats[0].y,
                    health: bats[0].health,
                    state: bats[0].state
                } : null
            };
        });
        
        console.log('初期状態:');
        console.log(`  プレイヤー: HP ${initialInfo.playerHealth}/${initialInfo.playerMaxHealth}, Lives: ${initialInfo.playerLives}, Score: ${initialInfo.playerScore}`);
        console.log(`  コウモリ数: ${initialInfo.batCount}`);
        
        // 物理システムの確認
        const physicsInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const physicsSystem = state?.physicsSystem || window.game?.physicsSystem;
            if (!physicsSystem) {
                return { error: 'Physics system not found' };
            }
            
            const entities = physicsSystem.getEntities ? Array.from(physicsSystem.getEntities()) : [];
            const bats = entities.filter(e => e.constructor.name === 'Bat');
            
            return {
                totalEntities: entities.length,
                batCount: bats.length,
                firstBat: bats.length > 0 ? {
                    id: bats[0].id,
                    physicsEnabled: bats[0].physicsEnabled,
                    collidable: bats[0].collidable,
                    physicsLayer: bats[0].physicsLayer
                } : null
            };
        });
        
        console.log('\n物理システム情報:');
        console.log(`  総エンティティ数: ${physicsInfo.totalEntities}`);
        console.log(`  物理システム内のコウモリ: ${physicsInfo.batCount}`);
        if (physicsInfo.firstBat) {
            console.log(`  最初のコウモリ: ${JSON.stringify(physicsInfo.firstBat)}`);
        }
        
        // プレイヤーをコウモリの近くに移動（下から接触）
        console.log('\n--- 1. プレイヤーからの接触テスト ---');
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            const bats = state?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            
            if (player && bats.length > 0) {
                // 最初のコウモリの位置に移動
                player.x = bats[0].x;
                player.y = bats[0].y + 20; // 少し下に配置
                player.vy = 0;
            }
        });
        
        await t.wait(500);
        
        const afterContactInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            const bats = state?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            
            return {
                playerHealth: player?.health || 0,
                playerInvulnerable: player?.invulnerable || false,
                batState: bats[0]?.batState || 'unknown'
            };
        });
        
        console.log('接触後:');
        console.log(`  プレイヤーHP: ${afterContactInfo.playerHealth}`);
        console.log(`  無敵状態: ${afterContactInfo.playerInvulnerable}`);
        console.log(`  コウモリ状態: ${afterContactInfo.batState}`);
        
        // 踏みつけテスト
        console.log('\n--- 2. 踏みつけテスト ---');
        await t.wait(2000); // 無敵時間が終わるまで待つ
        
        await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            const bats = state?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat' && e.batState === 'flying') || [];
            
            if (player && bats.length > 0) {
                // 飛んでいるコウモリの上に配置
                player.x = bats[0].x;
                player.y = bats[0].y - player.height - 5;
                player.vy = 3; // 落下中
            }
        });
        
        await t.wait(500);
        
        const afterStompInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.entityManager?.player;
            const bats = state?.entityManager?.enemies?.filter(e => e.constructor.name === 'Bat') || [];
            const defeatedBat = bats.find(b => b.state === 'dead' || b.health <= 0);
            
            return {
                playerScore: player?.score || 0,
                playerVy: player?.vy || 0,
                defeatedBat: defeatedBat ? {
                    state: defeatedBat.state,
                    health: defeatedBat.health,
                    active: defeatedBat.active
                } : null,
                activeBats: bats.filter(b => b.active).length
            };
        });
        
        console.log('踏みつけ後:');
        console.log(`  プレイヤースコア: ${afterStompInfo.playerScore}`);
        console.log(`  プレイヤーVy: ${afterStompInfo.playerVy}`);
        console.log(`  倒したコウモリ: ${afterStompInfo.defeatedBat ? JSON.stringify(afterStompInfo.defeatedBat) : 'なし'}`);
        console.log(`  アクティブなコウモリ数: ${afterStompInfo.activeBats}`);
        
        // スクリーンショット
        await t.screenshot('bat-collision-test');
        
        // 結果の検証
        if (initialInfo.playerHealth > afterContactInfo.playerHealth || afterContactInfo.playerInvulnerable) {
            console.log('\n✅ プレイヤーへのダメージ判定: 成功');
        } else {
            console.error('\n❌ プレイヤーへのダメージ判定: 失敗');
        }
        
        if (afterStompInfo.playerScore > initialInfo.playerScore || afterStompInfo.defeatedBat) {
            console.log('✅ 踏みつけ判定: 成功');
        } else {
            console.error('❌ 踏みつけ判定: 失敗');
        }
    });
}

// Run the test if called directly
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;