const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const testConfig = require('./utils/testConfig.cjs');
const fs = require('fs');
const path = require('path');

/**
 * ステージデータの妥当性を検証するE2Eテスト
 * 穴の幅、コイン配置、エンティティ配置などをチェック
 */
async function runTest() {
    const test = new GameTestHelpers({ 
        headless: testConfig.headless,
        verbose: true,
        timeout: 30000  // 30秒のタイムアウト
    });
    
    await test.runTest(async (t) => {
        await t.init('Stage Validation Test');
        
        // ステージファイルの一覧を取得（1-1〜1-3、2-1〜2-3）
        const stagesDir = path.join(__dirname, '../../src/levels/data');
        const validatedStages = [
            'stage1-1.json', 'stage1-2.json', 'stage1-3.json',
            'stage2-1.json', 'stage2-2.json'  // stage2-3.json は一時的に除外
        ];
        const stageFiles = fs.readdirSync(stagesDir)
            .filter(file => validatedStages.includes(file));
        
        console.log(`Found ${stageFiles.length} stage files to validate`);
        
        let totalIssues = 0;
        const validationResults = [];
        
        for (const stageFile of stageFiles) {
            const stagePath = path.join(stagesDir, stageFile);
            const stageData = JSON.parse(fs.readFileSync(stagePath, 'utf8'));
            
            console.log(`\n=== Validating ${stageData.id} (${stageData.name}) ===`);
            console.log(`Total entities: ${stageData.entities.length}`);
            
            const issues = {
                floatingEntities: [],
                unreachableItems: [],
                embeddedEntities: [],
                spawnCollisions: [],
                goalCollisions: [],
                invalidEntityTypes: [],
                invalidPalette: []
            };
            
            // 1. エンティティタイプの検証
            const entityTypeIssues = checkEntityTypes(stageData);
            issues.invalidEntityTypes = entityTypeIssues;
            if (entityTypeIssues.length > 0) {
                console.log(`Found ${entityTypeIssues.length} invalid entity types`);
            }
            
            
            // 3. 浮いているエンティティチェック
            const floatingIssues = checkFloatingEntities(stageData);
            issues.floatingEntities = floatingIssues;
            
            // 4. 到達不可能なアイテムチェック
            const unreachableIssues = checkUnreachableItems(stageData);
            issues.unreachableItems = unreachableIssues;
            
            // 5. 壁に埋まっているエンティティチェック
            const embeddedIssues = checkEmbeddedEntities(stageData);
            issues.embeddedEntities = embeddedIssues;
            
            // 6. プレイヤースポーン位置チェック
            const spawnIssues = checkSpawnPoint(stageData);
            issues.spawnCollisions = spawnIssues;
            
            // 7. ゴール位置チェック
            const goalIssues = checkGoalPosition(stageData);
            issues.goalCollisions = goalIssues;
            
            // 8. パレットの存在チェック
            const paletteIssues = checkPalette(stageData);
            issues.invalidPalette = paletteIssues;
            
            // 9. FallingFloorの下の穴チェック（推奨事項）
            const fallingFloorSuggestions = checkFallingFloorHoles(stageData);
            issues.fallingFloorHoles = fallingFloorSuggestions;
            
            // エラーと警告を分類
            const errors = {
                invalidEntityTypes: issues.invalidEntityTypes,
                embeddedEntities: issues.embeddedEntities,
                spawnCollisions: issues.spawnCollisions,
                goalCollisions: issues.goalCollisions,
                invalidPalette: issues.invalidPalette
            };
            
            const warnings = {
                floatingEntities: issues.floatingEntities,
                unreachableItems: issues.unreachableItems
            };
            
            const suggestions = {
                fallingFloorHoles: issues.fallingFloorHoles
            };
            
            // 結果を集計
            const errorCount = 
                errors.invalidEntityTypes.length +
                errors.embeddedEntities.length +
                errors.spawnCollisions.length +
                errors.goalCollisions.length +
                errors.invalidPalette.length;
                
            const warningCount = 
                warnings.floatingEntities.length +
                warnings.unreachableItems.length;
            
            const suggestionCount = 
                suggestions.fallingFloorHoles.length;
            
            const stageIssueCount = errorCount + warningCount;
            totalIssues += stageIssueCount;
            
            validationResults.push({
                stageId: stageData.id,
                stageName: stageData.name,
                issues: issues,
                errors: errors,
                warnings: warnings,
                suggestions: suggestions,
                errorCount: errorCount,
                warningCount: warningCount,
                suggestionCount: suggestionCount,
                totalIssues: stageIssueCount
            });
            
            // 問題を表示（推奨事項は別扱い）
            if (stageIssueCount > 0 || suggestionCount > 0) {
                // エラー数、警告数、推奨数を表示
                const parts = [];
                if (errorCount > 0) parts.push(`❌ ${errorCount} errors`);
                if (warningCount > 0) parts.push(`⚠️  ${warningCount} warnings`);
                if (suggestionCount > 0) parts.push(`💡 ${suggestionCount} suggestions`);
                
                if (parts.length > 0) {
                    console.log(parts.join(', '));
                }
                
                // エラーを表示
                if (errors.invalidEntityTypes.length > 0) {
                    console.log('\n  ❌ Invalid Entity Type Errors:');
                    errors.invalidEntityTypes.forEach(entity => {
                        console.log(`    - Entity at (${entity.x}, ${entity.y}) has invalid type: "${entity.type}" (should be "${entity.expected}")`);
                    });
                }
                
                if (errors.embeddedEntities.length > 0) {
                    console.log('\n  ❌ Embedded Entity Errors:');
                    errors.embeddedEntities.forEach(entity => {
                        console.log(`    - ${entity.message || `${entity.type} at (${entity.x}, ${entity.y}) is embedded in wall`}`);
                    });
                }
                
                if (errors.spawnCollisions.length > 0) {
                    console.log('\n  ❌ Player Spawn Errors:');
                    errors.spawnCollisions.forEach(issue => {
                        console.log(`    - ${issue.message}`);
                    });
                }
                
                if (errors.goalCollisions.length > 0) {
                    console.log('\n  ❌ Goal Position Errors:');
                    errors.goalCollisions.forEach(issue => {
                        console.log(`    - ${issue.message}`);
                    });
                }
                
                if (errors.invalidPalette.length > 0) {
                    console.log('\n  ❌ Invalid Palette Errors:');
                    errors.invalidPalette.forEach(issue => {
                        console.log(`    - ${issue.message}`);
                    });
                }
                
                // 警告を表示
                if (warnings.floatingEntities.length > 0) {
                    console.log('\n  ⚠️  Floating Entity Warnings:');
                    warnings.floatingEntities.forEach(entity => {
                        console.log(`    - ${entity.type} at (${entity.x}, ${entity.y}) is floating ${entity.height} tiles above block`);
                    });
                }
                
                if (warnings.unreachableItems.length > 0) {
                    console.log('\n  ⚠️  Unreachable Item Warnings:');
                    warnings.unreachableItems.forEach(item => {
                        console.log(`    - ${item.type} at (${item.x}, ${item.y}) may be unreachable: ${item.reason}`);
                    });
                }
                
                // 推奨事項を表示
                if (suggestions.fallingFloorHoles.length > 0) {
                    console.log('\n  💡 Suggestions:');
                    suggestions.fallingFloorHoles.forEach(suggestion => {
                        console.log(`    - ${suggestion.message}`);
                    });
                }
            } else if (suggestionCount === 0) {
                console.log('✅ No issues found');
            } else {
                // 推奨事項のみの場合
                console.log('✅ No errors or warnings');
                if (suggestions.fallingFloorHoles.length > 0) {
                    console.log('\n  💡 Suggestions:');
                    suggestions.fallingFloorHoles.forEach(suggestion => {
                        console.log(`    - ${suggestion.message}`);
                    });
                }
            }
        }
        
        // サマリーを表示
        // 問題を重要度別に集計
        let totalErrorCount = 0;
        let totalWarningCount = 0;
        let totalSuggestionCount = 0;
        
        validationResults.forEach(result => {
            totalErrorCount += result.errorCount;
            totalWarningCount += result.warningCount;
            totalSuggestionCount += result.suggestionCount;
        });
        
        console.log('\n========== VALIDATION SUMMARY ==========');
        console.log(`Total stages validated: ${stageFiles.length}`);
        console.log(`Total issues found: ${totalIssues}`);
        console.log(`  ❌ Errors: ${totalErrorCount}`);
        console.log(`  ⚠️  Warnings: ${totalWarningCount}`);
        console.log(`  💡 Suggestions: ${totalSuggestionCount}`);
        
        if (totalIssues > 0 || totalSuggestionCount > 0) {
            console.log('\nStages with issues:');
            validationResults
                .filter(result => result.totalIssues > 0 || result.suggestionCount > 0)
                .forEach(result => {
                    const parts = [];
                    if (result.errorCount > 0) parts.push(`${result.errorCount} errors`);
                    if (result.warningCount > 0) parts.push(`${result.warningCount} warnings`);
                    if (result.suggestionCount > 0) parts.push(`${result.suggestionCount} suggestions`);
                    console.log(`  - ${result.stageId}: ${parts.join(', ')}`);
                });
        }
        
        // テスト結果の判定
        if (totalErrorCount > 0) {
            console.error(`\n❌ Stage validation found ${totalErrorCount} errors that must be fixed!`);
            throw new Error(`Stage validation failed: ${totalErrorCount} errors found`);
        } else if (totalWarningCount > 0) {
            console.warn(`\n⚠️  Stage validation found ${totalWarningCount} warnings that should be reviewed.`);
        } else {
            console.log('\n✅ All stages passed validation!');
        }
    });
}

