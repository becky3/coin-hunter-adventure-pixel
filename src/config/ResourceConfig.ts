import { PhysicsLayer } from '../physics/PhysicsSystem';

export interface BasePhysicsConfig {
  width: number;
  height: number;
  physicsLayer: PhysicsLayer;
}

export interface BaseStatsConfig {
  [key: string]: unknown;
}

export interface BaseEntityConfig {
  physics: BasePhysicsConfig;
}

export interface SpriteConfig {
  name: string;
  type: string;
}

export interface AnimationConfig {
  name: string;
  frameCount: number;
  frameDuration: number;
}

export interface SpriteCategoryConfig {
  sprites: SpriteConfig[];
  animations: AnimationConfig[];
}

export interface SpritesConfig {
  basePath: string;
  categories: {
    [key: string]: SpriteCategoryConfig;
  };
}

export interface CharacterPhysicsConfig extends BasePhysicsConfig {
  airResistance: number;
  gravityScale: number;
  maxFallSpeed: number;
}

export interface CharacterStatsConfig {
  maxHealth: number;
  invulnerabilityTime?: number;
  damage?: number;
  scoreValue?: number;
}

export interface CharacterAnimationConfig {
  speed: number;
  frameCount: number;
}

export interface CharacterConfig extends BaseEntityConfig {
  physics: CharacterPhysicsConfig;
  stats: CharacterStatsConfig;
  spawn?: {
    x: number;
    y: number;
  };
  animations?: {
    [key: string]: CharacterAnimationConfig;
  };
  ai?: {
    detectRange: number;
    attackRange: number;
    detectRangeWidth?: number;
    detectRangeHeight?: number;
    chargeSpeedMultiplier?: number;
  };
}

export interface AudioConfig {
  type: string;
  tempo?: number;
  volume: number;
  instruments?: string[];
  description?: string;
  duration?: number;
  waveform?: string;
  frequency?: {
    start: number;
    end: number;
  };
}

export interface ObjectConfig {
  physics: {
    width: number;
    height: number;
    solid: boolean;
  };
  properties: {
    [key: string]: unknown;
  };
  sprite?: {
    category?: string;
    name?: string;
    animation?: string;
  };
}

export interface PlayerPhysicsConfig extends CharacterPhysicsConfig {
  smallWidth: number;
  smallHeight: number;
  speed: number;
  jumpPower: number;
  variableJumpBoost: number;
  variableJumpBoostMultiplier: number;
  minJumpTime: number;
  maxJumpTime: number;
  dashSpeedMultiplier: number;
  dashAccelerationTime: number;
  dashAnimationSpeed: number;
}

export interface PlayerConfig extends CharacterConfig {
  physics: PlayerPhysicsConfig;
  stats: {
    maxHealth: number;
    invulnerabilityTime: number;
  };
  spawn: {
    x: number;
    y: number;
  };
  animations: {
    [key: string]: CharacterAnimationConfig;
  };
  sprites: {
    category: string;
    animations: {
      [key: string]: {
        frameCount: number;
        frameDuration: number;
      };
    };
  };
}

export interface EnemyPhysicsConfig extends CharacterPhysicsConfig {
  moveSpeed: number;
  jumpHeight: number;
  jumpInterval: number;
}

export interface EnemyConfig extends CharacterConfig {
  physics: EnemyPhysicsConfig;
  stats: {
    maxHealth: number;
    damage: number;
    scoreValue: number;
  };
  ai: {
    detectRange: number;
    attackRange: number;
    detectRangeWidth?: number;
    detectRangeHeight?: number;
  };
  sprites: {
    category: string;
    name?: string;
    sprites?: string[];
    animations?: {
      [key: string]: {
        name?: string;
        sprite?: string;
        sprites?: string[];
        frameCount?: number;
        frameDuration?: number;
      };
    };
  };
}

export interface ItemPhysicsConfig extends BasePhysicsConfig {
  solid: boolean;
}

export interface BaseItemConfig extends BaseEntityConfig {
  physics: ItemPhysicsConfig;
  sprites: {
    category: string;
  };
}

export interface CoinConfig extends BaseItemConfig {
  properties: {
    scoreValue: number;
    animationSpeed: number;
    floatAmplitude: number;
    floatSpeed: number;
  };
  sprites: BaseItemConfig['sprites'] & {
    animation: {
      name: string;
      frameCount: number;
      frameDuration: number;
    };
  };
}

export interface SpringConfig extends BaseItemConfig {
  properties: {
    expansionSpeed: number;
  };
  sprites: BaseItemConfig['sprites'] & {
    name: string;
  };
}

export interface FallingFloorConfig extends BaseItemConfig {
  properties: {
    shakeAmplitude: number;
    shakeFrequency: number;
    shakeTime: number;
  };
  sprites: BaseItemConfig['sprites'] & {
    sprites: {
      normal: string;
      crack1: string;
      crack2: string;
      broken: string;
    };
  };
}

export interface PowerUpConfig extends BaseItemConfig {
  properties: {
    floatSpeed: number;
    floatAmplitude: number;
  };
  sprites: BaseItemConfig['sprites'] & {
    name: string;
  };
}

export interface GoalFlagConfig extends BaseItemConfig {
  properties: {
    waveAmplitude: number;
    waveSpeed: number;
  };
  sprites: BaseItemConfig['sprites'] & {
    name: string;
  };
}

export type ItemConfig = CoinConfig | SpringConfig | FallingFloorConfig | PowerUpConfig | GoalFlagConfig;

export type EntityConfig = PlayerConfig | EnemyConfig | ItemConfig;

export interface ResourceIndexConfig {
  version: string;
  description: string;
  configs: {
    sprites: string;
    characters: string;
    audio: string;
    objects: string;
  };
  paths: {
    sprites: string;
    levels: string;
    fonts: string;
  };
  settings: {
    defaultPalette: string;
    pixelSize: number;
    tileSize: number;
  };
}