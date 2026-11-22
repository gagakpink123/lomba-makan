import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_WIDTH,
  ITEM_SIZE_FOOD,
  ITEM_SIZE_TRAP,
  PLAYER_FIXED_Y,
  PLAYER_HEIGHT,
  SUPERHERO_BANNER_TAIL_WIDTH,
  SUPERHERO_BANNER_TEXT,
  SUPERHERO_BASE_Y,
  TRAP_SCORE_PENALTY,
  WRONG_EXPRESSION_DURATION_SEC,
  WRONG_TUING_MAX_SCALE,
  advanceLevelProgression,
  applyFoodCatchScore,
  applyTrapPenalty,
  checkBodyBelowNeckCollision,
  checkHeadCollision,
  checkMouthCollision,
  clampPlayerX,
  computeWrongEatTuingScale,
  createInitialPlayerState,
  createSuperheroFlyby,
  evaluateLevelTargetProgress,
  evaluateMistakes,
  getPlayerBodyBox,
  getPlayerHeadBox,
  getPlayerMouthBox,
  pickFairSpawnX,
  resolveCharacterSprite,
  shouldTriggerSuperhero,
  spawnFallingItem,
  stepPlayerMovement,
  stepSuperheroFlyby,
} from './rules';
import {
  CHARACTER_SPRITES,
  FOOD_SPRITES,
  SUPERHERO_SPRITE,
  TRAP_POOL,
  TRAP_SPRITES,
  WEIGHTED_FOOD_POOL,
} from './assets';
import { LEVELS, TOTAL_LEVELS } from './levels';

test('all character, superhero, 18 food nutrition assets and 9 trap assets exist with differentiated scores', () => {
  assert.equal(CHARACTER_SPRITES.makan, '/assets/aistudio/makan_new_77ab1c0e.png');
  assert.equal(CHARACTER_SPRITES.sebel, '/assets/aistudio/sebel_896fa741.png');
  assert.equal(SUPERHERO_SPRITE, '/assets/aistudio/superhero_a7ba2afc.png');
  assert.equal(FOOD_SPRITES.kentang.src, '/assets/aistudio/kentang_new_392b6483_f7644b37.png');

  const expectedFoods = [
    'alpukat',
    'ayam',
    'bayam',
    'brokoli',
    'daging',
    'ikan',
    'jagung',
    'jeruk',
    'kentang',
    'melon',
    'pisang',
    'pokcoy',
    'roti',
    'susu',
    'telur',
    'tempe',
    'terong',
    'wortel',
  ];
  assert.equal(WEIGHTED_FOOD_POOL.length, 18);
  for (const id of expectedFoods) {
    assert.ok(id in FOOD_SPRITES, `Missing ${id} in FOOD_SPRITES`);
    const meta = FOOD_SPRITES[id as keyof typeof FOOD_SPRITES];
    assert.ok(meta.nutrients.length > 5, `Missing nutrients info for ${id}`);
    assert.ok(meta.benefits.length > 10, `Missing benefits info for ${id}`);
    assert.ok(meta.points >= 10 && meta.points <= 25, `Invalid points for ${id}`);
    assert.ok(WEIGHTED_FOOD_POOL.includes(id as keyof typeof FOOD_SPRITES), `Missing ${id} in pool`);
  }

  assert.ok(FOOD_SPRITES.ikan.points > FOOD_SPRITES.roti.points);
  assert.ok(FOOD_SPRITES.telur.points > FOOD_SPRITES.kentang.points);
  assert.ok(FOOD_SPRITES.brokoli.points > FOOD_SPRITES.jagung.points);
  assert.equal(FOOD_SPRITES.ikan.points, 25);
  assert.equal(FOOD_SPRITES.telur.points, 20);
  assert.equal(FOOD_SPRITES.brokoli.points, 15);
  assert.equal(FOOD_SPRITES.jeruk.points, 12);
  assert.equal(FOOD_SPRITES.roti.points, 10);

  const expectedTraps = [
    'batuBata',
    'bola',
    'boneka',
    'granat',
    'mobilMainan',
    'palu',
    'roda',
    'tabungGas',
    'ultraman',
  ];
  assert.equal(TRAP_POOL.length, 9);
  for (const id of expectedTraps) {
    assert.ok(id in TRAP_SPRITES, `Missing ${id} in TRAP_SPRITES`);
    assert.ok(TRAP_POOL.includes(id as keyof typeof TRAP_SPRITES), `Missing ${id} in TRAP_POOL`);
  }
});