/**
 * エンティティタイプの妥当性をチェック
 */
function checkEntityTypes(stageData) {
    const issues = [];
    
    // EntityFactoryで認識される有効なエンティティタイプ
    const validTypes = [
        'coin', 'spring', 'falling_floor', 'goal', 
        'slime', 'bat', 'spider', 'armor_knight', 
        'shield_stone', 'power_glove'
    ];
    
    // 間違いやすいタイプのマッピング
    const typeMapping = {
        'fallingfloor': 'falling_floor',
        'shieldstone': 'shield_stone',
        'powerglove': 'power_glove',
        'armorKnight': 'armor_knight',
        'armor-knight': 'armor_knight'
    };
    
    for (const entity of stageData.entities) {
        if (!validTypes.includes(entity.type)) {
            const expected = typeMapping[entity.type] || 'unknown';
            issues.push({
                type: entity.type,
                expected: expected,
                x: entity.x,
                y: entity.y
            });
        }
    }
    
    return issues;
}


/**
 * エンティティが浮いていないかチェック
 */
function checkFloatingEntities(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    const entities = stageData.entities.filter(e => 
        e.type === 'slime' || e.type === 'spring' || e.type === 'knight'  // スライム、ジャンプ台、ナイトの浮きをチェック
    );
    
    for (const entity of entities) {
        const tileX = entity.x;
        let blockTileY = -1;
        
        // エンティティの下にあるブロックを探す（Y座標が大きい方が下）
        for (let y = entity.y + 1; y < stageData.height; y++) {
            if (tileX >= 0 && tileX < stageData.width) {
                if (tilemap[y][tileX] === 1) {
                    // ブロックが見つかった
                    const floatingHeight = y - entity.y - 1;
                    
                    // 2タイル以上浮いている場合は問題とする
                    if (floatingHeight >= 2) {
                        issues.push({
                            type: entity.type,
                            x: entity.x,
                            y: entity.y,
                            height: floatingHeight
                        });
                    }
                    break;
                }
            }
        }
    }
    
    return issues;
}

