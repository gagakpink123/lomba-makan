import {
  WEIGHTED_FOOD_POOL,
  TRAP_POOL,
  FOOD_SPRITES,
  TRAP_SPRITES,
  type CharacterSpriteKey,
  type FoodId,
  type TrapId,
  type ItemSpriteKey,
} from './assets';
import { getLevelConfig, TOTAL_LEVELS } from './levels';

export const ARENA_WIDTH = 450;
export const ARENA_HEIGHT = 800;

// Character sprite proportions (266 x 426 native) — slightly enlarged & proportional
const PLAYER_NATIVE_RATIO = 266 / 426;
export const PLAYER_HEIGHT = 172;
export const PLAYER_WIDTH = Math.round(PLAYER_HEIGHT * PLAYER_NATIVE_RATIO); // ~107px
const PLAYER_MARGIN_X = 12;
const PLAYER_BOTTOM_OFFSET = 114;
export const PLAYER_FIXED_Y = ARENA_HEIGHT - PLAYER_BOTTOM_OFFSET - PLAYER_HEIGHT; // Proportional standing line above bottom hint
const PLAYER_MOVE_SPEED = 460; // Base horizontal speed at 450px arena width

// Head sensor (neck up: 0..48% of 266x426 sprite) for catching food
const HEAD_OFFSET_Y_RATIO = 0.25;
const HEAD_HIT_RADIUS_X = 34;
const HEAD_HIT_RADIUS_Y = 36;

// Body sensor (below neck to shoes: 49..98% of sprite) -> triggers 'sebel' when food hits body
const BODY_OFFSET_Y_RATIO = 0.75;
const BODY_HIT_RADIUS_X = 34;
const BODY_HIT_RADIUS_Y = 40;

// Existing mouth/trap sensor (unchanged for traps / non-food objects)
const MOUTH_OFFSET_Y_RATIO = 0.41;
const MOUTH_HIT_RADIUS_X = 32;
const MOUTH_HIT_RADIUS_Y = 24;

// Slightly larger falling objects (proportional to character & arena)
export const ITEM_SIZE_FOOD = 68;
export const ITEM_SIZE_TRAP = 66;
export const ITEM_SIZE_MYSTERY = 70;
const MYSTERY_BONUS_EXTRA = 15;
const MYSTERY_FOOD_BONUS_POINTS = 25;
export const TRAP_SCORE_PENALTY = 15;
const MIN_SPAWN_X_GAP = 76;

// Flying superhero event (500 x 270 native)
const SUPERHERO_TRIGGER_REMAINING_FOODS = 3;
const SUPERHERO_NATIVE_RATIO = 500 / 270;
const SUPERHERO_WIDTH = 112;
const SUPERHERO_HEIGHT = Math.round(SUPERHERO_WIDTH / SUPERHERO_NATIVE_RATIO); // ~60px
export const SUPERHERO_BASE_Y = 256;
const SUPERHERO_BASE_SPEED = 115;
export const SUPERHERO_BANNER_TEXT = 'KURANG 3 LAGI';
export const SUPERHERO_BANNER_TAIL_WIDTH = 245;

// Animation timings (sec)
const WALK_FRAME_INTERVAL_SEC = 1 / 9; // ~9 FPS alternation between walk 1 and walk 2
export const EAT_EXPRESSION_DURATION_SEC = 0.65; // 500-800ms
export const SEBEL_EXPRESSION_DURATION_SEC = 0.78;
export const WRONG_EXPRESSION_DURATION_SEC = 0.92; // 700-1000ms
export const WRONG_TUING_MAX_SCALE = 3.0;

// Mistake rules: 3 chances per level (3 hearts). 4th mistake in a level = Game Over.
const MAX_HEARTS = 3;
const MAX_MISTAKES_GAME_OVER = 4;

export type GameScreenState =
  | 'title'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'victory';

type ExpressionOverride = 'none' | 'makan' | 'salahMakan' | 'sebel';

export interface MysteryOutcome {
  kind: 'food' | 'trap';
  spriteKey: ItemSpriteKey;
  label: string;
  points: number;
}

export interface FallingItem {
  id: number;
  kind: 'food' | 'trap' | 'mystery';
  spriteKey: ItemSpriteKey;
  label: string;
  points: number;
  mysteryOutcome?: MysteryOutcome;
  x: number;
  y: number;
  baseX: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  resolved: boolean;
  missedByBody?: boolean;
}

export interface SuperheroFlyby {
  active: boolean;
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  speed: number;
  elapsed: number;
}

