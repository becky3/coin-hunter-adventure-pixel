const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        slowMo: 100,
        verbose: true
    });

    await test.runTest(async (t) => {
        await t.init('Player Debug Test');
        await t.navigateToGame();
        await t.waitForGameInitialization();
        
        // Start game
        await t.startNewGame();
        
        console.log('\n--- Debugging Player Structure ---');
        
        // Get detailed player info
        const playerInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.name !== 'play') return { error: 'Not in play state' };
            
            // Check all possible locations
            const locations = {
                'state.player': state.player,
                'state.entityManager': state.entityManager,
                'state.entityManager?.player': state.entityManager?.player,
                'state.entities': state.entities,
                'state.levelManager': state.levelManager,
                'state.levelManager?.player': state.levelManager?.player,
                'state.managers': state.managers
            };
            
            // Find player in entities
            let playerEntity = null;
            if (state.entities && Array.isArray(state.entities)) {
                playerEntity = state.entities.find(e => 
                    e.type === 'player' || 
                    e.constructor?.name === 'Player' ||
                    e.name === 'player'
                );
            }
            
            // Check entity manager
            let entityManagerInfo = null;
            if (state.entityManager) {
                entityManagerInfo = {
                    hasPlayer: !!state.entityManager.player,
                    playerType: state.entityManager.player?.constructor?.name,
                    entitiesCount: state.entityManager.entities?.length
                };
            }
            
            return {
                stateKeys: Object.keys(state),
                locations,
                playerEntity: playerEntity ? {
                    type: playerEntity.type,
                    name: playerEntity.name,
                    constructor: playerEntity.constructor?.name,
                    hasPosition: !!playerEntity.position,
                    position: playerEntity.position,
                    keys: Object.keys(playerEntity).slice(0, 20)
                } : null,
                entityManagerInfo
            };
        });
        
        console.log('Player info:', JSON.stringify(playerInfo, null, 2));
        
        // Wait a bit to see if player is created later
        await t.wait(1000);
        
        // Try again
        const playerInfo2 = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            if (!state || state.name !== 'play') return null;
            
            // Look for player in EntityManager
            if (state.entityManager && state.entityManager.player) {
                const player = state.entityManager.player;
                return {
                    found: 'entityManager.player',
                    type: player.type,
                    hasPosition: !!player.position,
                    positionX: player.position?.x,
                    positionY: player.position?.y,
                    hasEntity: !!player.entity,
                    entityPosition: player.entity?.position
                };
            }
            
            return { found: 'none' };
        });
        
        console.log('\nSecond attempt:', JSON.stringify(playerInfo2, null, 2));
        
        // Take screenshot
        await t.screenshot('player-debug');
    });
}

if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;