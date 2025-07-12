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
                gaps: [],
                coinCollisions: [],
                floatingEntities: [],
                unreachableItems: [],
                embeddedEntities: []
            };
            
            // 1. 穴の幅チェック
            const gapIssues = checkGapWidths(stageData);
            issues.gaps = gapIssues;
            
            // 2. コイン配置チェック
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
            
            // 結果を集計
            const stageIssueCount = 
                issues.gaps.length + 
                issues.coinCollisions.length + 
                issues.floatingEntities.length +
                issues.unreachableItems.length +
                issues.embeddedEntities.length;
            
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
                
                if (issues.gaps.length > 0) {
                    console.log('\n  Gap Width Issues:');
                    issues.gaps.forEach(gap => {
                        console.log(`    - ${gap.width}-tile gap at x=${gap.startX}-${gap.endX}, row=${gap.row}`);
                        if (gap.hasSpring) {
                            console.log(`      (Spring detected at x=${gap.springX})`);
                        }
                    });
                }
                
                if (issues.coinCollisions.length > 0) {
                    console.log('\n  Coin Collision Issues:');
                    issues.coinCollisions.forEach(coin => {
                        if (coin.embedded) {
                            console.log(`    - Coin at (${coin.x}, ${coin.y}) is embedded inside ground blocks`);
                        } else {
                            console.log(`    - Coin at (${coin.x}, ${coin.y}) collides with ground tile`);
                        }
                    });
                }
                
                if (issues.floatingEntities.length > 0) {
                    console.log('\n  Floating Entity Issues:');
                    issues.floatingEntities.forEach(entity => {
                        console.log(`    - ${entity.type} at (${entity.x}, ${entity.y}) is floating ${entity.height} tiles above ground`);
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
            // クリティカル：穴が広すぎる（ジャンプ台なしで6タイル以上）、コインが地面と重なる
            result.issues.gaps.forEach(gap => {
                if (gap.width >= 6 && !gap.hasSpring) criticalCount++;
                else if (gap.width >= 4) warningCount++;
            });
            result.issues.coinCollisions.forEach(() => criticalCount++);
            result.issues.embeddedEntities.forEach(() => criticalCount++);
            
            // 警告：高すぎるアイテム（7タイル以上）、浮いている敵
            result.issues.unreachableItems.forEach(item => {
                const heightMatch = item.reason.match(/(\d+) tiles above ground/);
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
 * 穴の幅をチェック（4タイル以上を検出）
 */
function checkGapWidths(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    const height = stageData.height;
    const width = stageData.width;
    
    // 地面レベルを検出（通常は下から2-3行目）
    const groundRows = [height - 2, height - 3];
    
    for (const row of groundRows) {
        if (row < 0 || row >= height) continue;
        
        let gapStart = -1;
        
        for (let col = 0; col <= width; col++) {
            const isGround = col < width && tilemap[row][col] === 1;
            
            if (!isGround && gapStart === -1) {
                // 穴の開始
                gapStart = col;
            } else if ((isGround || col === width) && gapStart !== -1) {
                // 穴の終了
                const gapWidth = col - gapStart;
                
                if (gapWidth >= 4) {
                    // ジャンプ台があるかチェック
                    const hasSpring = checkForSpringInGap(stageData, gapStart, col, row);
                    
                    issues.push({
                        row: row,
                        startX: gapStart,
                        endX: col - 1,
                        width: gapWidth,
                        hasSpring: hasSpring.found,
                        springX: hasSpring.x
                    });
                }
                
                gapStart = -1;
            }
        }
    }
    
    return issues;
}

/**
 * 指定範囲内にジャンプ台があるかチェック
 */
function checkForSpringInGap(stageData, startX, endX, groundRow) {
    const springs = stageData.entities.filter(e => e.type === 'spring');
    
    for (const spring of springs) {
        // ジャンプ台が穴の範囲内にあるかチェック
        if (spring.x >= startX && spring.x < endX) {
            // ジャンプ台が地面の近くにあるかチェック（1-2タイル上）
            if (spring.y >= groundRow - 2 && spring.y <= groundRow + 1) {
                return { found: true, x: spring.x };
            }
        }
    }
    
    return { found: false, x: null };
}

/**
 * コインが地面ブロックと重なっていないかチェック
 */
function checkCoinPlacements(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    const coins = stageData.entities.filter(e => e.type === 'coin');
    
    for (const coin of coins) {
        // 座標を配列インデックスに変換（Y座標は反転）
        const tileY = stageData.height - 1 - coin.y;
        const tileX = coin.x;
        
        // 範囲チェック
        if (tileY >= 0 && tileY < stageData.height && 
            tileX >= 0 && tileX < stageData.width) {
            
            // 地面ブロック（値1）と重なっているかチェック
            if (tilemap[tileY][tileX] === 1) {
                issues.push({
                    x: coin.x,
                    y: coin.y,
                    tileValue: tilemap[tileY][tileX]
                });
            } else {
                // コインの位置は空いているが、同じX座標の地面の最高点を確認
                let highestGroundY = -1;
                
                // そのX座標の全ての地面をチェックして最高点を探す
                for (let y = 0; y < stageData.height; y++) {
                    if (tilemap[y][tileX] === 1) {
                        const currentY = stageData.height - 1 - y;
                        if (currentY > highestGroundY) {
                            highestGroundY = currentY;
                        }
                    }
                }
                
                // コインが地面の最高点より下にある場合、埋まっているとみなす
                if (highestGroundY !== -1 && coin.y < highestGroundY) {
                    issues.push({
                        x: coin.x,
                        y: coin.y,
                        tileValue: 0,
                        embedded: true,
                        highestGroundY: highestGroundY
                    });
                }
            }
        }
    }
    
    return issues;
}

/**
 * エンティティが地面から浮いていないかチェック
 */
function checkFloatingEntities(stageData) {
    const issues = [];
    const tilemap = stageData.tilemap;
    const entities = stageData.entities.filter(e => 
        e.type !== 'coin' && e.type !== 'spring'  // コインとジャンプ台は除外
    );
    
    for (const entity of entities) {
        const tileX = entity.x;
        let groundTileY = -1;
        
        // エンティティの位置を配列インデックスに変換
        const entityTileY = stageData.height - 1 - entity.y;
        
        // エンティティの下方向に地面を探す（配列では下方向 = インデックス増加）
        for (let tileY = entityTileY + 1; tileY < stageData.height; tileY++) {
            if (tileX >= 0 && tileX < stageData.width) {
                if (tilemap[tileY][tileX] === 1) {
                    groundTileY = tileY;
                    break;
                }
            }
        }
        
        // 地面が見つかった場合、高さをチェック
        if (groundTileY !== -1) {
            // 配列インデックスをゲーム座標に変換
            const groundY = stageData.height - 1 - groundTileY;
            const floatingHeight = entity.y - groundY - 1;
            
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
        // 通常のジャンプ高さは約3-4タイル、地面からの高さで判定
        const itemTileY = stageData.height - 1 - item.y;
        let groundLevel = -1;
        
        // アイテムの下の地面を探す
        for (let y = itemTileY + 1; y < stageData.height; y++) {
            if (tilemap[y][item.x] === 1) {
                groundLevel = stageData.height - 1 - y;
                break;
            }
        }
        
        if (groundLevel !== -1) {
            const heightAboveGround = item.y - groundLevel;
            
            // 地面から5タイル以上高い場合は到達困難と判定
            if (heightAboveGround >= 5) {
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
                        reason: `Too high (${heightAboveGround} tiles above ground)`
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
        // エンティティの位置を配列インデックスに変換
        const tileY = stageData.height - 1 - entity.y;
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

// テストの実行
if (require.main === module) {
    runStageValidationTest().catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

module.exports = runStageValidationTest;