test('character and item proportions are moderately enlarged and movement adapts to wide desktop arenas', () => {
  assert.ok(PLAYER_HEIGHT > 160 && PLAYER_HEIGHT < 190);
  assert.ok(ITEM_SIZE_FOOD > 62 && ITEM_SIZE_FOOD < 76);
  assert.ok(ITEM_SIZE_TRAP > 60 && ITEM_SIZE_TRAP < 74);

  const player = createInitialPlayerState(1280);
  assert.equal(player.x, 640);
  assert.equal(player.y, PLAYER_FIXED_Y);

  for (let i = 0; i < 60; i++) {
    stepPlayerMovement(player, 0.05, -1, 1280);
  }
  assert.equal(player.x, clampPlayerX(-9999, 1280));

  for (let i = 0; i < 120; i++) {
    stepPlayerMovement(player, 0.05, 1, 1280);
  }
  assert.equal(player.x, clampPlayerX(9999, 1280));
  assert.ok(player.x > ARENA_WIDTH, 'Desktop movement should travel beyond mobile 450px width');
});

test('scoring adds food nutrition value and trap penalty reduces score with floor at 0', () => {
  const afterFish = applyFoodCatchScore(0, 0, FOOD_SPRITES.ikan.points);
  assert.deepEqual(afterFish, { totalScore: 25, levelScore: 25 });

  const afterTrap = applyTrapPenalty(afterFish.totalScore, afterFish.levelScore);
  assert.deepEqual(afterTrap, {
    totalScore: 25 - TRAP_SCORE_PENALTY,
    levelScore: 25 - TRAP_SCORE_PENALTY,
    appliedPenalty: TRAP_SCORE_PENALTY,
  });

  const floorCheck = applyTrapPenalty(5, 5);
  assert.deepEqual(floorCheck, { totalScore: 0, levelScore: 0, appliedPenalty: TRAP_SCORE_PENALTY });
});

test('character sprite priority: salahMakan > makan > sebel > walk1/walk2 > idle walk1', () => {
  const player = createInitialPlayerState();
  assert.equal(resolveCharacterSprite(player, false), 'walk1');

  player.isMoving = true;
  player.walkFrame = 1;
  assert.equal(resolveCharacterSprite(player, false), 'walk2');

  player.expression = 'sebel';
  assert.equal(resolveCharacterSprite(player, false), 'sebel');

  player.expression = 'makan';
  assert.equal(resolveCharacterSprite(player, false), 'makan');

  player.expression = 'salahMakan';
  assert.equal(resolveCharacterSprite(player, false), 'salahMakan');

  player.expression = 'none';
  player.isMoving = false;
  assert.equal(resolveCharacterSprite(player, true), 'salahMakan');
});

test('salah makan triggers 3x Tuing scale and smoothly settles back to 1x', () => {
  assert.equal(WRONG_TUING_MAX_SCALE, 3);
  assert.equal(computeWrongEatTuingScale('none', 0, false), 1);
  assert.equal(computeWrongEatTuingScale('makan', 0.4, false), 1);
  assert.equal(computeWrongEatTuingScale('sebel', 0.4, false), 1);

  const peak = computeWrongEatTuingScale(
    'salahMakan',
    WRONG_EXPRESSION_DURATION_SEC * 0.84,
    false,
  );
  assert.ok(Math.abs(peak - 3.0) < 0.05, `Expected ~3.0x, got ${peak}`);

  const end = computeWrongEatTuingScale('salahMakan', 0.001, false);
  assert.ok(end < 1.05, `Expected ~1.0x at end, got ${end}`);

  assert.equal(computeWrongEatTuingScale('salahMakan', 0, true), 3);
});

