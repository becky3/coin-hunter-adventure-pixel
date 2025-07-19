import { AnimationManager } from '../animation/AnimationManager';

interface AnimationDefinition {
    frames: string[];
    duration: number;
    loop: boolean;
}

export const ANIMATION_DEFINITIONS = {
    player: {
        idle: {
            frames: ['player/idle'],
            duration: 0,
            loop: false
        },
        walk: {
            frames: ['player/walk1', 'player/walk2', 'player/walk3', 'player/walk4'],
            duration: 100,
            loop: true
        },
        jump: {
            frames: ['player/jump1'],
            duration: 0,
            loop: false
        },
        fall: {
            frames: ['player/jump2'],
            duration: 0,
            loop: false
        },
        idle_small: {
            frames: ['player/idle_small'],
            duration: 0,
            loop: false
        },
        walk_small: {
            frames: ['player/walk_small1', 'player/walk_small2', 'player/walk_small3', 'player/walk_small4'],
            duration: 100,
            loop: true
        },
        jump_small: {
            frames: ['player/jump_small1'],
            duration: 0,
            loop: false
        },
        fall_small: {
            frames: ['player/jump_small2'],
            duration: 0,
            loop: false
        }
    },
    enemies: {
        slime_idle: {
            frames: ['enemies/slime_idle1', 'enemies/slime_idle2'],
            duration: 500,
            loop: true
        },
        slime_move: {
            frames: ['enemies/slime_idle1', 'enemies/slime_idle2'],
            duration: 300,
            loop: true
        },
        slime_jump: {
            frames: ['enemies/slime_idle1'],
            duration: 0,
            loop: false
        },
        spider_idle: {
            frames: ['enemies/spider_idle'],
            duration: 0,
            loop: false
        },
        spider_walk: {
            frames: ['enemies/spider_walk1', 'enemies/spider_walk2'],
            duration: 150,
            loop: true
        },
        spider_thread: {
            frames: ['enemies/spider_thread'],
            duration: 0,
            loop: false
        },
        bat_hang: {
            frames: ['enemies/bat_hang'],
            duration: 0,
            loop: false
        },
        bat_fly: {
            frames: ['enemies/bat_fly1', 'enemies/bat_fly2'],
            duration: 200,
            loop: true
        },
        armor_knight_idle: {
            frames: ['enemies/armor_knight'],
            duration: 0,
            loop: false
        },
        armor_knight_walk: {
            frames: ['enemies/armor_knight'],
            duration: 100,
            loop: true
        }
    },
    items: {
        coin_spin: {
            frames: ['items/coin_spin1', 'items/coin_spin2', 'items/coin_spin3', 'items/coin_spin4'],
            duration: 150,
            loop: true
        },
        spring_normal: {
            frames: ['terrain/spring'],
            duration: 0,
            loop: false
        },
        spring_compressed: {
            frames: ['terrain/spring'],
            duration: 0,
            loop: false
        }
    },
    objects: {
        goal_flag: {
            frames: ['terrain/goal_flag'],
            duration: 0,
            loop: false
        }
    },
    powerups: {
        shield_stone: {
            frames: ['powerups/shield_stone'],
            duration: 0,
            loop: false
        },
        power_glove: {
            frames: ['powerups/power_glove'],
            duration: 0,
            loop: false
        }
    },
    effects: {
        shield_left: {
            frames: ['effects/shield_left'],
            duration: 0,
            loop: false
        },
        shield_right: {
            frames: ['effects/shield_right'],
            duration: 0,
            loop: false
        }
    },
    projectiles: {
        energy_bullet: {
            frames: ['projectiles/energy_bullet'],
            duration: 0,
            loop: false
        }
    }
};

export function registerAllAnimations(): void {
    const manager = AnimationManager.getInstance();
    
    Object.entries(ANIMATION_DEFINITIONS).forEach(([category, animations]) => {
        Object.entries(animations).forEach(([name, definition]) => {
            const key = `${category}/${name}`;
            manager.registerAnimation(key, definition as AnimationDefinition);
        });
    });
}