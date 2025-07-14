const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// 物理システムがコウモリを処理しているか確認
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Bat Physics System Check');
        await t.navigateToGame('http://localhost:3000?s=2-1&skip_title=true');
        await t.waitForGameInitialization();
        
        await t.assertState('play');
        await t.ensureInputFocus();
        
        // 物理システム内のエンティティを確認
        const physicsEntities = await t.page.evaluate(() => {
            const physicsSystem = window.game?.physicsSystem;
            if (!physicsSystem || !physicsSystem.entities) return { error: 'No physics system' };
            
            const entities = [];
            for (const entity of physicsSystem.entities) {
                entities.push({
                    type: entity.constructor.name,
                    x: entity.x,
                    y: entity.y,
                    physicsEnabled: entity.physicsEnabled,
                    active: entity.active
                });
            }
            
            return {
                total: entities.length,
                entities: entities,
                bats: entities.filter(e => e.type === 'Bat')
            };
        });
        
        console.log('\n--- 物理システム内のエンティティ ---');
        
        if (physicsEntities.error) {
            console.log('エラー:', physicsEntities.error);
            return;
        }
        
        console.log(`総数: ${physicsEntities.total || 0}`);
        console.log(`コウモリ: ${physicsEntities.bats ? physicsEntities.bats.length : 0}`);
        
        if (physicsEntities.bats && physicsEntities.bats.length > 0) {
            console.log('\n⚠️ 警告: コウモリが物理システムに登録されています！');
            console.log('コウモリの詳細:', physicsEntities.bats);
        } else {
            console.log('\n✅ コウモリは物理システムに登録されていません');
        }
        
        // エンティティの詳細
        console.log('\n--- 全エンティティ ---');
        if (physicsEntities.entities) {
            physicsEntities.entities.forEach((entity, index) => {
                console.log(`${index + 1}. ${entity.type} at (${entity.x}, ${entity.y})`);
            });
        }
        
        await t.screenshot('bat-physics-check');
    });
}

runTest().catch(console.error);