test('head-only food sensor vs body-below-neck sebel trigger, while trap sensor remains unchanged', () => {
  const playerX = 225;
  const head = getPlayerHeadBox(playerX, PLAYER_FIXED_Y);
  const body = getPlayerBodyBox(playerX, PLAYER_FIXED_Y);
  const mouth = getPlayerMouthBox(playerX, PLAYER_FIXED_Y);

  // Food touching head (neck up) -> caught!
  assert.equal(
    checkHeadCollision(head, { x: head.cx, y: head.cy, size: ITEM_SIZE_FOOD, resolved: false }),
    true,
  );

  // Food touching torso/legs below neck -> NOT caught by head, triggers body sebel!
  const torsoItem = { x: body.cx, y: PLAYER_FIXED_Y + PLAYER_HEIGHT * 0.84, size: ITEM_SIZE_FOOD, resolved: false };
  assert.equal(checkHeadCollision(head, torsoItem), false);
  assert.equal(checkBodyBelowNeckCollision(body, torsoItem), true);

  // Once flagged missedByBody, does not re-trigger body or head
  assert.equal(
    checkBodyBelowNeckCollision(body, { ...torsoItem, missedByBody: true }),
    false,
  );

  // Trap sensor remains the classic mouth sensor
  assert.equal(
    checkMouthCollision(mouth, { x: mouth.cx, y: mouth.cy, size: ITEM_SIZE_TRAP, resolved: false }),
    true,
  );
  assert.equal(
    checkMouthCollision(mouth, { x: mouth.cx, y: PLAYER_FIXED_Y + 155, size: ITEM_SIZE_TRAP, resolved: false }),
    false,
  );
});

test('mistake rules: 3 hearts per level, mistake 3 -> last chance, mistake 4 -> game over', () => {
  assert.deepEqual(evaluateMistakes(0), {
    mistakes: 0,
    remainingHearts: 3,
    isLastChance: false,
    isGameOver: false,
  });
  assert.deepEqual(evaluateMistakes(3), {
    mistakes: 3,
    remainingHearts: 0,
    isLastChance: true,
    isGameOver: false,
  });
  assert.deepEqual(evaluateMistakes(4), {
    mistakes: 4,
    remainingHearts: 0,
    isLastChance: false,
    isGameOver: true,
  });
});

test('5-level target evaluation & progression: escalating difficulty and victory at Level 5', () => {
  assert.equal(TOTAL_LEVELS, 5);
  assert.equal(LEVELS.length, 5);
  for (let i = 0; i < 4; i++) {
    assert.ok(LEVELS[i + 1].minSpeed > LEVELS[i].minSpeed, `Level ${i + 2} speed must increase`);
    assert.ok(LEVELS[i + 1].trapProbability > LEVELS[i].trapProbability, `Level ${i + 2} trapProb must increase`);
    assert.ok(LEVELS[i + 1].targetFoods > LEVELS[i].targetFoods, `Level ${i + 2} targetFoods must increase`);
    assert.ok(LEVELS[i + 1].targetLevelScore > LEVELS[i].targetLevelScore, `Level ${i + 2} targetScore must increase`);
  }

  const partial = evaluateLevelTargetProgress(1, LEVELS[0].targetFoods, LEVELS[0].targetLevelScore - 10);
  assert.equal(partial.foodsDone, true);
  assert.equal(partial.scoreDone, false);
  assert.equal(partial.allTargetsMet, false);

  const upFrom2 = advanceLevelProgression(2, 25, 0.1, LEVELS[1].targetFoods, LEVELS[1].targetLevelScore);
  assert.equal(upFrom2.nextLevel, 3);
  assert.equal(upFrom2.leveledUp, true);
  assert.equal(upFrom2.wonGame, false);

  const expired = advanceLevelProgression(3, 0.1, 0.2, 4, 50);
  assert.equal(expired.timedOut, true);
  assert.equal(expired.leveledUp, false);
  assert.equal(expired.wonGame, false);

  const win = advanceLevelProgression(5, 18, 0.1, LEVELS[4].targetFoods, LEVELS[4].targetLevelScore);
  assert.equal(win.wonGame, true);
  assert.equal(win.leveledUp, false);
  assert.equal(win.timedOut, false);
});

