const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for power-up system
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Power-up System Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to game with stage 0-5 (power-up test stage)
        await t.navigateToGame('http://localhost:3000?s=0-5&skip_title=true');
        await t.waitForGameInitialization();
        
        // With skip_title=true, we should go directly to play state
        await t.assertState('play');
        
        // Ensure input focus
        await t.ensureInputFocus();
        await t.assertPlayerExists();
        
        // Get initial player stats
        const initialStats = await t.getPlayerStats();
        console.log('Initial player stats:', initialStats);
        
        // Check if power-up sprites are loaded
        console.log('\n--- Checking sprite loading ---');
        const spriteInfo = await t.page.evaluate(() => {
            const game = window.game;
            if (!game || !game.renderer) return { error: 'No renderer' };
            
            const assetLoader = game.renderer.assetLoader;
            const pixelArtRenderer = game.renderer.pixelArtRenderer;
            
            // Check both loaders
            const hasInAssetLoader = assetLoader ? assetLoader.hasSprite('powerups/shield_stone') : false;
            const loadedAssets = assetLoader ? Array.from(assetLoader.loadedAssets.keys()) : [];
            const hasInPixelArt = pixelArtRenderer ? pixelArtRenderer.sprites.has('powerups/shield_stone') : false;
            const pixelArtSprites = pixelArtRenderer ? Array.from(pixelArtRenderer.sprites.keys()) : [];
            
            return {
                hasAssetLoader: !!assetLoader,
                hasPixelArtRenderer: !!pixelArtRenderer,
                hasInAssetLoader,
                hasInPixelArt,
                powerupSpritesInAssets: loadedAssets.filter(key => key.includes('powerup')),
                powerupSpritesInPixelArt: pixelArtSprites.filter(key => key.includes('powerup'))
            };
        });
        console.log('Sprite info:', spriteInfo);
        
        // Check entities in the level
        console.log('\n--- Checking entities ---');
        const entityInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager || state?.getEntityManager?.();
            if (!entityManager) return { error: 'No EntityManager' };
            
            const items = entityManager.getItems ? entityManager.getItems() : [];
            const enemies = entityManager.enemies || [];
            
            const powerUps = items.filter(item => item.constructor.name === 'ShieldStone');
            const slimes = enemies.filter(enemy => enemy.constructor.name === 'Slime');
            
            return {
                totalItems: items.length,
                itemTypes: items.map(item => ({
                    type: item.constructor.name,
                    position: { x: item.x, y: item.y }
                })),
                powerUpCount: powerUps.length,
                slimeCount: slimes.length,
                enemyPositions: slimes.map(s => ({ x: s.x, y: s.y }))
            };
        });
        console.log('Entity info:', entityInfo);
        
        t.assert(entityInfo.powerUpCount === 2, 'Should have 2 shield stones in level');
        t.assert(entityInfo.slimeCount === 3, 'Should have 3 slimes in level');
        
        // Check PowerUpManager exists
        console.log('\n--- Checking PowerUpManager ---');
        const powerUpInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            if (!player) return { error: 'No player' };
            
            const hasPowerUpManager = typeof player.getPowerUpManager === 'function';
            const powerUpManager = hasPowerUpManager ? player.getPowerUpManager() : null;
            
            return {
                hasPowerUpManager,
                hasApplyPowerUp: typeof player.applyPowerUp === 'function',
                activePowerUps: powerUpManager ? powerUpManager.getActivePowerUps() : [],
                hasShieldEffect: powerUpManager ? !!powerUpManager.effectHandlers?.get('SHIELD_STONE') : false
            };
        });
        console.log('PowerUp info:', powerUpInfo);
        
        t.assert(powerUpInfo.hasPowerUpManager, 'Player should have PowerUpManager');
        t.assert(powerUpInfo.hasApplyPowerUp, 'Player should have applyPowerUp method');
        
        // Move to collect first shield stone
        console.log('\n--- Test 1: Collecting Shield Stone ---');
        console.log('Moving right to collect shield stone...');
        await t.movePlayer('right', 500);
        await t.wait(500);
        
        // Check if shield was collected
        const afterCollection = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const powerUpManager = player?.getPowerUpManager();
            
            return {
                hasShield: powerUpManager ? powerUpManager.hasPowerUp('SHIELD_STONE') : false,
                activePowerUps: powerUpManager ? powerUpManager.getActivePowerUps() : [],
                playerHealth: player?.health || 0,
                playerMaxHealth: player?.maxHealth || 0,
                isSmall: player?.isSmall || false
            };
        });
        console.log('After collection:', afterCollection);
        
        t.assert(afterCollection.hasShield, 'Player should have shield after collecting');
        t.assert(afterCollection.activePowerUps.includes('SHIELD_STONE'), 'Shield should be in active power-ups');
        
        // Test shield effect by taking damage
        console.log('\n--- Test 2: Shield Protection ---');
        console.log('Moving to collide with slime...');
        await t.movePlayer('right', 800);
        await t.wait(1000);
        
        // Check shield effect
        const afterDamage = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            const powerUpManager = player?.getPowerUpManager();
            
            return {
                hasShield: powerUpManager ? powerUpManager.hasPowerUp('SHIELD_STONE') : false,
                activePowerUps: powerUpManager ? powerUpManager.getActivePowerUps() : [],
                playerHealth: player?.health || 0,
                isSmall: player?.isSmall || false,
                isDead: player?.isDead || false
            };
        });
        console.log('After damage:', afterDamage);
        
        t.assert(!afterDamage.hasShield, 'Shield should be consumed after damage');
        t.assert(afterDamage.playerHealth === afterCollection.playerHealth, 'Health should not decrease with shield');
        t.assert(!afterDamage.isSmall, 'Player should not become small with shield');
        
        // Check for any errors
        await t.checkForErrors();
        
        console.log('\n✅ All power-up tests passed!');
    });
}

// Run the test
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;