const GameTestHelpers = require('./utils/GameTestHelpers.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: false,
        verbose: true,
        timeout: 60000
    });

    await test.runTest(async (t) => {
        // Initialize game
        await t.init('Bullet Wall Collision Test');
        
        // Setup error tracking
        await t.injectErrorTracking();
        
        // Navigate to bullet test stage (has a wall on the left)
        await t.navigateToGame('http://localhost:3000?s=stage-bullet-test&skip_title=true');
        await t.waitForGameInitialization();
        
        // Ensure input focus
        await t.ensureInputFocus();
        
        // Get player position and wait for game to stabilize
        await t.wait(500);
        const playerPos = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player ? { x: player.x, y: player.y } : null;
        });
        console.log('Initial player position:', playerPos);
        
        // Power glove is at position (5, 11)
        // Move right to collect it
        console.log('Moving to collect power glove...');
        await t.wait(1000); // Wait for stage to stabilize
        await t.holdKey('ArrowRight', 1200);
        await t.wait(500);
        
        // Check if player has power glove
        const hasPowerGlove = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const player = state?.player || state?.entityManager?.getPlayer?.();
            return player && player.getPowerUpManager().hasPowerUp('POWER_GLOVE');
        });
        
        t.assert(hasPowerGlove, 'Player should have power glove');
        
        // Move back to the wall  
        console.log('Moving back to the wall...');
        await t.holdKey('ArrowLeft', 2000); // Move left for 2 seconds to get back to the wall
        await t.wait(500);
        
        // Check player position
        const nearWallPos = await t.page.evaluate(() => {
            const player = window.game?.stateManager?.currentState?.player;
            return player ? { x: player.x, y: player.y } : null;
        });
        console.log('Player position near wall:', nearWallPos);
        
        // Fire bullets at the wall
        console.log('Firing bullets at wall...');
        
        // Try different ways to press the Period key
        console.log('Method 1: Using pressKey...');
        await t.pressKey('.');
        await t.wait(100);
        
        console.log('Method 2: Using keyboard.press Period...');
        await t.page.keyboard.press('Period');
        await t.wait(100);
        
        console.log('Method 3: Using keyboard down/up...');
        await t.page.keyboard.down('Period');
        await t.wait(50);
        await t.page.keyboard.up('Period');
        await t.wait(100);
        
        // Debug: Check EntityManager directly
        const entityManagerCheck = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            return {
                hasEntityManager: !!state?.entityManager,
                entityManagerName: state?.entityManager?.constructor.name,
                hasGetProjectiles: !!state?.entityManager?.getProjectiles
            };
        });
        console.log('EntityManager check:', entityManagerCheck);
        
        // Fire one bullet and check after several frames
        await t.pressKey('.');
        await t.wait(500); // Wait longer for bullet to be properly added
        
        // Check if bullet was created
        const firstBulletInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const projectiles = entityManager?.getProjectiles() || [];
            const bullets = projectiles.filter(p => p.constructor.name === 'EnergyBullet');
            
            // Also check for any destroyed bullets
            const destroyedBullets = bullets.filter(b => b.isDestroyed && b.isDestroyed());
            
            return {
                totalProjectiles: projectiles.length,
                bulletCount: bullets.length,
                destroyedCount: destroyedBullets.length,
                projectileTypes: projectiles.map(p => p.constructor.name),
                bulletDetails: bullets.map(b => ({
                    x: b.x,
                    y: b.y,
                    destroyed: b.isDestroyed ? b.isDestroyed() : false
                }))
            };
        });
        
        console.log('First bullet check:', firstBulletInfo);
        
        // Fire more bullets
        for (let i = 0; i < 4; i++) {
            await t.pressKey('.');
            await t.wait(600); // Wait for fire rate cooldown
        }
        
        await t.wait(500); // Wait for bullets to travel
        
        // Check bullet states
        const bulletInfo = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const projectiles = entityManager?.getProjectiles() || [];
            const bullets = projectiles.filter(p => p.constructor.name === 'EnergyBullet');
            
            return {
                totalProjectiles: projectiles.length,
                bulletCount: bullets.length,
                bulletStates: bullets.map(b => ({
                    x: b.x,
                    y: b.y,
                    visible: b.visible,
                    destroyed: b.destroyed || b.isDestroyed?.() || false,
                    velocity: { x: b.vx, y: b.vy },
                    inPhysicsSystem: state?.physicsSystem?.entities?.includes(b) || false
                })),
                projectileTypes: projectiles.map(p => p.constructor.name)
            };
        });
        
        console.log('Bullet info after firing:', bulletInfo);
        
        // Wait more to see if bullets disappear
        await t.wait(2000);
        
        const bulletInfoAfterWait = await t.page.evaluate(() => {
            const state = window.game?.stateManager?.currentState;
            const entityManager = state?.entityManager;
            const projectiles = entityManager?.getProjectiles() || [];
            const bullets = projectiles.filter(p => p.constructor.name === 'EnergyBullet');
            
            return {
                totalProjectiles: projectiles.length,
                bulletCount: bullets.length,
                bulletStates: bullets.map(b => ({
                    x: b.x,
                    y: b.y,
                    visible: b.visible,
                    destroyed: b.destroyed || b.isDestroyed?.() || false,
                    velocity: { x: b.vx, y: b.vy },
                    inPhysicsSystem: state?.physicsSystem?.entities?.includes(b) || false
                })),
                projectileTypes: projectiles.map(p => p.constructor.name)
            };
        });
        
        console.log('Bullet info after waiting:', bulletInfoAfterWait);
        
        // Check if there are stuck bullets (velocity is 0 but still visible)
        const stuckBullets = bulletInfoAfterWait.bulletStates.filter(b => 
            b.visible && Math.abs(b.velocity.x) < 0.1 && Math.abs(b.velocity.y) < 0.1
        );
        
        console.log('Stuck bullets:', stuckBullets);
        
        // Also check bullets still in physics system
        const bulletsInPhysics = bulletInfoAfterWait.bulletStates.filter(b => b.inPhysicsSystem);
        console.log('Bullets still in physics system:', bulletsInPhysics);
        
        t.assert(stuckBullets.length === 0, 'No bullets should be stuck to walls');
        t.assert(bulletInfoAfterWait.bulletCount === 0, 'All bullets should be destroyed after hitting walls');
        
        // Check for any errors
        await t.checkForErrors();
    });
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});