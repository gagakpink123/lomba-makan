import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSection2LevelForScore,
  getSectionForLevel,
  SECTION2_MAX_LEVEL,
  SECTION2_MIN_LEVEL,
} from './levels';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  WRONG_TUING_MAX_SCALE,
} from './rules';
import {
  FLYER_CRASH_INVULN_SEC,
  FLYER_MAX_CRASH_CHANCES,
  FLYER_MAX_FOOD_CHANCES,
  FLYER_TUING_DURATION_SEC,
  SKY_PHASE_DURATION_SEC,
  TUNNEL_WORLD_LENGTH,
  TUNNEL_WALL_MAX_INSET,
  applySection2FoodMistake,
  applySection2ObstacleCrash,
  checkFlyerItemCollision,
  checkFlyerObstacleCollision,
  clampFlyerY,
  computeFlyerTuingScale,
  computeSection2ScrollSpeed,
  createInitialFlyerState,
  createTunnelState,
  getFlyerAnchorX,
  getFlyerBodyBox,
  getFlyerHeadBox,
  resolveFlyerSprite,
  spawnSection2Wave,
  spawnTunnelObstacle,
  stepFlyerMovement,
  stepTunnelObstacleMotion,
  stepTunnelState,
} from './section2Rules';

test('getSectionForLevel cleanly separates Section 1 (1-5) and Section 2 (6-10)', () => {
  for (let lvl = 1; lvl <= 5; lvl++) {
    assert.equal(getSectionForLevel(lvl), 1);
  }
  for (let lvl = SECTION2_MIN_LEVEL; lvl <= SECTION2_MAX_LEVEL; lvl++) {
    assert.equal(getSectionForLevel(lvl), 2);
  }
});

test('flyer moves vertically within bounds while staying locked horizontally on left', () => {
  const hero = createInitialFlyerState(ARENA_WIDTH);
  const startX = hero.x;
  const startY = hero.y;
  assert.equal(startX, getFlyerAnchorX(ARENA_WIDTH));

  // Move up
  for (let i = 0; i < 20; i++) {
    stepFlyerMovement(hero, 0.02, -1, ARENA_WIDTH, 0);
  }
  assert.equal(hero.x, startX);
  assert.ok(hero.y < startY, 'Hero should move upward on -1 vertical axis');

  // Move down
  const upY = hero.y;
  for (let i = 0; i < 40; i++) {
    stepFlyerMovement(hero, 0.02, 1, ARENA_WIDTH, 0);
  }
  assert.equal(hero.x, startX);
  assert.ok(hero.y > upY, 'Hero should move downward on +1 vertical axis');

  // Clamped safely inside tunnel walls
  assert.equal(clampFlyerY(-200, TUNNEL_WALL_MAX_INSET) > 150, true);
  assert.equal(clampFlyerY(2000, TUNNEL_WALL_MAX_INSET) < ARENA_HEIGHT - 60, true);
});

test('billowing cape alternates idle1/idle2 and expression sprites resolve properly', () => {
  const hero = createInitialFlyerState(ARENA_WIDTH);
  const seenFrames = new Set<string>();
  for (let i = 0; i < 20; i++) {
    stepFlyerMovement(hero, 0.03, 0, ARENA_WIDTH, 0);
    seenFrames.add(resolveFlyerSprite(hero, false));
  }
  assert.deepEqual([...seenFrames].sort(), ['flyerIdle1', 'flyerIdle2']);

  hero.expression = 'makan';
  assert.equal(resolveFlyerSprite(hero, false), 'flyerMakan');

  hero.expression = 'salahMakan';
  assert.equal(resolveFlyerSprite(hero, false), 'flyerSalahMakan');

  hero.expression = 'nabrak';
  assert.equal(resolveFlyerSprite(hero, false), 'flyerNabrak');

  assert.equal(resolveFlyerSprite(hero, true, 'crash'), 'flyerNabrak');
  assert.equal(resolveFlyerSprite(hero, true, 'mistakes'), 'flyerSalahMakan');
});

test('food wave spawns 1..3 items max (single or horizontal/diagonal lines)', () => {
  for (let seed = 0; seed < 50; seed++) {
    let idx = 0;
    const seq = [0.95, (seed % 10) / 10, (seed % 7) / 7, 0.4, 0.6, 0.2, 0.8];
    const rng = () => seq[idx++ % seq.length];
    const wave = spawnSection2Wave(1, 6, ARENA_WIDTH, 0, rng);
    assert.ok(wave.items.length >= 1 && wave.items.length <= 3, 'Wave max 3 foods');
    for (const item of wave.items) {
      assert.equal(item.kind, 'food');
      assert.ok(item.x >= ARENA_WIDTH + 60);
    }
  }
});

