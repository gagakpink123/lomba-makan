import {
  FOOD_SPRITES,
  TRAP_SPRITES,
  type FlyerSpriteKey,
  type ItemSpriteKey,
} from './assets';
import {
  SECTION2_MAX_LEVEL,
  SECTION2_MIN_LEVEL,
  getSection2LevelConfig,
  getSection2LevelForScore,
} from './levels';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  ITEM_SIZE_FOOD,
  ITEM_SIZE_MYSTERY,
  ITEM_SIZE_TRAP,
  TRAP_SCORE_PENALTY,
  computeWrongEatTuingScale,
  pickMysteryOutcome,
  pickRandomTrap,
  pickWeightedFood,
  type MysteryOutcome,
} from './rules';

// Attached superhero2 sprites face RIGHT (+X) with trailing red cape to the left (-X).
// Native dimensions around ~700x506 (~1.38 aspect).
const FLYER_NATIVE_RATIO = 700 / 506;
export const FLYER_HEIGHT = 104;
export const FLYER_WIDTH = Math.round(FLYER_HEIGHT * FLYER_NATIVE_RATIO); // ~144px
const FLYER_MOVE_SPEED = 450; // Vertical speed px/sec
const FLYER_TOP_MARGIN = 152; // Keeps hero well clear below top HUD
const FLYER_BOTTOM_MARGIN = 76; // Keeps hero above bottom control hint

// Life pools for Section 2 (each starts at 3; reaching 0 triggers Game Over)
export const FLYER_MAX_FOOD_CHANCES = 3;
export const FLYER_MAX_CRASH_CHANCES = 3;
export const FLYER_CRASH_INVULN_SEC = 1.5;

// Animation & feedback durations
const FLYER_CAPE_FRAME_INTERVAL_SEC = 1 / 7.5;
export const FLYER_EAT_DURATION_SEC = 0.42;
export const FLYER_TUING_DURATION_SEC = 0.85;

// Lorong Gelap (Dark Tunnel) real world-space horizontal portal cycle
export const SKY_PHASE_DURATION_SEC = 12.5;
const TUNNEL_WARNING_DURATION_SEC = 2.0;
export const TUNNEL_WORLD_LENGTH = 3600; // Horizontal length of cave tunnel in world px
export const TUNNEL_WALL_MAX_INSET = 64;

const SECTION2_HIGHSCORE_KEY = 'lmb_section2_highscore_v1';

type FlyerExpression = 'none' | 'makan' | 'salahMakan' | 'nabrak';

export interface FlyerPlayerState {
  x: number;
  y: number;
  vy: number;
  targetY: number | null;
  capeTimer: number;
  capeFrame: 0 | 1;
  expression: FlyerExpression;
  expressionTimer: number;
  invulnTimer: number; // >0 grants 1.5s blink invulnerability against obstacles
}

export interface FlyerItem {
  id: number;
  kind: 'food' | 'trap' | 'mystery';
  spriteKey: ItemSpriteKey;
  label: string;
  points: number;
  mysteryOutcome?: MysteryOutcome;
  x: number;
  y: number;
  baseY: number;
  size: number;
  speedScale: number;
  bobAmp: number;
  bobFreq: number;
  bobPhase: number;
  rotation: number;
  resolved: boolean;
}

type TunnelObstacleKind =
  | 'stalactite'
  | 'stalagmite'
  | 'narrowCorridor'
  | 'doubleGap'
  | 'floatingBlock'
  | 'spinningGear'
  | 'movingIronPlate';

