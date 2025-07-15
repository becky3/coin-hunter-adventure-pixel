
import playerIdle from './player/idle.json';
import playerIdleSmall from './player/idle_small.json';
import playerWalk1 from './player/walk1.json';
import playerWalk2 from './player/walk2.json';
import playerWalk3 from './player/walk3.json';
import playerWalk4 from './player/walk4.json';
import playerWalkSmall1 from './player/walk_small1.json';
import playerWalkSmall2 from './player/walk_small2.json';
import playerWalkSmall3 from './player/walk_small3.json';
import playerWalkSmall4 from './player/walk_small4.json';
import playerJump1 from './player/jump1.json';
import playerJump2 from './player/jump2.json';
import playerJumpSmall1 from './player/jump_small1.json';
import playerJumpSmall2 from './player/jump_small2.json';

import terrainSpring from './terrain/spring.json';
import terrainGoalFlag from './terrain/goal_flag.json';
import terrainCloudLarge from './terrain/cloud_large.json';
import terrainCloudSmall from './terrain/cloud_small.json';
import terrainGroundTile from './terrain/ground_tile.json';

import itemsCoinSpin1 from './items/coin_spin1.json';
import itemsCoinSpin2 from './items/coin_spin2.json';
import itemsCoinSpin3 from './items/coin_spin3.json';
import itemsCoinSpin4 from './items/coin_spin4.json';

import enemiesSlime from './enemies/slime.json';
import enemiesSlimeIdle1 from './enemies/slime_idle1.json';
import enemiesSlimeIdle2 from './enemies/slime_idle2.json';
import enemiesBirdFly1 from './enemies/bird_fly1.json';
import enemiesBirdFly2 from './enemies/bird_fly2.json';
import enemiesBatHang from './enemies/bat_hang.json';
import enemiesBatFly1 from './enemies/bat_fly1.json';
import enemiesBatFly2 from './enemies/bat_fly2.json';
import enemiesSpiderIdle from './enemies/spider/spider_idle.json';
import enemiesSpiderWalk1 from './enemies/spider/spider_walk1.json';
import enemiesSpiderWalk2 from './enemies/spider/spider_walk2.json';
import enemiesSpiderThread from './enemies/spider/spider_thread.json';

import uiHeart from './ui/heart.json';
import uiHeartEmpty from './ui/heart_empty.json';

import environmentCloud1 from './environment/cloud1.json';
import environmentCloud2 from './environment/cloud2.json';
import environmentTree1 from './environment/tree1.json';

import tilesGround from './tiles/ground.json';
import tilesGrassGround from './tiles/grass_ground.json';
import tilesSpike from './tiles/spike.json';

export const spriteDataMap: Record<string, unknown> = {
    'player/idle': playerIdle,
    'player/idle_small': playerIdleSmall,
    'player/walk1': playerWalk1,
    'player/walk2': playerWalk2,
    'player/walk3': playerWalk3,
    'player/walk4': playerWalk4,
    'player/walk_small1': playerWalkSmall1,
    'player/walk_small2': playerWalkSmall2,
    'player/walk_small3': playerWalkSmall3,
    'player/walk_small4': playerWalkSmall4,
    'player/jump1': playerJump1,
    'player/jump2': playerJump2,
    'player/jump_small1': playerJumpSmall1,
    'player/jump_small2': playerJumpSmall2,
    'terrain/spring': terrainSpring,
    'terrain/goal_flag': terrainGoalFlag,
    'terrain/cloud_large': terrainCloudLarge,
    'terrain/cloud_small': terrainCloudSmall,
    'terrain/ground_tile': terrainGroundTile,
    'items/coin_spin1': itemsCoinSpin1,
    'items/coin_spin2': itemsCoinSpin2,
    'items/coin_spin3': itemsCoinSpin3,
    'items/coin_spin4': itemsCoinSpin4,
    'enemies/slime': enemiesSlime,
    'enemies/slime_idle1': enemiesSlimeIdle1,
    'enemies/slime_idle2': enemiesSlimeIdle2,
    'enemies/bird_fly1': enemiesBirdFly1,
    'enemies/bird_fly2': enemiesBirdFly2,
    'enemies/bat_hang': enemiesBatHang,
    'enemies/bat_fly1': enemiesBatFly1,
    'enemies/bat_fly2': enemiesBatFly2,
    'enemies/spider_idle': enemiesSpiderIdle,
    'enemies/spider_walk1': enemiesSpiderWalk1,
    'enemies/spider_walk2': enemiesSpiderWalk2,
    'enemies/spider_thread': enemiesSpiderThread,
    'ui/heart': uiHeart,
    'ui/heart_empty': uiHeartEmpty,
    'environment/cloud1': environmentCloud1,
    'environment/cloud2': environmentCloud2,
    'environment/tree1': environmentTree1,
    'tiles/ground': tilesGround,
    'tiles/grass_ground': tilesGrassGround,
    'tiles/spike': tilesSpike,
};