test('Lorong Gelap scrolls physically from Entrance to Exit and back to Open Sky', () => {
  const arenaWidth = ARENA_WIDTH;
  const heroX = getFlyerAnchorX(arenaWidth);
  const tunnel = createTunnelState('sky', arenaWidth);
  assert.equal(tunnel.active, false);
  assert.equal(tunnel.inTunnel, false);

  // Advance just before tunnel spawns -> warning active
  stepTunnelState(tunnel, SKY_PHASE_DURATION_SEC - 1.0, 260, heroX, arenaWidth);
  assert.equal(tunnel.warningActive, true);
  assert.equal(tunnel.active, false);
  assert.equal(tunnel.inTunnel, false);

  // Trigger tunnel entrance portal spawn off right edge
  const spawnEvt = stepTunnelState(tunnel, 1.2, 260, heroX, arenaWidth);
  assert.equal(spawnEvt.spawnedTunnel, true);
  assert.equal(tunnel.active, true);
  assert.equal(tunnel.inTunnel, false, 'Hero still in open sky until crossing entrance leftX');
  assert.ok(tunnel.leftX > arenaWidth);
  assert.equal(tunnel.rightX - tunnel.leftX, TUNNEL_WORLD_LENGTH);

  // Scroll until hero passes Cave Entrance leftX
  const distToEnter = tunnel.leftX - heroX + 20;
  const enterEvt = stepTunnelState(tunnel, distToEnter / 260, 260, heroX, arenaWidth);
  assert.equal(enterEvt.enteredTunnel, true);
  assert.equal(tunnel.inTunnel, true);

  // Step briefly inside so darknessAlpha rises
  stepTunnelState(tunnel, 0.5, 260, heroX, arenaWidth);
  assert.ok(tunnel.darknessAlpha > 0.5);
  assert.ok(tunnel.wallInset > 20);

  // Scroll until hero passes Cave Exit rightX
  const distToExit = tunnel.rightX - heroX + 20;
  const exitEvt = stepTunnelState(tunnel, distToExit / 260, 260, heroX, arenaWidth);
  assert.equal(exitEvt.exitedTunnel, true);
  assert.equal(tunnel.inTunnel, false);

  // Scroll exit archway off left edge -> resets cleanly to Open Sky
  stepTunnelState(tunnel, 1.5, 260, heroX, arenaWidth);
  assert.equal(tunnel.active, false);
});

test('head collision catches food & obstacle collision covers all 7 shapes including spinningGear & movingIronPlate', () => {
  const hero = createInitialFlyerState(ARENA_WIDTH);
  const head = getFlyerHeadBox(hero.x, hero.y);
  const body = getFlyerBodyBox(hero.x, hero.y);

  assert.equal(
    checkFlyerItemCollision(head, { x: head.cx, y: head.cy, size: 68, resolved: false }),
    true,
  );
  assert.equal(
    checkFlyerItemCollision(head, { x: head.cx + 300, y: head.cy, size: 68, resolved: false }),
    false,
  );

  // Floating block placed squarely on hero body collides
  assert.equal(
    checkFlyerObstacleCollision(body, {
      kind: 'floatingBlock',
      x: body.cx,
      width: 86,
      topBottomY: 0,
      bottomTopY: ARENA_HEIGHT,
      blockY: body.cy,
      blockH: 92,
      hit: false,
    }),
    true,
  );

  // Narrow Corridor ("ruang sempit"): wide hallway where center passes cleanly, walls collide
  const corridor = spawnTunnelObstacle(10, 7, ARENA_WIDTH, TUNNEL_WALL_MAX_INSET, () => 0.48);
  assert.equal(corridor.kind, 'narrowCorridor');
  assert.ok(corridor.width >= 195);
  assert.ok(corridor.bottomTopY - corridor.topBottomY >= 140);
  const corridorMidY = (corridor.topBottomY + corridor.bottomTopY) * 0.5;
  assert.equal(
    checkFlyerObstacleCollision(getFlyerBodyBox(corridor.x, corridorMidY), corridor),
    false,
  );
  assert.equal(
    checkFlyerObstacleCollision(getFlyerBodyBox(corridor.x, corridor.topBottomY - 8), corridor),
    true,
  );

  // Double Gap ("2 pilihan lubang"): BOTH upper & lower holes pass cleanly, middle divider collides!
  const dbl = spawnTunnelObstacle(11, 7, ARENA_WIDTH, TUNNEL_WALL_MAX_INSET, () => 0.72);
  assert.equal(dbl.kind, 'doubleGap');
  assert.ok(dbl.gap1Top !== undefined && dbl.gap1Bottom !== undefined);
  assert.ok(dbl.gap2Top !== undefined && dbl.gap2Bottom !== undefined);
  const hole1MidY = (dbl.gap1Top! + dbl.gap1Bottom!) * 0.5;
  const hole2MidY = (dbl.gap2Top! + dbl.gap2Bottom!) * 0.5;
  const dividerMidY = (dbl.gap1Bottom! + dbl.gap2Top!) * 0.5;

  assert.equal(checkFlyerObstacleCollision(getFlyerBodyBox(dbl.x, hole1MidY), dbl), false);
  assert.equal(checkFlyerObstacleCollision(getFlyerBodyBox(dbl.x, hole2MidY), dbl), false);
  assert.equal(checkFlyerObstacleCollision(getFlyerBodyBox(dbl.x, dividerMidY), dbl), true);

  // Spinning Gear ("gerigi berputar"): rotates over time, circular hitbox collides cleanly, leaves open flight space
  const gear = spawnTunnelObstacle(12, 7, ARENA_WIDTH, TUNNEL_WALL_MAX_INSET, () => 0.3);
  assert.equal(gear.kind, 'spinningGear');
  assert.ok((gear.gearRadius ?? 0) >= 44);
  const startAngle = gear.gearAngle ?? 0;
  stepTunnelObstacleMotion(gear, 0.25, 1.0);
  assert.notEqual(gear.gearAngle, startAngle, 'Gear angle must rotate cleanly on step');
  assert.equal(
    checkFlyerObstacleCollision(getFlyerBodyBox(gear.x, gear.blockY!), gear),
    true,
  );
  assert.equal(
    checkFlyerObstacleCollision(getFlyerBodyBox(gear.x, gear.blockY! + 180), gear),
    false,
  );

  // Moving Iron Plate ("plat besi bergerak looping naik/turun"): harmonically loops up and down cleanly
  const plate = spawnTunnelObstacle(13, 7, ARENA_WIDTH, TUNNEL_WALL_MAX_INSET, () => 0.62);
  assert.equal(plate.kind, 'movingIronPlate');
  assert.ok((plate.plateAmpY ?? 0) >= 50);
  const samples: number[] = [];
  for (let i = 0; i < 24; i++) {
    stepTunnelObstacleMotion(plate, 0.12, i * 0.12);
    samples.push(plate.blockY!);
  }
  const minPlateY = Math.min(...samples);
  const maxPlateY = Math.max(...samples);
  assert.ok(maxPlateY - minPlateY > 90, 'Moving iron plate must visibly travel up and down in a loop');
  assert.equal(
    checkFlyerObstacleCollision(getFlyerBodyBox(plate.x, plate.blockY!), plate),
    true,
  );
  assert.equal(
    checkFlyerObstacleCollision(getFlyerBodyBox(plate.x, plate.blockY! + 220), plate),
    false,
  );

  // Verify all 7 obstacle archetypes are reachable across RNG rolls
  const seenKinds = new Set(
    [0.05, 0.18, 0.30, 0.48, 0.62, 0.78, 0.94].map(
      (r, idx) => spawnTunnelObstacle(idx + 20, 7, ARENA_WIDTH, TUNNEL_WALL_MAX_INSET, () => r).kind,
    ),
  );
  assert.equal(seenKinds.size, 7);

  // Verify 1.5s invulnerability constant & countdown
  hero.invulnTimer = FLYER_CRASH_INVULN_SEC;
  assert.equal(FLYER_CRASH_INVULN_SEC, 1.5);
  stepFlyerMovement(hero, 1.0, 0, ARENA_WIDTH, 0);
  assert.ok(hero.invulnTimer > 0.45 && hero.invulnTimer < 0.55);
});

