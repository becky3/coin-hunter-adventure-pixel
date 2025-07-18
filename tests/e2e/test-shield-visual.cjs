const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

// Test for shield visual effects
async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 30000
    });

    await test.runTest(async (t) => {
        await t.init('Shield Visual Test');
        await t.injectErrorTracking();
        
        // Navigate to power-up test stage
        await t.navigateToGame('http://localhost:3000?s=0-5&skip_title=true');
        await t.waitForGameInitialization();
        await t.assertState('play');
        await t.ensureInputFocus();
        
        // Move right to collect shield
        console.log('\n--- Test 1: Collecting Shield and Visual Check ---');
        await t.holdKey('ArrowRight', 600);
        
        // Check shield visual state
        const shieldState = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            const player = entityManager?.getPlayer?.();
            const visual = player?.shieldVisual;
            
            return {
                hasPlayer: !!player,
                hasShieldPowerUp: player?.getPowerUpManager?.().hasPowerUp('SHIELD_STONE'),
                hasShieldVisual: !!visual,
                visualType: visual?.constructor?.name,
                showShield: visual?.showShield,
                blinkSpeed: visual?.blinkSpeed,
                isBreaking: visual?.isBreaking
            };
        });
        
        console.log('Shield state after collection:', JSON.stringify(shieldState, null, 2));
        t.assert(shieldState.hasShieldVisual, 'Should have shield visual');
        t.assert(shieldState.blinkSpeed === 0.2, 'Should have normal blink speed');
        t.assert(!shieldState.isBreaking, 'Should not be in breaking state');

        // Move to slime and take damage
        console.log('\n--- Test 2: Shield Breaking and Blinking ---');
        await t.holdKey('ArrowRight', 800);
        
        // Check shield state immediately after damage
        const breakingState = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            const player = entityManager?.getPlayer?.();
            const visual = player?.shieldVisual;
            
            return {
                hasShieldPowerUp: player?.getPowerUpManager?.().hasPowerUp('SHIELD_STONE'),
                hasShieldVisual: !!visual,
                isBreaking: visual?.isBreaking,
                blinkSpeed: visual?.blinkSpeed,
                playerInvulnerable: player?.invulnerable,
                invulnerabilityTime: player?.invulnerabilityTime
            };
        });
        
        console.log('Shield state after damage:', JSON.stringify(breakingState, null, 2));
        t.assert(breakingState.hasShieldPowerUp, 'Should still have shield power-up');
        t.assert(breakingState.hasShieldVisual, 'Should still have shield visual');
        t.assert(breakingState.isBreaking, 'Should be in breaking state');
        t.assert(breakingState.blinkSpeed === 0.1, 'Should have fast blink speed');
        t.assert(breakingState.playerInvulnerable, 'Player should be invulnerable');

        // Wait 500ms and check if still blinking
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const midState = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            const player = entityManager?.getPlayer?.();
            const visual = player?.shieldVisual;
            
            return {
                hasShieldPowerUp: player?.getPowerUpManager?.().hasPowerUp('SHIELD_STONE'),
                hasShieldVisual: !!visual,
                isBreaking: visual?.isBreaking,
                blinkSpeed: visual?.blinkSpeed
            };
        });
        
        console.log('Shield state after 500ms:', JSON.stringify(midState, null, 2));
        t.assert(midState.hasShieldVisual, 'Should still have shield visual at 500ms');
        t.assert(midState.isBreaking, 'Should still be breaking at 500ms');

        // Wait another 600ms (total 1100ms) and check if removed
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const finalState = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.getEntityManager?.();
            const player = entityManager?.getPlayer?.();
            const visual = player?.shieldVisual;
            
            return {
                hasShieldPowerUp: player?.getPowerUpManager?.().hasPowerUp('SHIELD_STONE'),
                hasShieldVisual: !!visual,
                playerInvulnerable: player?.invulnerable
            };
        });
        
        console.log('Shield state after 1100ms:', JSON.stringify(finalState, null, 2));
        t.assert(!finalState.hasShieldPowerUp, 'Should not have shield power-up after 1s');
        t.assert(!finalState.hasShieldVisual, 'Should not have shield visual after 1s');

        console.log('\n✅ All shield visual tests passed!');
    });
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});