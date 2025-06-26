
## Manual Browser Test Steps

1. Open http://localhost:3000 in Chrome
2. Open DevTools (F12) → Console
3. Run these commands:

```javascript
// Check game initialization
console.log('Game exists:', !!window.game);
console.log('State:', game.stateManager?.currentState?.constructor.name);

// Check player
game.stateManager.setState('play');
setTimeout(() => {
    const player = game.stateManager.currentState?.player;
    console.log('Player:', player ? {
        pos: { x: player.x, y: player.y },
        anim: player.animState,
        sprite: player.spriteKey
    } : 'Not found');
    
    // Check renderer
    console.log('Sprites:', Array.from(game.pixelArtRenderer?.sprites.keys() || []));
    console.log('Animations:', Array.from(game.pixelArtRenderer?.animations.keys() || []));
}, 1000);
```

4. Test controls:
   - Arrow keys → Player should move
   - Space → Player should jump
   
5. Expected results:
   - Player appears as pixel art (not red square)
   - Animations work (walk, jump, idle)
   - No console errors