test('separate life indicators trigger Game Over only when either reaches 0', () => {
  let foodLeft = FLYER_MAX_FOOD_CHANCES;
  let crashLeft = FLYER_MAX_CRASH_CHANCES;
  assert.equal(foodLeft, 3);
  assert.equal(crashLeft, 3);

  const m1 = applySection2FoodMistake(foodLeft);
  foodLeft = m1.remainingFoodChances;
  assert.equal(foodLeft, 2);
  assert.equal(m1.isGameOver, false);

  const m2 = applySection2FoodMistake(foodLeft);
  foodLeft = m2.remainingFoodChances;
  assert.equal(foodLeft, 1);
  assert.equal(m2.isLastChance, true);
  assert.equal(m2.isGameOver, false);

  const m3 = applySection2FoodMistake(foodLeft);
  assert.equal(m3.remainingFoodChances, 0);
  assert.equal(m3.isGameOver, true);

  // Independent crash chances
  const c1 = applySection2ObstacleCrash(crashLeft);
  const c2 = applySection2ObstacleCrash(c1.remainingCrashChances);
  assert.equal(c2.isGameOver, false);
  const c3 = applySection2ObstacleCrash(c2.remainingCrashChances);
  assert.equal(c3.remainingCrashChances, 0);
  assert.equal(c3.isGameOver, true);
});

test('score scales Section 2 level & speed and 3x Tuing triggers for salahMakan & nabrak', () => {
  assert.equal(getSection2LevelForScore(6, 0), 6);
  assert.equal(getSection2LevelForScore(6, 250), 7);
  const lowSpeed = computeSection2ScrollSpeed(6, 0).scrollSpeed;
  const highSpeed = computeSection2ScrollSpeed(6, 1200).scrollSpeed;
  assert.ok(highSpeed > lowSpeed, 'Scroll speed rises as score rises');

  assert.ok(
    computeFlyerTuingScale('nabrak', FLYER_TUING_DURATION_SEC * 0.84, false) > 2.5,
  );
  assert.equal(
    computeFlyerTuingScale('salahMakan', 0, true),
    WRONG_TUING_MAX_SCALE,
  );
});
