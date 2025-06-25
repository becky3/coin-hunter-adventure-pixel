/**
 * レトロゲーム風パレットシステム
 * 
 * 8ビット機の制限を再現：
 * - 背景：4色×4パレット（1パレット目の0番は共通背景色）
 * - スプライト：4色×4パレット（各パレットの0番は透明）
 */

import { SpriteLoader, SPRITE_DEFINITIONS } from './spriteLoader.js';

class PaletteSystem {
    constructor() {
        this.masterPalette = {
            // グレースケール (00-0F)
            0x00: '#000000', // 黒
            0x01: '#757575', // グレー
            0x02: '#BCBCBC', // ライトグレー
            0x03: '#FFFFFF', // 白
            
            // 青系 (10-1F)
            0x10: '#0000AB', // ダークブルー
            0x11: '#233BEF', // ブルー
            0x12: '#5F73FF', // ライトブルー
            0x13: '#C7D7FF', // ペールブルー
            
            // 紫系 (20-2F)
            0x20: '#8F0077', // ダークパープル
            0x21: '#BF00BF', // パープル
            0x22: '#F77BFF', // ライトパープル
            0x23: '#FFC7FF', // ペールパープル
            
            // 赤系 (30-3F)
            0x30: '#AB0013', // ダークレッド
            0x31: '#E7005B', // レッド
            0x32: '#FF77B7', // ライトレッド
            0x33: '#FFC7DB', // ペールレッド
            
            // オレンジ系 (40-4F)
            0x40: '#A70000', // ダークオレンジ
            0x41: '#DB2B00', // オレンジ
            0x42: '#FF7763', // ライトオレンジ
            0x43: '#FFBFB3', // ペールオレンジ
            
            // 黄色系 (50-5F)
            0x50: '#432F00', // ダークイエロー
            0x51: '#8B7300', // イエロー
            0x52: '#F3BF3F', // ライトイエロー
            0x53: '#FFE7A3', // ペールイエロー
            
            // 緑系 (60-6F)
            0x60: '#004700', // ダークグリーン
            0x61: '#009700', // グリーン
            0x62: '#83D313', // ライトグリーン
            0x63: '#E3FFA3', // ペールグリーン
            
            // 特殊色
            0x70: '#7B7B00', // カーキ
            0x71: '#90DB6A', // 黄緑
            0x80: '#1C0092', // インディゴ
            0x81: '#3C37FF', // コバルトブルー
            0x90: '#3D1C7D', // バイオレット
            0x91: '#8B55FC', // ラベンダー
        };
        
        // 現在のステージパレット
        this.currentStagePalette = null;
        
        // スプライトローダー
        this.spriteLoader = new SpriteLoader();
    }

    /**
     * ステージパレットの作成
     * @param {Object} config - パレット設定
     * @param {Array} config.background - 背景パレット（4色×4）
     * @param {Array} config.sprite - スプライトパレット（4色×4）
     */
    createStagePalette(config) {
        return {
            background: config.background.map(palette => 
                palette.map(colorIndex => this.masterPalette[colorIndex] || '#000000')
            ),
            sprite: config.sprite.map(palette => 
                palette.map(colorIndex => colorIndex === 0 ? null : this.masterPalette[colorIndex] || '#000000')
            )
        };
    }

    /**
     * ステージパレットの設定
     */
    setStagePalette(stagePalette) {
        this.currentStagePalette = stagePalette;
    }

    /**
     * 色の取得
     * @param {string} type - 'background' または 'sprite'
     * @param {number} paletteIndex - パレット番号（0-3）
     * @param {number} colorIndex - 色番号（0-3）
     */
    getColor(type, paletteIndex, colorIndex) {
        if (!this.currentStagePalette) return '#000000';
        
        const palette = this.currentStagePalette[type];
        if (!palette || !palette[paletteIndex]) return '#000000';
        
        return palette[paletteIndex][colorIndex];
    }