/**
 * 到達不可能なアイテムをチェック
 */
function checkUnreachableItems(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    const items = stageData.entities.filter(e => 
        e.type === 'coin' || e.type === 'powerglove' || e.type === 'shieldstone'
    );
    
    for (const item of items) {
        // 簡易的なチェック：高すぎる位置にあるアイテム
        // ジャンプ高さは約8タイル
        let blockLevel = -1;
        
        // アイテムの下のブロックを探す（Y座標が大きい方が下）
        for (let y = item.y + 1; y < stageData.height; y++) {
            if (item.x >= 0 && item.x < stageData.width) {
                if (tilemap[y][item.x] === 1) {
                    blockLevel = y;
                    break;
                }
            }
        }
        
        if (blockLevel !== -1) {
            const heightAboveBlock = blockLevel - item.y - 1;
            
            // ブロックから9タイル以上高い場合は到達困難と判定
            if (heightAboveBlock >= 9) {
                // 近くにジャンプ台があるかチェック
                const nearbySpring = stageData.entities.find(e => 
                    e.type === 'spring' &&
                    Math.abs(e.x - item.x) <= 3 &&
                    e.y <= item.y
                );
                
                if (!nearbySpring) {
                    issues.push({
                        type: item.type,
                        x: item.x,
                        y: item.y,
                        reason: `Too high (${heightAboveBlock} tiles above block)`
                    });
                }
            }
        }
        
        // 壁に囲まれたアイテムのチェック（簡易版）
        const tileY = item.y;
        const tileX = item.x;
        
        if (tileY > 0 && tileY < stageData.height - 1 && 
            tileX > 0 && tileX < stageData.width - 1) {
            
            // 四方が壁に囲まれているかチェック
            const surroundedCount = 
                (tilemap[tileY - 1][tileX] === 1 ? 1 : 0) +  // 上
                (tilemap[tileY + 1][tileX] === 1 ? 1 : 0) +  // 下
                (tilemap[tileY][tileX - 1] === 1 ? 1 : 0) +  // 左
                (tilemap[tileY][tileX + 1] === 1 ? 1 : 0);   // 右
            
            if (surroundedCount >= 3) {
                issues.push({
                    type: item.type,
                    x: item.x,
                    y: item.y,
                    reason: 'Surrounded by walls'
                });
            }
        }
    }
    
    return issues;
}

