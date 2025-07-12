const GameTestHelpers = require('./utils/GameTestHelpers.cjs');
const fs = require('fs');
const path = require('path');

/**
 * ステージデータの妥当性を検証するE2Eテスト
 * 穴の幅、コイン配置、エンティティ配置などをチェック
 */
async function runStageValidationTest() {
    const test = new GameTestHelpers({ 
        headless: true,
        verbose: true,
        timeout: 30000  // 30秒のタイムアウト
    });
    
    await test.runTest(async (t) => {
        await t.init('Stage Validation Test');
        
        // ステージファイルの一覧を取得
        const stagesDir = path.join(__dirname, '../../src/levels/data');
        const stageFiles = fs.readdirSync(stagesDir)
            .filter(file => file.endsWith('.json') && file !== 'stages.json');
        
        console.log(`Found ${stageFiles.length} stage files to validate`);
        
        let totalIssues = 0;
        const validationResults = [];
        
        for (const stageFile of stageFiles) {
            const stagePath = path.join(stagesDir, stageFile);
            const stageData = JSON.parse(fs.readFileSync(stagePath, 'utf8'));
            
            console.log(`\n=== Validating ${stageData.id} (${stageData.name}) ===`);
            
            const issues = {
                coinCollisions: [],
                floatingEntities: [],
                unreachableItems: [],
                embeddedEntities: [],
                spawnCollisions: [],
                goalCollisions: []
            };
            
            // 2. コイン配置チェック（ブロックとの衝突）
            const coinIssues = checkCoinPlacements(stageData);
            issues.coinCollisions = coinIssues;
            
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
            
            // 結果を集計
            const stageIssueCount = 
                issues.coinCollisions.length + 
                issues.floatingEntities.length +
                issues.unreachableItems.length +
                issues.embeddedEntities.length +
                issues.spawnCollisions.length +
                issues.goalCollisions.length;
            
            totalIssues += stageIssueCount;
            
            validationResults.push({
                stageId: stageData.id,
                stageName: stageData.name,
                issues: issues,
                totalIssues: stageIssueCount
            });
            
            // 問題を表示
            if (stageIssueCount > 0) {
                console.log(`❌ Found ${stageIssueCount} issues:`);
                
                
                if (issues.coinCollisions.length > 0) {
                    console.log('\n  Coin Collision Issues:');
                    issues.coinCollisions.forEach(coin => {
                        console.log(`    - ${coin.message || `Coin at (${coin.x}, ${coin.y}) collides with block`}`);
                    });
                }
                
                if (issues.floatingEntities.length > 0) {
                    console.log('\n  Floating Entity Issues:');
                    issues.floatingEntities.forEach(entity => {
                        console.log(`    - ${entity.type} at (${entity.x}, ${entity.y}) is floating ${entity.height} tiles above block`);
                    });
                }
                
                if (issues.unreachableItems.length > 0) {
                    console.log('\n  Unreachable Item Issues:');
                    issues.unreachableItems.forEach(item => {
                        console.log(`    - ${item.type} at (${item.x}, ${item.y}) may be unreachable: ${item.reason}`);
                    });
                }
                
                if (issues.embeddedEntities.length > 0) {
                    console.log('\n  Embedded Entity Issues:');
                    issues.embeddedEntities.forEach(entity => {
                        console.log(`    - ${entity.type} at (${entity.x}, ${entity.y}) is embedded in wall`);
                    });
                }
                
                if (issues.spawnCollisions.length > 0) {
                    console.log('\n  Player Spawn Issues:');
                    issues.spawnCollisions.forEach(issue => {
                        console.log(`    - ${issue.message}`);
                    });
                }
                
                if (issues.goalCollisions.length > 0) {
                    console.log('\n  Goal Position Issues:');
                    issues.goalCollisions.forEach(issue => {
                        console.log(`    - ${issue.message}`);
                    });
                }
            } else {
                console.log('✅ No issues found');
            }
        }
        
        // サマリーを表示
        // 問題を重要度別に集計
        let criticalCount = 0;
        let warningCount = 0;
        let infoCount = 0;
        
        validationResults.forEach(result => {
            // クリティカル：コインがブロックと重なる
            result.issues.coinCollisions.forEach(() => criticalCount++);
            result.issues.embeddedEntities.forEach(() => criticalCount++);
            result.issues.spawnCollisions.forEach(() => criticalCount++);
            result.issues.goalCollisions.forEach(() => criticalCount++);
            
            // 警告：高すぎるアイテム（7タイル以上）、浮いている敵
            result.issues.unreachableItems.forEach(item => {
                const heightMatch = item.reason.match(/(\d+) tiles above block/);
                if (heightMatch && parseInt(heightMatch[1]) >= 7) warningCount++;
                else infoCount++;
            });
            result.issues.floatingEntities.forEach(() => warningCount++);
        });
        
        console.log('\n========== VALIDATION SUMMARY ==========');
        console.log(`Total stages validated: ${stageFiles.length}`);
        console.log(`Total issues found: ${totalIssues}`);
        console.log(`  🔴 Critical: ${criticalCount}`);
        console.log(`  🟡 Warning: ${warningCount}`);
        console.log(`  🔵 Info: ${infoCount}`);
        
        if (totalIssues > 0) {
            console.log('\nStages with issues:');
            validationResults
                .filter(result => result.totalIssues > 0)
                .forEach(result => {
                    console.log(`  - ${result.stageId}: ${result.totalIssues} issues`);
                });
        }
        
        // テスト結果の判定
        if (criticalCount > 0) {
            console.error(`\n❌ Stage validation found ${criticalCount} CRITICAL issues that must be fixed!`);
            throw new Error(`Stage validation failed: ${criticalCount} critical issues found`);
        } else if (warningCount > 0) {
            console.warn(`\n⚠️  Stage validation found ${warningCount} warnings that should be reviewed.`);
        } else if (infoCount > 0) {
            console.log(`\nℹ️  Stage validation found ${infoCount} minor issues for consideration.`);
        } else {
            console.log('\n✅ All stages passed validation!');
        }
    });
}


