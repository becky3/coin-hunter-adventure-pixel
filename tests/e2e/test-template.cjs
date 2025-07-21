/**
 * E2Eテストテンプレート
 * 
 * このファイルをコピーして新しいテストを作成してください。
 * ファイル名は test-[機能名].cjs の形式にしてください。
 * 
 * 例: test-new-enemy.cjs, test-special-item.cjs
 */

const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');

async function runTest() {
    const test = new GameTestHelpers({
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000  // テストのタイムアウト時間（ミリ秒）
    });

    await test.runTest(async (t) => {
        // ============================================================
        // テストの初期化
        // ============================================================
        await t.init('My Test Name');  // テスト名を設定
        
        // ============================================================
        // ゲームの開始 - これだけでプレイヤー操作可能な状態になります！
        // ============================================================
        // 最もシンプルな方法：
        await t.quickStart('1-1');  // ステージ1-1で開始
        
        // オプションを指定する場合：
        // await t.quickStart('test-enemy', {
        //     skipTitle: false,      // タイトル画面を表示する
        //     ensureFocus: true,     // 入力フォーカスを自動設定
        //     injectErrorTracking: true  // エラー追跡を有効化
        // });
        
        // ============================================================
        // プレイヤーやエンティティの取得
        // ============================================================
        
        // プレイヤーの情報を取得
        const player = await t.getEntity('player');
        console.log('Player position:', player.x, player.y);
        console.log('Player health:', player.health);
        console.log('Player size:', player.isSmall ? 'small' : 'large');
        
        // 全ての敵を取得
        const enemies = await t.getEntity('enemies');
        console.log('Number of enemies:', enemies.length);
        
        // 特定の敵を取得（単体）
        // const slime = await t.getEntity('Slime', { single: true });
        // if (slime) {
        //     console.log('Slime found at:', slime.x, slime.y);
        // }
        
        // 全てのアイテムを取得
        const items = await t.getEntity('items');
        console.log('Number of items:', items.length);
        
        // ============================================================
        // プレイヤーの操作
        // ============================================================
        
        // 右に1秒間移動
        await t.movePlayer('right', 1000);
        
        // ジャンプ
        await t.jumpPlayer();
        
        // プレイヤーが着地するまで待つ
        await t.waitForPlayerGrounded();
        
        // ============================================================
        // 便利な機能
        // ============================================================
        
        // プレイヤーを特定の位置にテレポート（テスト準備に便利）
        // await t.teleportPlayer(300, 100);
        
        // 特定のエンティティが出現するまで待つ
        // await t.waitForEntity('Boss', 5000);
        
        // 現在のライフ数を確認
        const lives = await t.getLives();
        console.log('Current lives:', lives);
        
        // ステージ情報を取得
        const stageInfo = await t.getStageInfo();
        console.log('Stage name:', stageInfo.name);
        console.log('Stage size:', stageInfo.width, 'x', stageInfo.height);
        
        // スクリーンショットを撮る（デバッグに便利）
        // await t.screenshot('test-scene');
        
        // ============================================================
        // テストのアサーション（検証）
        // ============================================================
        
        // 例: プレイヤーが右に移動したことを確認
        const playerAfter = await t.getEntity('player');
        t.assert(playerAfter.x > player.x, 'Player should have moved right');
        
        // 例: プレイヤーの体力が減っていないことを確認
        t.assert(playerAfter.health === player.health, 'Player health should not change');
        
        // ============================================================
        // エラーチェック（テストの最後に必ず実行）
        // ============================================================
        await t.checkForErrors();
    });
}

// テストを実行
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;

/* ============================================================
 * よく使うパターン集
 * ============================================================
 * 
 * 1. 敵との衝突をテストする場合：
 * -----------------------------------
 * // 敵の位置を取得
 * const enemy = await t.getEntity('Slime', { single: true });
 * 
 * // プレイヤーを敵の近くに配置
 * await t.teleportPlayer(enemy.x - 50, enemy.y);
 * 
 * // プレイヤーを敵に向かって移動
 * await t.movePlayer('right', 2000);
 * 
 * // プレイヤーの状態を確認
 * const playerAfter = await t.getEntity('player');
 * t.assert(playerAfter.isSmall, 'Player should be small after enemy collision');
 * 
 * 
 * 2. アイテムの収集をテストする場合：
 * -----------------------------------
 * // コインの位置を取得
 * const coin = await t.getEntity('Coin', { single: true });
 * 
 * // プレイヤーをコインの位置に移動
 * await t.teleportPlayer(coin.x, coin.y);
 * await t.wait(100);
 * 
 * // コインが収集されたか確認
 * const coinsAfter = await t.getEntity('Coin');
 * t.assert(coinsAfter.length === 0, 'Coin should be collected');
 * 
 * 
 * 3. 敵を踏みつけるテストの場合：
 * -----------------------------------
 * // 敵の上にプレイヤーを配置
 * const enemy = await t.getEntity('Slime', { single: true });
 * await t.teleportPlayer(enemy.x, enemy.y - 50);
 * 
 * // 落下させる
 * await t.wait(1000);
 * 
 * // 敵が倒されたか確認
 * const enemiesAfter = await t.getEntity('enemies');
 * t.assert(enemiesAfter.length === 0, 'Enemy should be defeated');
 * 
 * 
 * 4. 時間経過をシミュレートする場合：
 * -----------------------------------
 * // 10秒間ランダムに動き回る
 * await t.simulateGameplay(10000);
 * 
 * 
 * 5. パフォーマンスを監視する場合：
 * -----------------------------------
 * const report = await t.monitorPerformance(5000, async () => {
 *     // パフォーマンス測定中に実行するアクション
 *     await t.movePlayer('right', 2000);
 *     await t.jumpPlayer();
 *     await t.movePlayer('left', 2000);
 * });
 * 
 * t.assert(report.averageFps >= 55, 'FPS should be above 55');
 * 
 * ============================================================
 */