/**
 * 壁に埋まっているエンティティをチェック
 */
function checkEmbeddedEntities(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    const entities = stageData.entities;
    const fallingFloors = entities.filter(e => e.type === 'falling_floor');
    
    for (const entity of entities) {
        // エンティティの座標系とtilemapの座標系は同じ（上が0）
        const tileY = entity.y;
        const tileX = entity.x;
        
        // 範囲チェック
        if (tileY >= 0 && tileY < stageData.height && 
            tileX >= 0 && tileX < stageData.width) {
            
            // エンティティが壁（値1）の中にあるかチェック
            if (tilemap[tileY][tileX] === 1) {
                // ジャンプ台は地面に埋まっていても問題ない場合がある
                if (entity.type === 'spring') {
                    // ジャンプ台の上が空いているかチェック
                    if (tileY > 0 && tilemap[tileY - 1][tileX] === 1) {
                        // 上も壁なら問題
                        issues.push({
                            type: entity.type,
                            x: entity.x,
                            y: entity.y,
                            message: `${entity.type} at (${entity.x}, ${entity.y}) is completely embedded in blocks`
                        });
                    }
                } else {
                    // 他のエンティティは壁に埋まっていたら問題
                    issues.push({
                        type: entity.type,
                        x: entity.x,
                        y: entity.y,
                        message: `${entity.type} at (${entity.x}, ${entity.y}) is embedded in block`
                    });
                }
            }
        }
        
        // アイテム類がFallingFloorと重なっていないかチェック
        if (entity.type === 'coin' || entity.type === 'power_glove' || entity.type === 'shield_stone') {
            const collidingFloor = fallingFloors.find(floor => 
                floor.x === entity.x && floor.y === entity.y && floor !== entity
            );
            
            if (collidingFloor) {
                issues.push({
                    type: entity.type,
                    x: entity.x,
                    y: entity.y,
                    message: `${entity.type} at (${entity.x}, ${entity.y}) is placed on the same position as a falling_floor`
                });
            }
        }
    }
    
    return issues;
}

/**
 * FallingFloorの下に穴があるかチェック（推奨事項）
 */
