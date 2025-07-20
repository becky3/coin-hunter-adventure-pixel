import { AnimationManager } from '../animation/AnimationManager';
import { AnimationPattern } from '../animation/AnimationResolver';

export const ANIMATION_PATTERNS: { [category: string]: { [name: string]: AnimationPattern } } = {
    player: {
        idle: {
            pattern: 'player/idle',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        walk: {
            pattern: 'player/walk',
            frameCount: 4,
            duration: 100,
            loop: true
        },
        jump: {
            pattern: 'player/jump1',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        fall: {
            pattern: 'player/jump2',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        idle_small: {
            pattern: 'player/idle_small',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        walk_small: {
            pattern: 'player/walk_small',
            frameCount: 4,
            duration: 100,
            loop: true
        },
        jump_small: {
            pattern: 'player/jump_small1',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        fall_small: {
            pattern: 'player/jump_small2',
            frameCount: 1,
            duration: 0,
            loop: false
        }
    },
    enemies: {
        slime_idle: {
            pattern: 'enemies/slime_idle',
            frameCount: 2,
            duration: 500,
            loop: true
        },
        slime_move: {
            pattern: 'enemies/slime_idle',
            frameCount: 2,
            duration: 300,
            loop: true
        },
        slime_jump: {
            pattern: 'enemies/slime_idle1',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        spider_idle: {
            pattern: 'enemies/spider/spider_idle',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        spider_walk: {
            pattern: 'enemies/spider/spider_walk',
            frameCount: 2,
            duration: 150,
            loop: true
        },
        spider_thread: {
            pattern: 'enemies/spider/spider_thread',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        bat_hang: {
            pattern: 'enemies/bat_hang',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        bat_fly: {
            pattern: 'enemies/bat_fly',
            frameCount: 2,
            duration: 200,
            loop: true
        },
        armor_knight_idle: {
            pattern: 'enemies/armor_knight_idle',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        armor_knight_walk: {
            pattern: 'enemies/armor_knight',
            frameCount: 2,
            duration: 400,
            loop: true,
            customFrames: ['enemies/armor_knight_idle', 'enemies/armor_knight_move']
        }
    },
    items: {
        coin_spin: {
            pattern: 'items/coin_spin',
            frameCount: 4,
            duration: 150,
            loop: true
        },
        spring_normal: {
            pattern: 'terrain/spring',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        spring_compressed: {
            pattern: 'terrain/spring',
            frameCount: 1,
            duration: 0,
            loop: false
        }
    },
    objects: {
        goal_flag: {
            pattern: 'terrain/goal_flag',
            frameCount: 1,
            duration: 0,
            loop: false
        }
    },
    powerups: {
        shield_stone: {
            pattern: 'powerups/shield_stone',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        power_glove: {
            pattern: 'powerups/power_glove',
            frameCount: 1,
            duration: 0,
            loop: false
        }
    },
    effects: {
        shield_left: {
            pattern: 'effects/shield_left',
            frameCount: 1,
            duration: 0,
            loop: false
        },
        shield_right: {
            pattern: 'effects/shield_right',
            frameCount: 1,
            duration: 0,
            loop: false
        }
    },
    projectiles: {
        energy_bullet: {
            pattern: 'projectiles/energy_bullet',
            frameCount: 1,
            duration: 0,
            loop: false
        }
    }
};

export function registerAllAnimations(): void {
    const manager = AnimationManager.getInstance();
    
    Object.entries(ANIMATION_PATTERNS).forEach(([category, patterns]) => {
        Object.entries(patterns).forEach(([name, pattern]) => {
            const key = `${category}/${name}`;
            manager.registerAnimationPattern(key, pattern);
        });
    });
}