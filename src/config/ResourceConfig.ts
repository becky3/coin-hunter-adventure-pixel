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

export interface CharacterPhysicsConfig {
  width: number;
  height: number;
  speed?: number;
  jumpPower?: number;
  minJumpTime?: number;
  maxJumpTime?: number;
  moveSpeed?: number;
  jumpHeight?: number;
  jumpInterval?: number;
  airResistance?: number;
  gravityScale?: number;
  maxFallSpeed?: number;
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

export interface CharacterConfig {
  physics: CharacterPhysicsConfig;
  stats: CharacterStatsConfig;
  spawn?: {
    x: number;
    y: number;
  };
  knockback?: {
    vertical: number;
    horizontal: number;
  };
  animations?: {
    [key: string]: CharacterAnimationConfig;
  };
  ai?: {
    type: string;
    detectRange: number;
    attackRange: number;
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
    [key: string]: any;
  };
  sprite?: {
    category?: string;
    name?: string;
    animation?: string;
  };
}

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