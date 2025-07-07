// Auto-generated bundled data imports
// This file imports all JSON data files to bundle them with the app

// Resource config files
import resourceIndex from '../config/resources/index.json';
import resourceSprites from '../config/resources/sprites.json';
import resourceCharacters from '../config/resources/characters.json';
import resourceAudio from '../config/resources/audio.json';
import resourceObjects from '../config/resources/objects.json';
import resourcePhysics from '../config/resources/physics.json';

// BGM files
import bgmTitle from '../config/resources/bgm/title.json';
import bgmGame from '../config/resources/bgm/game.json';
import bgmVictory from '../config/resources/bgm/victory.json';
import bgmGameover from '../config/resources/bgm/gameover.json';

// SE files
import seButton from '../config/resources/se/button.json';
import seCoin from '../config/resources/se/coin.json';
import seDamage from '../config/resources/se/damage.json';
import seEnemyDefeat from '../config/resources/se/enemyDefeat.json';
import seGameStart from '../config/resources/se/gameStart.json';
import seGoal from '../config/resources/se/goal.json';
import seJump from '../config/resources/se/jump.json';

// Stage files
import stageList from '../levels/data/stages.json';
import stage0_1 from '../levels/data/stage0-1.json';
import stage0_2 from '../levels/data/stage0-2.json';
import stage0_3 from '../levels/data/stage0-3.json';
import stage1_1 from '../levels/data/stage1-1.json';
import stage1_2 from '../levels/data/stage1-2.json';
import stage1_3 from '../levels/data/stage1-3.json';
import level1 from '../levels/data/level1.json';
import performanceTest from '../levels/data/performance-test.json';

// Export all bundled data
export const bundledResourceData: Record<string, unknown> = {
    '/src/config/resources/index.json': resourceIndex,
    '/src/config/resources/sprites.json': resourceSprites,
    '/src/config/resources/characters.json': resourceCharacters,
    '/src/config/resources/audio.json': resourceAudio,
    '/src/config/resources/objects.json': resourceObjects,
    '/src/config/resources/physics.json': resourcePhysics,
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
};

export const bundledStageData: Record<string, unknown> = {
    '/src/levels/data/stages.json': stageList,
    '/src/levels/data/stage0-1.json': stage0_1,
    '/src/levels/data/stage0-2.json': stage0_2,
    '/src/levels/data/stage0-3.json': stage0_3,
    '/src/levels/data/stage1-1.json': stage1_1,
    '/src/levels/data/stage1-2.json': stage1_2,
    '/src/levels/data/stage1-3.json': stage1_3,
    '/src/levels/data/level1.json': level1,
    '/src/levels/data/performance-test.json': performanceTest,
};

// Combined export for convenience
export const allBundledData: Record<string, unknown> = {
    ...bundledResourceData,
    ...bundledMusicData,
    ...bundledStageData,
};