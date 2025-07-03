# Resource Configuration System

## Overview

The resource configuration system allows game resources (sprites, characters, audio, objects) to be defined externally in JSON files, making it easy to modify game assets without changing code.

## Structure

All resource configurations are located in `/src/config/resources/`:

```
/src/config/resources/
├── index.json       # Main configuration index
├── sprites.json     # Sprite and animation definitions
├── characters.json  # Character stats and physics
├── audio.json       # Sound effects and music definitions
└── objects.json     # Game object configurations
```

## Configuration Files

### index.json
The main index file that references all other configuration files and contains global settings.

```json
{
  "version": "1.0.0",
  "configs": {
    "sprites": "./sprites.json",
    "characters": "./characters.json",
    "audio": "./audio.json",
    "objects": "./objects.json"
  },
  "paths": {
    "sprites": "/src/assets/sprites/",
    "levels": "/src/levels/data/"
  },
  "settings": {
    "defaultPalette": "default",
    "pixelSize": 16,
    "tileSize": 16
  }
}
```

### sprites.json
Defines all sprites and animations in the game, organized by category.

```json
{
  "categories": {
    "player": {
      "sprites": [
        { "name": "idle", "type": "static" }
      ],
      "animations": [
        { "name": "walk", "frameCount": 4, "frameDuration": 100 },
        { "name": "jump", "frameCount": 2, "frameDuration": 200 }
      ]
    }
  }
}
```

### characters.json
Contains physics properties, stats, and behavior configuration for all characters.

```json
{
  "player": {
    "main": {
      "physics": {
        "width": 16,
        "height": 16,
        "speed": 1.17,
        "jumpPower": 10
      },
      "stats": {
        "maxHealth": 3,
        "invulnerabilityTime": 2000
      }
    }
  },
  "enemies": {
    "slime": {
      "physics": {
        "width": 16,
        "height": 16,
        "moveSpeed": 0.25,
        "jumpHeight": 5
      },
      "stats": {
        "maxHealth": 1,
        "damage": 1
      }
    }
  }
}
```

### audio.json
Defines background music and sound effects with their properties.

```json
{
  "bgm": {
    "title": {
      "type": "loop",
      "tempo": 120,
      "volume": 0.3
    }
  },
  "sfx": {
    "jump": {
      "type": "effect",
      "waveform": "square",
      "frequency": {
        "start": 440,
        "end": 880
      },
      "duration": 0.1,
      "volume": 0.3
    }
  }
}
```

### objects.json
Configuration for interactive game objects like coins, springs, and goals.

```json
{
  "items": {
    "coin": {
      "physics": {
        "width": 16,
        "height": 16,
        "solid": false
      },
      "properties": {
        "scoreValue": 10,
        "floatSpeed": 0.03,
        "floatAmplitude": 0.1
      }
    }
  }
}
```

## Usage

### ResourceLoader

The `ResourceLoader` class provides access to all resource configurations:

```typescript
import { ResourceLoader } from '../config/ResourceLoader';

// Get singleton instance
const resourceLoader = ResourceLoader.getInstance();

// Initialize (loads all configs)
await resourceLoader.initialize();

// Get specific configurations
const playerConfig = resourceLoader.getCharacterConfig('player', 'main');
const coinConfig = resourceLoader.getObjectConfig('items', 'coin');
const jumpSound = resourceLoader.getAudioConfig('sfx', 'jump');
```

### Automatic Loading in Entities

Entities automatically load their configuration when created:

```typescript
// Player loads config in constructor
const player = new Player(x, y);
// Automatically uses values from characters.json

// Coin loads config in constructor  
const coin = new Coin(x, y);
// Automatically uses values from objects.json
```

## Adding New Resources

1. **Add sprite files** to `/src/assets/sprites/[category]/`
2. **Update sprites.json** with sprite/animation definitions
3. **Update relevant config files** (characters.json, objects.json, etc.)
4. **No code changes needed** - entities will automatically use new values

## Benefits

- **Easy customization**: Change game balance, physics, visuals without coding
- **Mod support**: External configuration makes modding straightforward
- **Rapid iteration**: Test different values quickly
- **Version control**: Track configuration changes separately from code
- **Localization ready**: Can easily extend for multiple languages

## Best Practices

1. **Always provide defaults**: Entities should have fallback values if config fails
2. **Validate values**: Check for reasonable ranges (e.g., health > 0)
3. **Document properties**: Add comments in JSON files explaining values
4. **Test changes**: Verify game still works after config modifications
5. **Version configs**: Update version number when making breaking changes