export interface TunnelObstacle {
  id: number;
  kind: TunnelObstacleKind;
  x: number;
  width: number;
  topBottomY: number; // Bottom edge of ceiling obstacle (<= topBottomY is blocked)
  bottomTopY: number; // Top edge of floor obstacle (>= bottomTopY is blocked)
  // Two passable holes for 'doubleGap' (separated by solid stone divider [gap1Bottom, gap2Top])
  gap1Top?: number;
  gap1Bottom?: number;
  gap2Top?: number;
  gap2Bottom?: number;
  blockY?: number; // Center Y for floatingBlock / movingIronPlate / spinningGear
  blockH?: number; // Height for floatingBlock / movingIronPlate
  // Dynamic motion properties for spinningGear & movingIronPlate
  gearRadius?: number;
  gearAngle?: number;
  gearSpinSpeed?: number; // rad/s (positive CW, negative CCW)
  gearMountSide?: 'top' | 'bottom';
  plateBaseY?: number; // Center of vertical oscillation for movingIronPlate
  plateAmpY?: number; // Vertical swing amplitude in px
  plateSpeed?: number; // Angular velocity rad/s for vertical loop
  platePhase?: number; // Initial phase offset in rad
  plateVelY?: number; // Current vertical velocity px/s (for directional visual indicator)
  hit: boolean;
  passed: boolean;
}

export interface TunnelPhaseState {
  active: boolean; // True while tunnel span [leftX, rightX] exists on/approaching screen
  inTunnel: boolean; // True once hero has crossed inside [leftX, rightX]
  warningActive: boolean;
  skyTimer: number; // Counts up during open sky phase toward SKY_PHASE_DURATION_SEC
  leftX: number; // Screen X of Cave Entrance archway
  rightX: number; // Screen X of Cave Exit archway
  darknessAlpha: number; // Smooth 0..1 spotlight & cave darkness intensity when hero enters
  wallInset: number; // Smooth 0..TUNNEL_WALL_MAX_INSET for hero vertical clamping inside tunnel
}

