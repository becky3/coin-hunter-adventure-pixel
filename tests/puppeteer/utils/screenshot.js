/**
 * スクリーンショット出力用ユーティリティ
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 現在のファイルのディレクトリを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// スクリーンショット出力先ディレクトリ
const SCREENSHOT_DIR = path.resolve(__dirname, '../../screenshots');

/**
 * スクリーンショットを撮影して保存
 * @param {Page} page - Puppeteerのページオブジェクト
 * @param {string} filename - ファイル名（拡張子含む）
 * @param {Object} options - 追加オプション
 * @returns {Promise<string>} 保存されたファイルのパス
 */
export async function takeScreenshot(page, filename, options = {}) {
    const filepath = path.join(SCREENSHOT_DIR, filename);
    
    // スクリーンショットを撮影
    await page.screenshot({
        path: filepath,
        ...options
    });
    
    console.log(`📸 Screenshot saved: ${filename}`);
    return filepath;
}

/**
 * タイムスタンプ付きのスクリーンショットを撮影
 * @param {Page} page - Puppeteerのページオブジェクト
 * @param {string} prefix - ファイル名のプレフィックス
 * @param {Object} options - 追加オプション
 * @returns {Promise<string>} 保存されたファイルのパス
 */
export async function takeTimestampedScreenshot(page, prefix, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}_${timestamp}.png`;
    return takeScreenshot(page, filename, options);
}

/**
 * ゲーム状態を含むデバッグスクリーンショットを撮影
 * @param {Page} page - Puppeteerのページオブジェクト
 * @param {string} filename - ファイル名
 * @param {string} description - 説明文
 * @returns {Promise<Object>} スクリーンショット情報とゲーム状態
 */
export async function takeDebugScreenshot(page, filename, description = '') {
    // ゲーム状態を取得
    const gameState = await page.evaluate(() => {
        const player = window.game?.stateManager?.currentState?.player;
        const state = window.game?.stateManager?.currentState;
        
        if (!player) return null;
        
        return {
            player: {
                x: Math.round(player.x),
                y: Math.round(player.y),
                vy: Math.round(player.vy * 100) / 100,
                animState: player.animState,
                spriteKey: player.spriteKey,
                grounded: player.grounded,
                visible: player.visible
            },
            game: {
                currentState: state?.constructor?.name || 'unknown',
                isPaused: state?.isPaused || false
            }
        };
    });
    
    // スクリーンショットを撮影
    const filepath = await takeScreenshot(page, filename);
    
    // デバッグ情報を出力
    if (description) {
        console.log(`  ${description}`);
    }
    if (gameState) {
        console.log(`  Player: y=${gameState.player.y}, state=${gameState.player.animState}, grounded=${gameState.player.grounded}`);
    }
    
    return {
        filepath,
        gameState,
        description
    };
}

// ディレクトリパスをエクスポート
export { SCREENSHOT_DIR };