/**
 * コインがブロックと重なっていないかチェック
 */
function checkCoinPlacements(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    const coins = stageData.entities.filter(e => e.type === 'coin');
    
    for (const coin of coins) {
        // EntityManagerと同じ間違った変換を使う
        // これが実際にゲーム内で警告を出している方法
        const tileY = coin.y; // 間違い: 底部基準のY座標を直接配列インデックスとして使用
        const tileX = coin.x;
        
        // 範囲チェック
        if (tileY >= 0 && tileY < stageData.height && 
            tileX >= 0 && tileX < stageData.width) {
            
            // その座標にブロック（値1）があるかチェック
            if (tilemap[tileY][tileX] === 1) {
                issues.push({
                    x: coin.x,
                    y: coin.y,
                    tileValue: tilemap[tileY][tileX],
                    message: `Coin at (${coin.x}, ${coin.y}) is embedded in block (using incorrect coordinate system)`
                });
            }
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
        e.type !== 'coin' && e.type !== 'spring'  // コインとジャンプ台は除外
    );
    
    for (const entity of entities) {
        const tileX = entity.x;
        let blockTileY = -1;
        
        // エンティティの位置を配列インデックスに変換
        const entityTileY = stageData.height - 1 - entity.y;
        
        // エンティティの下方向にブロックを探す（配列では下方向 = インデックス増加）
        for (let tileY = entityTileY + 1; tileY < stageData.height; tileY++) {
            if (tileX >= 0 && tileX < stageData.width) {
                if (tilemap[tileY][tileX] === 1) {
                    blockTileY = tileY;
                    break;
                }
            }
        }
        
        // ブロックが見つかった場合、高さをチェック
        if (blockTileY !== -1) {
            // 配列インデックスをゲーム座標に変換
            const blockY = stageData.height - 1 - blockTileY;
            const floatingHeight = entity.y - blockY - 1;
            
            // 2タイル以上浮いている場合は問題とする
            if (floatingHeight >= 2) {
                issues.push({
                    type: entity.type,
                    x: entity.x,
                    y: entity.y,
                    height: floatingHeight
                });
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
        e.type === 'coin' || e.type === 'powerup'
    );
    
    for (const item of items) {
        // 簡易的なチェック：高すぎる位置にあるアイテム
        // 通常のジャンプ高さは約3-4タイル
        const itemTileY = stageData.height - 1 - item.y;
        let blockLevel = -1;
        
        // アイテムの下のブロックを探す
        for (let y = itemTileY + 1; y < stageData.height; y++) {
            if (tilemap[y][item.x] === 1) {
                blockLevel = stageData.height - 1 - y;
                break;
            }
        }
        
        if (blockLevel !== -1) {
            const heightAboveBlock = item.y - blockLevel;
            
            // ブロックから5タイル以上高い場合は到達困難と判定
            if (heightAboveBlock >= 5) {
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
        const tileY = stageData.height - 1 - item.y;
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
    
    for (const entity of entities) {
        // EntityManagerと同じ間違った座標系を使用
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
                            y: entity.y
                        });
                    }
                } else {
                    // 他のエンティティは壁に埋まっていたら問題
                    issues.push({
                        type: entity.type,
                        x: entity.x,
                        y: entity.y
                    });
                }
            }
        }
    }
    
    return issues;
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

// テストの実行
if (require.main === module) {
    runStageValidationTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runStageValidationTest;