    /**
     * スプライトデータを読み込む
     * @param {string} category - カテゴリ
     * @param {string} name - スプライト名
     * @returns {Promise<Array>} スプライトのピクセルデータ
     */
    async loadSpriteData(category, name) {
        const sprite = await this.spriteLoader.loadSprite(category, name);
        return sprite.data;
    }

    /**
     * 全スプライトデータを読み込む
     * @returns {Promise<Object>} 全スプライトデータ
     */
    async loadAllSprites() {
        const allSprites = {};
        
        for (const [category, names] of Object.entries(SPRITE_DEFINITIONS)) {
            const categorySprites = await this.spriteLoader.loadCategory(category, names);
            
            categorySprites.forEach((sprite, key) => {
                const spriteName = key.split('/')[1];
                allSprites[spriteName] = sprite.data;
            });
        }
        
        return allSprites;
    }
}

// プリセットステージパレット
const STAGE_PALETTES = {
    // ステージ1：草原
    grassland: {
        background: [
            [0x12, 0x03, 0x02, 0x01],
            [0x12, 0x62, 0x61, 0x60],
            [0x12, 0x53, 0x52, 0x51],
            [0x12, 0x32, 0x31, 0x30]
        ],
        sprite: [
            [0, 0x11, 0x43, 0x50],    // プレイヤー
            [0, 0x61, 0x62, 0x60],    // スライム
            [0, 0x21, 0x22, 0x03],    // 鳥
            [0, 0x52, 0x53, 0x51]     // コイン
        ]
    },
    
    // ステージ2：洞窟
    cave: {
        background: [
            [0x00, 0x01, 0x02, 0x10],
            [0x00, 0x50, 0x70, 0x01],
            [0x00, 0x10, 0x11, 0x80],
            [0x00, 0x30, 0x31, 0x20]
        ],
        sprite: [
            [0, 0x11, 0x43, 0x50],    // プレイヤー
            [0, 0x90, 0x91, 0x20],    // スライム（紫版）
            [0, 0x30, 0x31, 0x32],    // コウモリ
            [0, 0x52, 0x53, 0x51]     // コイン
        ]
    },
    
    // ステージ3：雪原
    snow: {
        background: [
            [0x13, 0x03, 0x02, 0x12],
            [0x13, 0x03, 0x81, 0x11],
            [0x13, 0x60, 0x61, 0x71],
            [0x13, 0x10, 0x11, 0x12]
        ],
        sprite: [
            [0, 0x31, 0x43, 0x50],    // プレイヤー（赤い服）
            [0, 0x03, 0x02, 0x12],    // 雪だるま
            [0, 0x00, 0x03, 0x41],    // ペンギン
            [0, 0x52, 0x53, 0x51]     // コイン
        ]
    }
};

/**
 * カテゴリに対応する色パレットを取得
 * @param {string} paletteName - パレット名（character, enemy, items, grassland, ui）
 * @returns {Object} 色パレット（0:透明, 1-3:色）
 */
function getColorPalette(paletteName) {
    // シンプルなパレット定義
    const palettes = {
        character: {
            0: null,           // 透明
            1: '#4169E1',     // 青（服）
            2: '#FFB6C1',     // ピンク（肌）
            3: '#8B4513'      // 茶色（靴）
        },
        enemy: {
            0: null,           // 透明
            1: '#228B22',     // 緑
            2: '#90EE90',     // ライトグリーン
            3: '#006400'      // ダークグリーン
        },
        items: {
            0: null,           // 透明
            1: '#FFD700',     // ゴールド
            2: '#FFA500',     // オレンジ
            3: '#FF8C00'      // ダークオレンジ
        },
        grassland: {
            0: null,           // 透明
            1: '#228B22',     // 緑（草）
            2: '#8B4513',     // 茶色（土）
            3: '#87CEEB'      // 空色
        },
        ui: {
            0: null,           // 透明
            1: '#FF0000',     // 赤
            2: '#FFFFFF',     // 白
            3: '#000000'      // 黒
        }
    };
    
    return palettes[paletteName] || palettes.character;
}

export { PaletteSystem, STAGE_PALETTES, SPRITE_DEFINITIONS, getColorPalette };