export interface PlayerState {
  x: number; // center X
  y: number; // fixed top Y (never moves vertically)
  targetX: number | null;
  vx: number;
  isMoving: boolean;
  walkTimer: number;
  walkFrame: 0 | 1;
  expression: ExpressionOverride;
  expressionTimer: number;
}

interface MistakeResolution {
  mistakes: number;
  remainingHearts: number;
  isLastChance: boolean;
  isGameOver: boolean;
}

interface LevelTargetProgress {
  targetFoods: number;
  targetLevelScore: number;
  foodsDone: boolean;
  scoreDone: boolean;
  allTargetsMet: boolean;
}

interface MouthBox {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function createInitialPlayerState(arenaWidth: number = ARENA_WIDTH): PlayerState {
  return {
    x: arenaWidth / 2,
    y: PLAYER_FIXED_Y,
    targetX: null,
    vx: 0,
    isMoving: false,
    walkTimer: 0,
    walkFrame: 0,
    expression: 'none',
    expressionTimer: 0,
  };
}

export function clampPlayerX(x: number, arenaWidth: number = ARENA_WIDTH): number {
  const halfW = PLAYER_WIDTH / 2;
  const minX = halfW + PLAYER_MARGIN_X;
  const maxX = Math.max(minX, arenaWidth - halfW - PLAYER_MARGIN_X);
  return Math.max(minX, Math.min(maxX, x));
}

export function pickWeightedFood(rng: () => number = Math.random): FoodId {
  const idx = Math.floor(rng() * WEIGHTED_FOOD_POOL.length);
  return WEIGHTED_FOOD_POOL[Math.min(WEIGHTED_FOOD_POOL.length - 1, Math.max(0, idx))];
}

export function pickRandomTrap(rng: () => number = Math.random): TrapId {
  const idx = Math.floor(rng() * TRAP_POOL.length);
  return TRAP_POOL[Math.min(TRAP_POOL.length - 1, Math.max(0, idx))];
}

export function pickFairSpawnX(
  existingItems: readonly Pick<FallingItem, 'x' | 'y' | 'resolved'>[],
  itemSize: number,
  rng: () => number = Math.random,
  arenaWidth: number = ARENA_WIDTH,
): number {
  const minX = itemSize / 2 + 16;
  const maxX = Math.max(minX, arenaWidth - itemSize / 2 - 16);
  const topItems = existingItems.filter((item) => !item.resolved && item.y < 150);

  let bestCandidate = minX + rng() * (maxX - minX);
  let bestMinDist = -1;

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = minX + rng() * (maxX - minX);
    if (topItems.length === 0) {
      return candidate;
    }
    let nearest = Infinity;
    for (const item of topItems) {
      const dist = Math.abs(item.x - candidate);
      if (dist < nearest) nearest = dist;
    }
    if (nearest >= MIN_SPAWN_X_GAP) {
      return candidate;
    }
    if (nearest > bestMinDist) {
      bestMinDist = nearest;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

export function pickMysteryOutcome(rng: () => number = Math.random): MysteryOutcome {
  const isFood = rng() < 0.65;
  if (isFood) {
    const foodId = pickWeightedFood(rng);
    const meta = FOOD_SPRITES[foodId];
    return {
      kind: 'food',
      spriteKey: foodId,
      label: meta.label,
      points: Math.max(MYSTERY_FOOD_BONUS_POINTS, meta.points + MYSTERY_BONUS_EXTRA),
    };
  }
  const trapId = pickRandomTrap(rng);
  const meta = TRAP_SPRITES[trapId];
  return {
    kind: 'trap',
    spriteKey: trapId,
    label: meta.label,
    points: -TRAP_SCORE_PENALTY,
  };
}

export function spawnFallingItem(
  nextId: number,
  levelNumber: number,
  existingItems: readonly Pick<FallingItem, 'x' | 'y' | 'resolved'>[],
  rng: () => number = Math.random,
  arenaWidth: number = ARENA_WIDTH,
): FallingItem {
  const cfg = getLevelConfig(levelNumber);
  const roll = rng();

  if (cfg.mysteryBoxProbability > 0 && roll < cfg.mysteryBoxProbability) {
    const outcome = pickMysteryOutcome(rng);
    const size = ITEM_SIZE_MYSTERY;
    const baseX = pickFairSpawnX(existingItems, size, rng, arenaWidth);
    const speed = cfg.minSpeed + rng() * (cfg.maxSpeed - cfg.minSpeed);
    return {
      id: nextId,
      kind: 'mystery',
      spriteKey: outcome.spriteKey,
      label: 'Mistery Box',
      points: outcome.points,
      mysteryOutcome: outcome,
      x: baseX,
      y: -size,
      baseX,
      size,
      speed,
      rotation: (rng() - 0.5) * 0.28,
      rotationSpeed: (rng() - 0.5) * 1.1,
      swayAmp: 8 + rng() * 10,
      swayFreq: 1.6 + rng() * 1.2,
      swayPhase: rng() * Math.PI * 2,
      resolved: false,
    };
  }

  const isTrap = roll < cfg.mysteryBoxProbability + cfg.trapProbability;

  if (isTrap) {
    const trapId = pickRandomTrap(rng);
    const meta = TRAP_SPRITES[trapId];
    const size = ITEM_SIZE_TRAP;
    const baseX = pickFairSpawnX(existingItems, size, rng, arenaWidth);
    const speed = cfg.minSpeed + rng() * (cfg.maxSpeed - cfg.minSpeed);
    return {
      id: nextId,
      kind: 'trap',
      spriteKey: trapId,
      label: meta.label,
      points: -TRAP_SCORE_PENALTY,
      x: baseX,
      y: -size,
      baseX,
      size,
      speed,
      rotation: (rng() - 0.5) * 0.4,
      rotationSpeed: (rng() - 0.5) * 1.4,
      swayAmp: 6 + rng() * 10,
      swayFreq: 1.5 + rng() * 1.4,
      swayPhase: rng() * Math.PI * 2,
      resolved: false,
    };
  }

  const foodId = pickWeightedFood(rng);
  const meta = FOOD_SPRITES[foodId];
  const size = ITEM_SIZE_FOOD;
  const baseX = pickFairSpawnX(existingItems, size, rng, arenaWidth);
  const speed = cfg.minSpeed + rng() * (cfg.maxSpeed - cfg.minSpeed);
  return {
    id: nextId,
    kind: 'food',
    spriteKey: foodId,
    label: meta.label,
    points: meta.points,
    x: baseX,
    y: -size,
    baseX,
    size,
    speed,
    rotation: (rng() - 0.5) * 0.35,
    rotationSpeed: (rng() - 0.5) * 1.1,
    swayAmp: 7 + rng() * 12,
    swayFreq: 1.4 + rng() * 1.4,
    swayPhase: rng() * Math.PI * 2,
    resolved: false,
  };
}

export function applyFoodCatchScore(
  totalScore: number,
  levelScore: number,
  points: number,
): { totalScore: number; levelScore: number } {
  const safePts = Math.max(0, Math.round(points));
  return {
    totalScore: totalScore + safePts,
    levelScore: levelScore + safePts,
  };
}

export function applyTrapPenalty(
  totalScore: number,
  levelScore: number,
  penalty: number = TRAP_SCORE_PENALTY,
): { totalScore: number; levelScore: number; appliedPenalty: number } {
  const safePenalty = Math.max(0, Math.round(penalty));
  return {
    totalScore: Math.max(0, totalScore - safePenalty),
    levelScore: Math.max(0, levelScore - safePenalty),
    appliedPenalty: safePenalty,
  };
}

export function evaluateLevelTargetProgress(
  levelNumber: number,
  levelFoodsEaten: number,
  levelScore: number,
): LevelTargetProgress {
  const cfg = getLevelConfig(levelNumber);
  const foodsDone = levelFoodsEaten >= cfg.targetFoods;
  const scoreDone = levelScore >= cfg.targetLevelScore;
  return {
    targetFoods: cfg.targetFoods,
    targetLevelScore: cfg.targetLevelScore,
    foodsDone,
    scoreDone,
    allTargetsMet: foodsDone && scoreDone,
  };
}

export function getPlayerHeadBox(playerX: number, playerY: number = PLAYER_FIXED_Y): MouthBox {
  return {
    cx: playerX,
    cy: playerY + PLAYER_HEIGHT * HEAD_OFFSET_Y_RATIO,
    rx: HEAD_HIT_RADIUS_X,
    ry: HEAD_HIT_RADIUS_Y,
  };
}

export function getPlayerBodyBox(playerX: number, playerY: number = PLAYER_FIXED_Y): MouthBox {
  return {
    cx: playerX,
    cy: playerY + PLAYER_HEIGHT * BODY_OFFSET_Y_RATIO,
    rx: BODY_HIT_RADIUS_X,
    ry: BODY_HIT_RADIUS_Y,
  };
}

export function getPlayerMouthBox(playerX: number, playerY: number = PLAYER_FIXED_Y): MouthBox {
  return {
    cx: playerX,
    cy: playerY + PLAYER_HEIGHT * MOUTH_OFFSET_Y_RATIO,
    rx: MOUTH_HIT_RADIUS_X,
    ry: MOUTH_HIT_RADIUS_Y,
  };
}

export function checkHeadCollision(
  head: MouthBox,
  item: Pick<FallingItem, 'x' | 'y' | 'size' | 'resolved' | 'missedByBody'>,
): boolean {
  if (item.resolved || item.missedByBody) return false;
  const itemRadius = item.size * 0.37;
  const dx = Math.abs(item.x - head.cx);
  const dy = Math.abs(item.y - head.cy);
  return dx <= head.rx + itemRadius && dy <= head.ry + itemRadius;
}

export function checkBodyBelowNeckCollision(
  body: MouthBox,
  item: Pick<FallingItem, 'x' | 'y' | 'size' | 'resolved' | 'missedByBody'>,
): boolean {
  if (item.resolved || item.missedByBody) return false;
  const itemRadius = item.size * 0.35;
  const dx = Math.abs(item.x - body.cx);
  const dy = Math.abs(item.y - body.cy);
  return dx <= body.rx + itemRadius && dy <= body.ry + itemRadius;
}

export function checkMouthCollision(
  mouth: MouthBox,
  item: Pick<FallingItem, 'x' | 'y' | 'size' | 'resolved'>,
): boolean {
  if (item.resolved) return false;
  const itemRadius = item.size * 0.37;
  const dx = Math.abs(item.x - mouth.cx);
  const dy = Math.abs(item.y - mouth.cy);
  return dx <= mouth.rx + itemRadius && dy <= mouth.ry + itemRadius;
}

export function shouldTriggerSuperhero(
  levelNumber: number,
  levelFoodsEaten: number,
  timeRemaining: number,
  alreadyTriggeredThisLevel: boolean,
): boolean {
  if (alreadyTriggeredThisLevel || timeRemaining <= 0) return false;
  const cfg = getLevelConfig(levelNumber);
  const remainingFoods = cfg.targetFoods - levelFoodsEaten;
  return remainingFoods > 0 && remainingFoods <= SUPERHERO_TRIGGER_REMAINING_FOODS;
}

export function createSuperheroFlyby(arenaWidth: number = ARENA_WIDTH): SuperheroFlyby {
  const speedScale = Math.pow(Math.max(1, arenaWidth / ARENA_WIDTH), 0.72);
  return {
    active: true,
    x: arenaWidth + SUPERHERO_WIDTH * 0.15,
    y: SUPERHERO_BASE_Y,
    baseY: SUPERHERO_BASE_Y,
    width: SUPERHERO_WIDTH,
    height: SUPERHERO_HEIGHT,
    speed: SUPERHERO_BASE_SPEED * speedScale,
    elapsed: 0,
  };
}

export function stepSuperheroFlyby(hero: SuperheroFlyby, dt: number): void {
  if (!hero.active) return;
  hero.elapsed += dt;
  hero.x -= hero.speed * dt;
  hero.y = hero.baseY + Math.sin(hero.elapsed * 2.6) * 5;
  if (hero.x < -(hero.width * 0.65 + SUPERHERO_BANNER_TAIL_WIDTH)) {
    hero.active = false;
  }
}

export function evaluateMistakes(mistakes: number): MistakeResolution {
  const clamped = Math.max(0, mistakes);
  const remainingHearts = Math.max(0, MAX_HEARTS - clamped);
  const isLastChance = clamped === MAX_HEARTS;
  const isGameOver = clamped >= MAX_MISTAKES_GAME_OVER;
  return {
    mistakes: clamped,
    remainingHearts,
    isLastChance,
    isGameOver,
  };
}

export function resolveCharacterSprite(
  player: Pick<PlayerState, 'expression' | 'isMoving' | 'walkFrame'>,
  isGameOver: boolean,
): CharacterSpriteKey {
  if (isGameOver || player.expression === 'salahMakan') {
    return 'salahMakan';
  }
  if (player.expression === 'makan') {
    return 'makan';
  }
  if (player.expression === 'sebel') {
    return 'sebel';
  }
  if (player.isMoving) {
    return player.walkFrame === 0 ? 'walk1' : 'walk2';
  }
  return 'walk1';
}

/**
 * Computes the dramatic 3x ("Tuing") cartoon spring scale when eating a wrong item.
 * Peaks at 3.0x immediately after collision, wobbles playfully, then springs back to 1.0x.
 */
export function computeWrongEatTuingScale(
  expression: ExpressionOverride,
  expressionTimer: number,
  isGameOver: boolean,
  duration: number = WRONG_EXPRESSION_DURATION_SEC,
): number {
  if (isGameOver) {
    return WRONG_TUING_MAX_SCALE;
  }
  if (expression !== 'salahMakan' || expressionTimer <= 0 || duration <= 0) {
    return 1;
  }
  const progress = Math.max(0, Math.min(1, 1 - expressionTimer / duration));
  const delta = WRONG_TUING_MAX_SCALE - 1;

  if (progress < 0.16) {
    const t = progress / 0.16;
    const easeOut = 1 - Math.pow(1 - t, 3);
    return 1 + delta * easeOut;
  }
  if (progress < 0.72) {
    const t = (progress - 0.16) / 0.56;
    const wobble = Math.abs(Math.sin(t * Math.PI * 2.5)) * 0.36;
    return WRONG_TUING_MAX_SCALE - wobble;
  }
  const t = (progress - 0.72) / 0.28;
  const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return 1 + delta * (1 - easeInOut);
}

export function stepPlayerMovement(
  player: PlayerState,
  dt: number,
  axisInput: number, // -1, 0, +1
  arenaWidth: number = ARENA_WIDTH,
): void {
  const prevX = player.x;
  const speedScale = Math.pow(Math.max(1, arenaWidth / ARENA_WIDTH), 0.72);
  const moveSpeed = PLAYER_MOVE_SPEED * speedScale;

  if (axisInput !== 0) {
    player.targetX = null;
    const desiredVx = axisInput * moveSpeed;
    const smooth = 1 - Math.exp(-18 * dt);
    player.vx += (desiredVx - player.vx) * smooth;
    player.x = clampPlayerX(player.x + player.vx * dt, arenaWidth);
  } else if (player.targetX !== null) {
    const clampedTarget = clampPlayerX(player.targetX, arenaWidth);
    const diff = clampedTarget - player.x;
    if (Math.abs(diff) < 1.5) {
      player.x = clampedTarget;
      player.vx = 0;
    } else {
      const followRate = 1 - Math.exp(-18 * dt);
      const nextX = player.x + diff * followRate;
      player.vx = (nextX - player.x) / Math.max(dt, 0.001);
      player.x = clampPlayerX(nextX, arenaWidth);
    }
  } else {
    const damping = Math.exp(-20 * dt);
    player.vx *= damping;
    if (Math.abs(player.vx) < 8) {
      player.vx = 0;
    }
    player.x = clampPlayerX(player.x + player.vx * dt, arenaWidth);
  }

  player.y = PLAYER_FIXED_Y;

  const movedDist = Math.abs(player.x - prevX);
  const movingNow = Math.abs(player.vx) > 20 || movedDist > 0.25;
  player.isMoving = movingNow;

  if (player.expression !== 'none') {
    player.expressionTimer -= dt;
    if (player.expressionTimer <= 0) {
      player.expression = 'none';
      player.expressionTimer = 0;
    }
  }

  if (movingNow) {
    player.walkTimer += dt;
    if (player.walkTimer >= WALK_FRAME_INTERVAL_SEC) {
      player.walkTimer -= WALK_FRAME_INTERVAL_SEC;
      player.walkFrame = player.walkFrame === 0 ? 1 : 0;
    }
  } else {
    player.walkTimer = 0;
    player.walkFrame = 0;
  }
}

export function advanceLevelProgression(
  currentLevel: number,
  timeRemaining: number,
  dt: number,
  levelFoodsEaten: number = 0,
  levelScore: number = 0,
): {
  nextLevel: number;
  nextTimeRemaining: number;
  leveledUp: boolean;
  wonGame: boolean;
  timedOut: boolean;
} {
  const targets = evaluateLevelTargetProgress(currentLevel, levelFoodsEaten, levelScore);
  if (targets.allTargetsMet) {
    if (currentLevel >= TOTAL_LEVELS) {
      return {
        nextLevel: TOTAL_LEVELS,
        nextTimeRemaining: Math.max(0, timeRemaining - dt),
        leveledUp: false,
        wonGame: true,
        timedOut: false,
      };
    }
    const nextLevel = currentLevel + 1;
    const nextCfg = getLevelConfig(nextLevel);
    return {
      nextLevel,
      nextTimeRemaining: nextCfg.durationSeconds,
      leveledUp: true,
      wonGame: false,
      timedOut: false,
    };
  }

  const remaining = timeRemaining - dt;
  if (remaining > 0) {
    return {
      nextLevel: currentLevel,
      nextTimeRemaining: remaining,
      leveledUp: false,
      wonGame: false,
      timedOut: false,
    };
  }

  return {
    nextLevel: currentLevel,
    nextTimeRemaining: 0,
    leveledUp: false,
    wonGame: false,
    timedOut: true,
  };
}