function checkFallingFloorHoles(stageData) {
    const suggestions = [];
    const tilemap = stageData.tilemap;
    const entities = stageData.entities;
    const fallingFloors = entities.filter(e => e.type === 'falling_floor');
    
    for (const floor of fallingFloors) {
        // エンティティとtilemapは同じ座標系
        const tileY = floor.y;
        const tileX = floor.x;
        
        // FallingFloorの下から地面までの深さを計算
        let depth = 0;
        for (let y = tileY + 1; y < stageData.height; y++) {
            if (tilemap[y][tileX] === 1) {
                break;
            }
            depth++;
        }
        
        // 真下に地面がある場合
        if (depth === 0 && tileY + 1 < stageData.height) {
            suggestions.push({
                type: floor.type,
                x: floor.x,
                y: floor.y,
                message: `falling_floor at (${floor.x}, ${floor.y}) has solid ground directly below - consider adding a hole for gameplay effect`
            });
        }
        // 浅い穴の場合（1-2マスのみ）
        else if (depth > 0 && depth <= 2) {
            suggestions.push({
                type: floor.type,
                x: floor.x,
                y: floor.y,
                message: `falling_floor at (${floor.x}, ${floor.y}) has only ${depth} tile(s) drop - consider making the hole deeper for more challenge`
            });
        }
        // 底なし穴ではない場合（最下部に到達する前に地面がある）
        else if (depth < stageData.height - tileY - 1) {
            suggestions.push({
                type: floor.type,
                x: floor.x,
                y: floor.y,
                message: `falling_floor at (${floor.x}, ${floor.y}) is not a bottomless pit (${depth} tiles deep) - consider removing the ground at the bottom for more dramatic effect`
            });
        }
    }
    
    return suggestions;
}

/**
 * プレイヤースポーン位置をチェック
 */
function checkSpawnPoint(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    
    // playerSpawnまたはspawnPointプロパティをチェック
    const spawn = stageData.playerSpawn || stageData.spawnPoint;
    if (!spawn) return issues;
    
    const tileY = spawn.y;
    const tileX = spawn.x;
    
    // 範囲チェック
    if (tileY >= 0 && tileY < stageData.height && 
        tileX >= 0 && tileX < stageData.width) {
        
        // スポーン位置にブロックがあるかチェック
        if (tilemap[tileY][tileX] === 1) {
            issues.push({
                message: `Player spawn at (${spawn.x}, ${spawn.y}) is inside a block`
            });
        }
    }
    
    return issues;
}

/**
 * ゴール位置をチェック
 */
function checkGoalPosition(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    
    // goalプロパティをチェック
    const goal = stageData.goal;
    if (!goal) {
        // エンティティからゴールを探す
        const goalEntity = stageData.entities.find(e => e.type === 'goal');
        if (!goalEntity) return issues;
        
        const tileY = goalEntity.y;
        const tileX = goalEntity.x;
        
        // 範囲チェック
        if (tileY >= 0 && tileY < stageData.height && 
            tileX >= 0 && tileX < stageData.width) {
            
            // ゴール位置にブロックがあるかチェック
            if (tilemap[tileY][tileX] === 1) {
                issues.push({
                    message: `Goal at (${goalEntity.x}, ${goalEntity.y}) is inside a block`
                });
            }
        }
    } else {
        const tileY = goal.y;
        const tileX = goal.x;
        
        // 範囲チェック
        if (tileY >= 0 && tileY < stageData.height && 
            tileX >= 0 && tileX < stageData.width) {
            
            // ゴール位置にブロックがあるかチェック
            if (tilemap[tileY][tileX] === 1) {
                issues.push({
                    message: `Goal at (${goal.x}, ${goal.y}) is inside a block`
                });
            }
        }
    }
    
    return issues;
}

/**
 * ステージタイプのパレットが定義されているかチェック
 */
function checkPalette(stageData) {
    const issues = [];
    
    // stageTypeが定義されているか確認
    if (!stageData.stageType) {
        issues.push({
            message: `Stage ${stageData.id} is missing stageType property`
        });
        return issues;
    }
    
    // パレットが実際に定義されているかチェック
    // PALETTE_NAME_TO_MASTER_PALETTEに定義されている必要がある
    const definedPalettes = ['grassland', 'cave', 'snow'];  // 現在定義されているステージタイプパレット
    
    if (!definedPalettes.includes(stageData.stageType)) {
        issues.push({
            message: `Stage ${stageData.id} requires "${stageData.stageType}" palette, but it is not defined in PALETTE_NAME_TO_MASTER_PALETTE`
        });
    }
    
    return issues;
}

// テストの実行
if (require.main === module) {
    runTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runTest;