interface FlyerHitBox {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function getFlyerAnchorX(arenaWidth: number = ARENA_WIDTH): number {
  return Math.round(Math.max(104, Math.min(186, arenaWidth * 0.24)));
}

export function clampFlyerY(y: number, wallInset: number = 0): number {
  const halfH = FLYER_HEIGHT * 0.42;
  const minY = FLYER_TOP_MARGIN + wallInset * 0.72 + halfH;
  const maxY = ARENA_HEIGHT - FLYER_BOTTOM_MARGIN - wallInset * 0.72 - halfH;
  if (minY >= maxY) {
    return ARENA_HEIGHT * 0.5;
  }
  return Math.max(minY, Math.min(maxY, y));
}

export function createInitialFlyerState(arenaWidth: number = ARENA_WIDTH): FlyerPlayerState {
  return {
    x: getFlyerAnchorX(arenaWidth),
    y: Math.round(ARENA_HEIGHT * 0.52),
    vy: 0,
    targetY: null,
    capeTimer: 0,
    capeFrame: 0,
    expression: 'none',
    expressionTimer: 0,
    invulnTimer: 0,
  };
}

export type TunnelStartMode = 'sky' | 'inside' | 'portal' | 'exit';

export function createTunnelState(
  startMode: boolean | TunnelStartMode = 'sky',
  arenaWidth: number = ARENA_WIDTH,
): TunnelPhaseState {
  const mode: TunnelStartMode =
    startMode === true ? 'inside' : startMode === false ? 'sky' : startMode;

  if (mode === 'inside') {
    return {
      active: true,
      inTunnel: true,
      warningActive: false,
      skyTimer: 0,
      leftX: -180,
      rightX: TUNNEL_WORLD_LENGTH - 180,
      darknessAlpha: 1,
      wallInset: TUNNEL_WALL_MAX_INSET,
    };
  }

  if (mode === 'portal') {
    const entranceX = Math.round(arenaWidth * 0.56);
    return {
      active: true,
      inTunnel: false,
      warningActive: true,
      skyTimer: 0,
      leftX: entranceX,
      rightX: entranceX + TUNNEL_WORLD_LENGTH,
      darknessAlpha: 0,
      wallInset: 0,
    };
  }

  if (mode === 'exit') {
    const exitX = Math.round(arenaWidth * 0.58);
    return {
      active: true,
      inTunnel: true,
      warningActive: false,
      skyTimer: 0,
      leftX: exitX - TUNNEL_WORLD_LENGTH,
      rightX: exitX,
      darknessAlpha: 1,
      wallInset: TUNNEL_WALL_MAX_INSET,
    };
  }

  return {
    active: false,
    inTunnel: false,
    warningActive: false,
    skyTimer: 0,
    leftX: arenaWidth + 200,
    rightX: arenaWidth + 200 + TUNNEL_WORLD_LENGTH,
    darknessAlpha: 0,
    wallInset: 0,
  };
}

export function stepTunnelState(
  state: TunnelPhaseState,
  dt: number,
  scrollSpeed: number = 250,
  heroX: number = getFlyerAnchorX(ARENA_WIDTH),
  arenaWidth: number = ARENA_WIDTH,
): {
  spawnedTunnel: boolean;
  enteredTunnel: boolean;
  exitedTunnel: boolean;
  startedWarning: boolean;
} {
  const prevInTunnel = state.inTunnel;
  const prevWarning = state.warningActive;
  let spawnedTunnel = false;

  if (!state.active) {
    state.skyTimer += dt;
    const warningStart = Math.max(1, SKY_PHASE_DURATION_SEC - TUNNEL_WARNING_DURATION_SEC);
    state.warningActive = state.skyTimer >= warningStart;
    state.inTunnel = false;

    if (state.skyTimer >= SKY_PHASE_DURATION_SEC) {
      state.active = true;
      state.skyTimer = 0;
      state.leftX = arenaWidth + 140;
      state.rightX = state.leftX + TUNNEL_WORLD_LENGTH;
      spawnedTunnel = true;
    }
  } else {
    state.leftX -= scrollSpeed * dt;
    state.rightX -= scrollSpeed * dt;

    // Hero is inside the physical cave once their X passes the cave entrance until they pass exit
    state.inTunnel = heroX >= state.leftX - 8 && heroX <= state.rightX + 8;
    // Show warning while cave mouth is approaching on screen before hero enters
    state.warningActive = !state.inTunnel && heroX < state.leftX - 8;

    // Once the entire cave exit archway has scrolled off the left edge, reset cleanly to Open Sky
    if (state.rightX < -180) {
      state.active = false;
      state.inTunnel = false;
      state.warningActive = false;
      state.skyTimer = 0;
    }
  }

  // Smoothly ramp hero wall-clamp inset just before entering the mouth so hero aligns cleanly into cave
  const approachingMouth = state.active && heroX >= state.leftX - 130 && heroX <= state.rightX - 10;
  const targetInset = state.inTunnel || approachingMouth ? TUNNEL_WALL_MAX_INSET : 0;
  const targetDark = state.inTunnel ? 1 : 0;
  const lerpRate = 1 - Math.exp(-5.2 * dt);

  state.darknessAlpha += (targetDark - state.darknessAlpha) * lerpRate;
  state.wallInset += (targetInset - state.wallInset) * lerpRate;

  if (Math.abs(targetDark - state.darknessAlpha) < 0.005) {
    state.darknessAlpha = targetDark;
  }
  if (Math.abs(targetInset - state.wallInset) < 0.25) {
    state.wallInset = targetInset;
  }

  return {
    spawnedTunnel,
    enteredTunnel: !prevInTunnel && state.inTunnel,
    exitedTunnel: prevInTunnel && !state.inTunnel,
    startedWarning: !prevWarning && state.warningActive,
  };
}

export function computeSection2ScrollSpeed(
  startLevel: number,
  runScore: number,
): { currentLevel: number; scrollSpeed: number } {
  const currentLevel = getSection2LevelForScore(startLevel, runScore);
  const clampedStart = Math.max(SECTION2_MIN_LEVEL, Math.min(SECTION2_MAX_LEVEL, Math.round(startLevel)));
  const startCfg = getSection2LevelConfig(clampedStart);
  const activeCfg = getSection2LevelConfig(currentLevel);

  // Smoothly ramp scroll speed within and across levels as score increases
  const scoreProgress = Math.min(1, runScore / 1500);
  const rawSpeed =
    activeCfg.baseScrollSpeed +
    (activeCfg.maxScrollSpeed - activeCfg.baseScrollSpeed) * scoreProgress;
  const minFloor = startCfg.baseScrollSpeed;
  return {
    currentLevel,
    scrollSpeed: Math.max(minFloor, Math.min(activeCfg.maxScrollSpeed, rawSpeed)),
  };
}

export function stepFlyerMovement(
  player: FlyerPlayerState,
  dt: number,
  verticalAxis: number, // -1 (up), 0, +1 (down)
  arenaWidth: number = ARENA_WIDTH,
  wallInset: number = 0,
): void {
  player.x = getFlyerAnchorX(arenaWidth);

  if (verticalAxis !== 0) {
    player.targetY = null;
    const desiredVy = verticalAxis * FLYER_MOVE_SPEED;
    const smooth = 1 - Math.exp(-16 * dt);
    player.vy += (desiredVy - player.vy) * smooth;
    player.y = clampFlyerY(player.y + player.vy * dt, wallInset);
  } else if (player.targetY !== null) {
    const clampedTarget = clampFlyerY(player.targetY, wallInset);
    const diff = clampedTarget - player.y;
    if (Math.abs(diff) < 1.5) {
      player.y = clampedTarget;
      player.vy = 0;
    } else {
      const followRate = 1 - Math.exp(-18 * dt);
      const nextY = player.y + diff * followRate;
      player.vy = (nextY - player.y) / Math.max(dt, 0.001);
      player.y = clampFlyerY(nextY, wallInset);
    }
  } else {
    const damping = Math.exp(-18 * dt);
    player.vy *= damping;
    if (Math.abs(player.vy) < 8) player.vy = 0;
    player.y = clampFlyerY(player.y + player.vy * dt, wallInset);
  }

  // Constant billowing cape animation alternating idle1 <-> idle2
  player.capeTimer += dt;
  if (player.capeTimer >= FLYER_CAPE_FRAME_INTERVAL_SEC) {
    player.capeTimer -= FLYER_CAPE_FRAME_INTERVAL_SEC;
    player.capeFrame = player.capeFrame === 0 ? 1 : 0;
  }

  if (player.expression !== 'none') {
    player.expressionTimer -= dt;
    if (player.expressionTimer <= 0) {
      player.expression = 'none';
      player.expressionTimer = 0;
    }
  }

  if (player.invulnTimer > 0) {
    player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  }
}

export function resolveFlyerSprite(
  player: Pick<FlyerPlayerState, 'expression' | 'capeFrame'>,
  isGameOver: boolean,
  gameOverCause?: 'mistakes' | 'crash',
): FlyerSpriteKey {
  if (isGameOver) {
    return gameOverCause === 'crash' ? 'flyerNabrak' : 'flyerSalahMakan';
  }
  if (player.expression === 'nabrak') return 'flyerNabrak';
  if (player.expression === 'salahMakan') return 'flyerSalahMakan';
  if (player.expression === 'makan') return 'flyerMakan';
  return player.capeFrame === 0 ? 'flyerIdle1' : 'flyerIdle2';
}

export function computeFlyerTuingScale(
  expression: FlyerExpression,
  expressionTimer: number,
  isGameOver: boolean,
  duration: number = FLYER_TUING_DURATION_SEC,
): number {
  const mappedExpr = expression === 'salahMakan' || expression === 'nabrak' ? 'salahMakan' : 'none';
  return computeWrongEatTuingScale(mappedExpr, expressionTimer, isGameOver, duration);
}

/**
 * Head/mouth hitbox of the right-facing flying superhero (head sits in upper-right quadrant).
 */
export function getFlyerHeadBox(heroX: number, heroY: number): FlyerHitBox {
  return {
    cx: heroX + FLYER_WIDTH * 0.22,
    cy: heroY - FLYER_HEIGHT * 0.13,
    rx: 34,
    ry: 32,
  };
}

/**
 * Body + head collision box used against physical cave obstacles (slightly forgiving so narrow gaps feel great).
 */
export function getFlyerBodyBox(heroX: number, heroY: number): FlyerHitBox {
  return {
    cx: heroX + 4,
    cy: heroY + 2,
    rx: FLYER_WIDTH * 0.34,
    ry: FLYER_HEIGHT * 0.31,
  };
}

export function checkFlyerItemCollision(
  headBox: FlyerHitBox,
  item: Pick<FlyerItem, 'x' | 'y' | 'size' | 'resolved'>,
): boolean {
  if (item.resolved) return false;
  const itemR = item.size * 0.38;
  const dx = Math.abs(item.x - headBox.cx);
  const dy = Math.abs(item.y - headBox.cy);
  return dx <= headBox.rx + itemR && dy <= headBox.ry + itemR;
}

export function stepTunnelObstacleMotion(
  obstacle: TunnelObstacle,
  dt: number,
  worldTime: number,
): void {
  if (obstacle.kind === 'spinningGear') {
    const spin = obstacle.gearSpinSpeed ?? 5.2;
    obstacle.gearAngle = (obstacle.gearAngle ?? 0) + spin * dt;
  } else if (obstacle.kind === 'movingIronPlate') {
    const baseY = obstacle.plateBaseY ?? ARENA_HEIGHT * 0.5;
    const amp = obstacle.plateAmpY ?? 95;
    const speed = obstacle.plateSpeed ?? 2.5;
    const phase = obstacle.platePhase ?? 0;
    const theta = worldTime * speed + phase;
    obstacle.blockY = baseY + Math.sin(theta) * amp;
    obstacle.plateVelY = Math.cos(theta) * amp * speed;
  }
}

export function checkFlyerObstacleCollision(
  bodyBox: FlyerHitBox,
  obstacle: Pick<
    TunnelObstacle,
    | 'kind'
    | 'x'
    | 'width'
    | 'topBottomY'
    | 'bottomTopY'
    | 'gap1Top'
    | 'gap1Bottom'
    | 'gap2Top'
    | 'gap2Bottom'
    | 'blockY'
    | 'blockH'
    | 'gearRadius'
    | 'hit'
  >,
): boolean {
  if (obstacle.hit) return false;
  const obsHalfW = obstacle.width / 2;
  const overlapX = Math.abs(bodyBox.cx - obstacle.x) <= bodyBox.rx + obsHalfW;
  if (!overlapX) return false;

  const heroTop = bodyBox.cy - bodyBox.ry;
  const heroBottom = bodyBox.cy + bodyBox.ry;

  if (obstacle.kind === 'stalactite') {
    return heroTop <= obstacle.topBottomY;
  }
  if (obstacle.kind === 'stalagmite') {
    return heroBottom >= obstacle.bottomTopY;
  }
  if (obstacle.kind === 'narrowCorridor') {
    return heroTop <= obstacle.topBottomY || heroBottom >= obstacle.bottomTopY;
  }
  if (obstacle.kind === 'doubleGap') {
    const g1Top = obstacle.gap1Top ?? obstacle.topBottomY;
    const g1Bottom = obstacle.gap1Bottom ?? obstacle.topBottomY + 120;
    const g2Top = obstacle.gap2Top ?? obstacle.bottomTopY - 120;
    const g2Bottom = obstacle.gap2Bottom ?? obstacle.bottomTopY;
    // Collides with ceiling wall, middle solid rock divider, or floor wall
    const hitsTopWall = heroTop < g1Top;
    const hitsMiddleDivider = heroBottom > g1Bottom && heroTop < g2Top;
    const hitsBottomWall = heroBottom > g2Bottom;
    return hitsTopWall || hitsMiddleDivider || hitsBottomWall;
  }
  if (obstacle.kind === 'spinningGear') {
    const gearY = obstacle.blockY ?? ARENA_HEIGHT * 0.5;
    const effectiveR = (obstacle.gearRadius ?? obstacle.width * 0.5) * 0.88;
    const closestX = Math.max(bodyBox.cx - bodyBox.rx, Math.min(bodyBox.cx + bodyBox.rx, obstacle.x));
    const closestY = Math.max(heroTop, Math.min(heroBottom, gearY));
    const dx = obstacle.x - closestX;
    const dy = gearY - closestY;
    return dx * dx + dy * dy <= effectiveR * effectiveR;
  }
  // floatingBlock & movingIronPlate
  const blockCenterY = obstacle.blockY ?? ARENA_HEIGHT * 0.5;
  const blockHalfH = (obstacle.blockH ?? 90) / 2;
  return Math.abs(bodyBox.cy - blockCenterY) <= bodyBox.ry + blockHalfH;
}

/**
 * Spawns right-to-left wave of items:
 * - Single Mystery Box
 * - Single Trap
 * - Food formation: 1 item, OR horizontal line (2-3), OR diagonal line (2-3) — strictly max 3 foods!
 */
export function spawnSection2Wave(
  nextIdStart: number,
  levelNumber: number,
  arenaWidth: number = ARENA_WIDTH,
  wallInset: number = 0,
  rng: () => number = Math.random,
): { items: FlyerItem[]; nextId: number } {
  const cfg = getSection2LevelConfig(levelNumber);
  const roll = rng();

  const minLaneY = FLYER_TOP_MARGIN + wallInset + 48;
  const maxLaneY = ARENA_HEIGHT - FLYER_BOTTOM_MARGIN - wallInset - 48;
  const safeSpan = Math.max(80, maxLaneY - minLaneY);
  const startX = arenaWidth + 68;

  if (roll < cfg.mysteryBoxProbability) {
    const outcome = pickMysteryOutcome(rng);
    const baseY = minLaneY + rng() * safeSpan;
    return {
      nextId: nextIdStart + 1,
      items: [
        {
          id: nextIdStart,
          kind: 'mystery',
          spriteKey: outcome.spriteKey,
          label: 'Mistery Box',
          points: outcome.points,
          mysteryOutcome: outcome,
          x: startX,
          y: baseY,
          baseY,
          size: ITEM_SIZE_MYSTERY,
          speedScale: 1.0,
          bobAmp: 12,
          bobFreq: 2.8,
          bobPhase: rng() * Math.PI * 2,
          rotation: 0,
          resolved: false,
        },
      ],
    };
  }

  if (roll < cfg.mysteryBoxProbability + cfg.trapProbability) {
    const trapId = pickRandomTrap(rng);
    const meta = TRAP_SPRITES[trapId];
    const baseY = minLaneY + rng() * safeSpan;
    return {
      nextId: nextIdStart + 1,
      items: [
        {
          id: nextIdStart,
          kind: 'trap',
          spriteKey: trapId,
          label: meta.label,
          points: -TRAP_SCORE_PENALTY,
          x: startX,
          y: baseY,
          baseY,
          size: ITEM_SIZE_TRAP,
          speedScale: 1.04,
          bobAmp: 7,
          bobFreq: 2.2,
          bobPhase: rng() * Math.PI * 2,
          rotation: (rng() - 0.5) * 0.25,
          resolved: false,
        },
      ],
    };
  }

  // Food wave: single (1), horizontal line (2-3), or diagonal line (2-3) — strictly max 3!
  const formationRoll = rng();
  const count = formationRoll < 0.36 ? 1 : formationRoll < 0.68 ? 2 : 3;
  const isDiagonal = count > 1 && rng() < 0.5;
  const diagSign = rng() < 0.5 ? 1 : -1;
  const diagStepY = isDiagonal ? diagSign * 48 : 0;
  const spacingX = 76;

  // Keep entire diagonal line strictly inside playable Y bounds
  const totalDy = diagStepY * (count - 1);
  const lowOffset = Math.min(0, totalDy);
  const highOffset = Math.max(0, totalDy);
  const usableMinY = minLaneY - lowOffset;
  const usableMaxY = Math.max(usableMinY, maxLaneY - highOffset);
  const anchorY = usableMinY + rng() * Math.max(10, usableMaxY - usableMinY);

  const items: FlyerItem[] = [];
  let idCursor = nextIdStart;
  for (let i = 0; i < count; i++) {
    const foodId = pickWeightedFood(rng);
    const meta = FOOD_SPRITES[foodId];
    const itemY = Math.max(minLaneY, Math.min(maxLaneY, anchorY + i * diagStepY));
    items.push({
      id: idCursor++,
      kind: 'food',
      spriteKey: foodId,
      label: meta.label,
      points: meta.points,
      x: startX + i * spacingX,
      y: itemY,
      baseY: itemY,
      size: ITEM_SIZE_FOOD,
      speedScale: 1.0,
      bobAmp: isDiagonal ? 4 : 6,
      bobFreq: 2.4,
      bobPhase: i * 0.6,
      rotation: 0,
      resolved: false,
    });
  }

  return { items, nextId: idCursor };
}

export function spawnTunnelObstacle(
  id: number,
  levelNumber: number,
  arenaWidth: number = ARENA_WIDTH,
  wallInset: number = TUNNEL_WALL_MAX_INSET,
  rng: () => number = Math.random,
  forcedKind?: TunnelObstacleKind,
): TunnelObstacle {
  const cfg = getSection2LevelConfig(levelNumber);
  const playTop = FLYER_TOP_MARGIN + wallInset * 0.72;
  const playBottom = ARENA_HEIGHT - FLYER_BOTTOM_MARGIN - wallInset * 0.72;
  const playHeight = Math.max(260, playBottom - playTop);
  const gap = Math.min(playHeight - 84, cfg.obstacleGapHeight);

  const kindRoll = rng();
  const kind: TunnelObstacleKind =
    forcedKind ??
    (kindRoll < 0.12
      ? 'stalactite'
      : kindRoll < 0.24
        ? 'stalagmite'
        : kindRoll < 0.39
          ? 'spinningGear'
          : kindRoll < 0.55
            ? 'narrowCorridor'
            : kindRoll < 0.70
              ? 'movingIronPlate'
              : kindRoll < 0.86
                ? 'doubleGap'
                : 'floatingBlock');

  const spawnX = arenaWidth + 140;

  if (kind === 'stalactite') {
    const maxLen = Math.max(100, playBottom - gap - playTop);
    const topBottomY = playTop + Math.min(maxLen, 115 + rng() * 145);
    return {
      id,
      kind,
      x: spawnX,
      width: 76,
      topBottomY,
      bottomTopY: ARENA_HEIGHT,
      hit: false,
      passed: false,
    };
  }

  if (kind === 'stalagmite') {
    const minTop = playTop + gap;
    const bottomTopY = Math.max(minTop, playBottom - (115 + rng() * 145));
    return {
      id,
      kind,
      x: spawnX,
      width: 76,
      topBottomY: 0,
      bottomTopY,
      hit: false,
      passed: false,
    };
  }

  if (kind === 'narrowCorridor') {
    const width = Math.round(195 + rng() * 40);
    const corridorGap = Math.max(142, Math.min(playHeight - 96, Math.round(gap * 0.86)));
    const minGapTop = playTop + 36;
    const maxGapTop = Math.max(minGapTop, playBottom - corridorGap - 36);
    const gapTop = minGapTop + rng() * Math.max(10, maxGapTop - minGapTop);
    return {
      id,
      kind,
      x: spawnX + width * 0.25,
      width,
      topBottomY: gapTop,
      bottomTopY: gapTop + corridorGap,
      hit: false,
      passed: false,
    };
  }

  if (kind === 'doubleGap') {
    const holeH = Math.max(114, Math.min(136, Math.round(gap * 0.62)));
    const dividerH = Math.max(66, Math.min(88, Math.round(playHeight - holeH * 2 - 44)));
    const remaining = Math.max(32, playHeight - (holeH * 2 + dividerH));
    const topPad = 14 + rng() * Math.max(8, remaining - 28);
    const gap1Top = playTop + topPad;
    const gap1Bottom = gap1Top + holeH;
    const gap2Top = gap1Bottom + dividerH;
    const gap2Bottom = Math.min(playBottom - 12, gap2Top + holeH);
    return {
      id,
      kind,
      x: spawnX,
      width: 82,
      topBottomY: gap1Top,
      bottomTopY: gap2Bottom,
      gap1Top,
      gap1Bottom,
      gap2Top,
      gap2Bottom,
      hit: false,
      passed: false,
    };
  }

  if (kind === 'spinningGear') {
    const radius = Math.round(46 + rng() * 8); // 46..54px sawblade radius
    const mountTop = rng() < 0.5;
    const minCenter = playTop + radius + (mountTop ? 18 : 112);
    const maxCenter = Math.max(minCenter, playBottom - radius - (mountTop ? 112 : 18));
    const gearY = minCenter + rng() * Math.max(10, maxCenter - minCenter);
    const spinDir = rng() < 0.5 ? 1 : -1;
    const gearSpinSpeed = spinDir * (4.6 + (levelNumber - SECTION2_MIN_LEVEL) * 0.45 + rng() * 1.4);
    return {
      id,
      kind,
      x: spawnX,
      width: radius * 2,
      topBottomY: 0,
      bottomTopY: ARENA_HEIGHT,
      blockY: gearY,
      blockH: radius * 2,
      gearRadius: radius,
      gearAngle: rng() * Math.PI * 2,
      gearSpinSpeed,
      gearMountSide: mountTop ? 'top' : 'bottom',
      hit: false,
      passed: false,
    };
  }

  if (kind === 'movingIronPlate') {
    const plateH = Math.round(112 + rng() * 20); // 112..132px heavy moving iron door
    const plateW = 78;
    const plateBaseY = (playTop + playBottom) * 0.5;
    const maxSafeAmp = Math.max(54, (playBottom - playTop - plateH) * 0.5 - 12);
    const plateAmpY = Math.min(maxSafeAmp, 92 + rng() * 24);
    const plateSpeed = 2.25 + (levelNumber - SECTION2_MIN_LEVEL) * 0.25 + rng() * 0.65;
    const platePhase = rng() * Math.PI * 2;
    return {
      id,
      kind,
      x: spawnX,
      width: plateW,
      topBottomY: 0,
      bottomTopY: ARENA_HEIGHT,
      blockY: plateBaseY + Math.sin(platePhase) * plateAmpY,
      blockH: plateH,
      plateBaseY,
      plateAmpY,
      plateSpeed,
      platePhase,
      plateVelY: Math.cos(platePhase) * plateAmpY * plateSpeed,
      hit: false,
      passed: false,
    };
  }

  // floatingBlock: textured floating stone hazard block leaving room above OR below
  const blockH = 92;
  const centerMin = playTop + blockH * 0.5 + 95;
  const centerMax = Math.max(centerMin, playBottom - blockH * 0.5 - 95);
  const blockY = centerMin + rng() * Math.max(10, centerMax - centerMin);
  return {
    id,
    kind,
    x: spawnX,
    width: 86,
    topBottomY: 0,
    bottomTopY: ARENA_HEIGHT,
    blockY,
    blockH,
    hit: false,
    passed: false,
  };
}

export function applySection2FoodMistake(currentChances: number): {
  remainingFoodChances: number;
  isLastChance: boolean;
  isGameOver: boolean;
} {
  const next = Math.max(0, currentChances - 1);
  return {
    remainingFoodChances: next,
    isLastChance: next === 1,
    isGameOver: next <= 0,
  };
}

export function applySection2ObstacleCrash(currentCrashChances: number): {
  remainingCrashChances: number;
  isLastChance: boolean;
  isGameOver: boolean;
} {
  const next = Math.max(0, currentCrashChances - 1);
  return {
    remainingCrashChances: next,
    isLastChance: next === 1,
    isGameOver: next <= 0,
  };
}

export function loadSection2HighScore(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(SECTION2_HIGHSCORE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  } catch {
    return 0;
  }
}

export function saveSection2HighScore(score: number): number {
  const clean = Math.max(0, Math.round(score));
  const prev = loadSection2HighScore();
  const nextBest = Math.max(prev, clean);
  if (typeof window !== 'undefined' && nextBest > prev) {
    try {
      window.localStorage.setItem(SECTION2_HIGHSCORE_KEY, String(nextBest));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }
  return nextBest;
}
