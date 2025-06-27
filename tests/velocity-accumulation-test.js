// 速度の累積問題をテスト

console.log('=== Velocity Accumulation Test ===\n');

// 問題の可能性：
// 1. Entity.updatePhysics と PhysicsSystem.update の両方で位置更新
// 2. 速度設定のタイミング
// 3. groundedフラグの管理

let enemy = {
    x: 150,
    y: 180,
    vx: 0,
    vy: 0,
    grounded: false,
    physicsEnabled: true,
    moveSpeed: 20,
    direction: 1
};

console.log('Initial state:', enemy);

// フレーム1: 落下開始
console.log('\n--- Frame 1 ---');
// Enemy.update -> Slime.updateAI
if (enemy.grounded) {
    enemy.vx = enemy.moveSpeed * enemy.direction;
    console.log('Slime AI: Set vx to', enemy.vx);
} else {
    console.log('Slime AI: Not grounded, no horizontal movement');
}

// Entity.updatePhysics (physicsEnabled=trueなのでスキップ)
if (!enemy.physicsEnabled) {
    console.log('Entity.updatePhysics would update position here');
}

// PhysicsSystem.update
console.log('PhysicsSystem: Apply gravity');
enemy.vy += 0.65;
console.log('PhysicsSystem: Move Y');
enemy.y += enemy.vy;
// 地面チェック（y=192で地面）
if (enemy.y >= 192 - 16) {
    console.log('PhysicsSystem: Hit ground!');
    enemy.y = 192 - 16;
    enemy.vy = 0;
    enemy.grounded = true;
}
console.log('After frame 1:', enemy);

// フレーム2: 地面にいる
console.log('\n--- Frame 2 ---');
// Enemy.update -> Slime.updateAI
if (enemy.grounded) {
    enemy.vx = enemy.moveSpeed * enemy.direction;
    console.log('Slime AI: Set vx to', enemy.vx);
} else {
    console.log('Slime AI: Not grounded, no horizontal movement');
}

// PhysicsSystem.update
console.log('PhysicsSystem: Move X');
enemy.x += enemy.vx;
console.log('PhysicsSystem: Apply friction');
enemy.vx *= 0.85;
console.log('After frame 2:', enemy);

// 問題の検証
console.log('\n=== Analysis ===');
console.log('1. Slime sets vx=20 every frame when grounded');
console.log('2. PhysicsSystem moves by vx, then applies friction');
console.log('3. But next frame, Slime sets vx=20 again');
console.log('4. This creates constant movement at speed 20');

// 別の問題の可能性
console.log('\n=== Another possibility ===');
console.log('If Entity.updatePhysics is called AND PhysicsSystem.update is called:');
console.log('- Entity.updatePhysics: x += vx * deltaTime/16.67');
console.log('- PhysicsSystem.update: x += vx * deltaTime/16.67');
console.log('- This would cause DOUBLE movement!');

// 実際の問題を特定
console.log('\n=== Real issue might be ===');

// ケース1: PhysicsSystemだけが位置更新している場合
let case1_x = 150;
let case1_vx = 20;
console.log('\nCase 1: Only PhysicsSystem updates position');
for (let i = 0; i < 5; i++) {
    case1_x += case1_vx;
    console.log(`Frame ${i+1}: x=${case1_x} (moved by ${case1_vx})`);
}

// ケース2: 両方が位置更新している場合
let case2_x = 150;
let case2_vx = 20;
console.log('\nCase 2: Both Entity and PhysicsSystem update position');
for (let i = 0; i < 5; i++) {
    // Entity.updatePhysics
    case2_x += case2_vx;
    // PhysicsSystem.update
    case2_x += case2_vx;
    console.log(`Frame ${i+1}: x=${case2_x} (moved by ${case2_vx * 2})`);
}

console.log('\n=== Conclusion ===');
console.log('If enemies are flying off instantly, Case 2 is likely happening.');
console.log('Check if physicsEnabled flag is properly preventing double updates.');