test('superhero triggers once per level when <= 3 foods remain with time left, flying smoothly right-to-left with trailing banner', () => {
  assert.equal(SUPERHERO_BANNER_TEXT, 'KURANG 3 LAGI');

  // Lv 1 targetFoods = 10 -> 4 left (6 eaten) should NOT trigger; 3 left (7 eaten) triggers
  assert.equal(shouldTriggerSuperhero(1, 6, 30, false), false);
  assert.equal(shouldTriggerSuperhero(1, 7, 30, false), true);
  assert.equal(shouldTriggerSuperhero(1, 7, 30, true), false);
  assert.equal(shouldTriggerSuperhero(1, 7, 0, false), false);
  assert.equal(shouldTriggerSuperhero(5, LEVELS[4].targetFoods - 3, 20, false), true);

  const hero = createSuperheroFlyby(ARENA_WIDTH);
  assert.equal(hero.active, true);
  assert.ok(hero.x > ARENA_WIDTH * 0.9, 'Starts from right edge');
  assert.equal(hero.y, SUPERHERO_BASE_Y);

  const startX = hero.x;
  stepSuperheroFlyby(hero, 1.0);
  assert.ok(hero.x < startX, 'Flies leftward smoothly');
  assert.equal(hero.active, true);

  // When superhero body has crossed x = -hero.width * 0.8, trailing banner is still visible -> must stay active
  hero.x = -hero.width * 0.8;
  stepSuperheroFlyby(hero, 0.016);
  assert.equal(hero.active, true, 'Remains active while trailing KURANG 3 LAGI text exits left edge');

  // Once superhero + trailing banner tail clear the left edge, becomes inactive
  hero.x = -(hero.width * 0.65 + SUPERHERO_BANNER_TAIL_WIDTH + 5);
  stepSuperheroFlyby(hero, 0.016);
  assert.equal(hero.active, false, 'Exits cleanly past the left edge after full trailing banner clears');
});

test('fair spawner and Mystery Box rules across Levels 1-5', () => {
  assert.equal(LEVELS[0].mysteryBoxProbability, 0);
  assert.ok(LEVELS[1].mysteryBoxProbability > 0);
  assert.ok(LEVELS[4].mysteryBoxProbability >= LEVELS[2].mysteryBoxProbability);

  const existing = [{ x: 225, y: 20, resolved: false }];
  let calls = 0;
  const seq = [0.5, 0.1];
  const chosen = pickFairSpawnX(existing, ITEM_SIZE_FOOD, () => seq[calls++ % seq.length]);
  assert.ok(Math.abs(chosen - 225) >= 76);

  const lv1Trap = spawnFallingItem(1, 1, existing, () => 0.05);
  assert.equal(lv1Trap.kind, 'trap');
  assert.equal(lv1Trap.points, -TRAP_SCORE_PENALTY);

  const lv2FoodMystery = spawnFallingItem(2, 2, existing, () => 0.05);
  assert.equal(lv2FoodMystery.kind, 'mystery');
  assert.equal(lv2FoodMystery.mysteryOutcome?.kind, 'food');
  assert.ok((lv2FoodMystery.mysteryOutcome?.points ?? 0) >= 25);

  let idx = 0;
  const trapSeq = [0.05, 0.85, 0.1, 0.5];
  const lv5TrapMystery = spawnFallingItem(3, 5, existing, () => trapSeq[idx++ % trapSeq.length]);
  assert.equal(lv5TrapMystery.kind, 'mystery');
  assert.equal(lv5TrapMystery.mysteryOutcome?.kind, 'trap');
  assert.equal(lv5TrapMystery.mysteryOutcome?.points, -TRAP_SCORE_PENALTY);
});
