
import resourceIndex from '../config/resources/index.json';
import resourceSprites from '../config/resources/sprites.json';
import resourceAudio from '../config/resources/audio.json';
import resourcePhysics from '../config/resources/physics.json';

import entityPlayer from '../config/entities/player.json';
import entitySlime from '../config/entities/enemies/slime.json';
import entityBat from '../config/entities/enemies/bat.json';
import entitySpider from '../config/entities/enemies/spider.json';
import entityArmorKnight from '../config/entities/enemies/armor_knight.json';
import entityCoin from '../config/entities/items/coin.json';
import entitySpring from '../config/entities/terrain/spring.json';
import entityGoalFlag from '../config/entities/terrain/goal_flag.json';
import entityFallingFloor from '../config/entities/terrain/falling_floor.json';
import entityPowerGlove from '../config/entities/powerups/power_glove.json';
import entityShieldStone from '../config/entities/powerups/shield_stone.json';

import bgmTitle from '../config/resources/bgm/title.json';
import bgmGame from '../config/resources/bgm/game.json';
import bgmVictory from '../config/resources/bgm/victory.json';
import bgmGameover from '../config/resources/bgm/gameover.json';

import seButton from '../config/resources/se/button.json';
import seCoin from '../config/resources/se/coin.json';
import seDamage from '../config/resources/se/damage.json';
import seEnemyDefeat from '../config/resources/se/enemyDefeat.json';
import seGameStart from '../config/resources/se/gameStart.json';
import seGoal from '../config/resources/se/goal.json';
import seJump from '../config/resources/se/jump.json';
import sePowerup from '../config/resources/se/powerup.json';
import seProjectile from '../config/resources/se/projectile.json';

import stageList from '../levels/data/stages.json';
import stage0_1 from '../levels/data/stage0-1.json';
import stage0_2 from '../levels/data/stage0-2.json';
import stage0_3 from '../levels/data/stage0-3.json';
import stage0_4 from '../levels/data/stage0-4.json';
import stage0_5 from '../levels/data/stage0-5.json';
import stage0_6 from '../levels/data/stage0-6.json';
import stage0_7 from '../levels/data/stage0-7.json';
import stage1_1 from '../levels/data/stage1-1.json';
import stage1_2 from '../levels/data/stage1-2.json';
import stage1_3 from '../levels/data/stage1-3.json';
import stage2_1 from '../levels/data/stage2-1.json';
import stage2_2 from '../levels/data/stage2-2.json';
import stage2_3 from '../levels/data/stage2-3.json';
import level1 from '../levels/data/level1.json';
import performanceTest from '../levels/data/performance-test.json';
import stageBulletTest from '../levels/data/stage-bullet-test.json';
import testAllSprites from '../levels/data/test-all-sprites.json';
import testArmorKnight from '../levels/data/test-armor-knight.json';
import testArmorKnightStomp from '../levels/data/test-armor-knight-stomp.json';
import stageTestFallingFloor from '../levels/data/stage-test-falling-floor.json';

export const bundledResourceData: Record<string, unknown> = {
    '/src/config/resources/index.json': resourceIndex,
    '/src/config/resources/sprites.json': resourceSprites,
    '/src/config/resources/audio.json': resourceAudio,
    '/src/config/resources/physics.json': resourcePhysics,
    '/src/config/entities/player.json': entityPlayer,
    '/src/config/entities/enemies/slime.json': entitySlime,
    '/src/config/entities/enemies/bat.json': entityBat,
    '/src/config/entities/enemies/spider.json': entitySpider,
    '/src/config/entities/enemies/armor_knight.json': entityArmorKnight,
    '/src/config/entities/items/coin.json': entityCoin,
    '/src/config/entities/terrain/spring.json': entitySpring,
    '/src/config/entities/terrain/goal_flag.json': entityGoalFlag,
    '/src/config/entities/terrain/falling_floor.json': entityFallingFloor,
    '/src/config/entities/powerups/power_glove.json': entityPowerGlove,
    '/src/config/entities/powerups/shield_stone.json': entityShieldStone,
};

export const bundledMusicData: Record<string, unknown> = {
    '/src/config/resources/bgm/title.json': bgmTitle,
    '/src/config/resources/bgm/game.json': bgmGame,
    '/src/config/resources/bgm/victory.json': bgmVictory,
    '/src/config/resources/bgm/gameover.json': bgmGameover,
    '/src/config/resources/se/button.json': seButton,
    '/src/config/resources/se/coin.json': seCoin,
    '/src/config/resources/se/damage.json': seDamage,
    '/src/config/resources/se/enemyDefeat.json': seEnemyDefeat,
    '/src/config/resources/se/gameStart.json': seGameStart,
    '/src/config/resources/se/goal.json': seGoal,
    '/src/config/resources/se/jump.json': seJump,
    '/src/config/resources/se/powerup.json': sePowerup,
    '/src/config/resources/se/projectile.json': seProjectile,
};

export const bundledStageData: Record<string, unknown> = {
    '/src/levels/data/stages.json': stageList,
    '/src/levels/data/stage0-1.json': stage0_1,
    '/src/levels/data/stage0-2.json': stage0_2,
    '/src/levels/data/stage0-3.json': stage0_3,
    '/src/levels/data/stage0-4.json': stage0_4,
    '/src/levels/data/stage0-5.json': stage0_5,
    '/src/levels/data/stage0-6.json': stage0_6,
    '/src/levels/data/stage0-7.json': stage0_7,
    '/src/levels/data/stage1-1.json': stage1_1,
    '/src/levels/data/stage1-2.json': stage1_2,
    '/src/levels/data/stage1-3.json': stage1_3,
    '/src/levels/data/stage2-1.json': stage2_1,
    '/src/levels/data/stage2-2.json': stage2_2,
    '/src/levels/data/stage2-3.json': stage2_3,
    '/src/levels/data/level1.json': level1,
    '/src/levels/data/performance-test.json': performanceTest,
    '/src/levels/data/stage-bullet-test.json': stageBulletTest,
    '/src/levels/data/test-all-sprites.json': testAllSprites,
    '/src/levels/data/test-armor-knight.json': testArmorKnight,
    '/src/levels/data/test-armor-knight-stomp.json': testArmorKnightStomp,
    '/src/levels/data/stage-test-falling-floor.json': stageTestFallingFloor,
};

export const allBundledData: Record<string, unknown> = {
    ...bundledResourceData,
    ...bundledMusicData,
    ...bundledStageData,
};