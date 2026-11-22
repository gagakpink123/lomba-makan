import React, { useEffect, useRef } from 'react';
import {
  preloadAllSprites,
  type LoadedSpriteMap,
} from '../game/assets';
import { audioManager } from '../game/audio';
import {
  drawMysteryBox,
  drawMysteryReveals,
  fitSpriteContain,
  stepMysteryReveals,
  type MysteryReveal,
} from '../game/canvasHelpers';
import { getSection2LevelConfig, SECTION2_MIN_LEVEL } from '../game/levels';
import { ParticlePool } from '../game/particles';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  TRAP_SCORE_PENALTY,
  WRONG_TUING_MAX_SCALE,
  applyFoodCatchScore,
  applyTrapPenalty,
  type GameScreenState,
} from '../game/rules';
import {
  drawSection2Background,
  drawTunnelScene,
} from '../game/section2Backgrounds';
import {
  FLYER_CRASH_INVULN_SEC,
  FLYER_EAT_DURATION_SEC,
  FLYER_HEIGHT,
  FLYER_MAX_CRASH_CHANCES,
  FLYER_MAX_FOOD_CHANCES,
  FLYER_TUING_DURATION_SEC,
  FLYER_WIDTH,
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
  getFlyerBodyBox,
  getFlyerHeadBox,
  loadSection2HighScore,
  resolveFlyerSprite,
  saveSection2HighScore,
  spawnSection2Wave,
  spawnTunnelObstacle,
  stepFlyerMovement,
  stepTunnelObstacleMotion,
  stepTunnelState,
  type FlyerItem,
  type FlyerPlayerState,
  type TunnelObstacle,
  type TunnelPhaseState,
  type TunnelStartMode,
} from '../game/section2Rules';
import type { Section2HudSnapshot } from './GameHud';

export interface Section2RunResult {
  score: number;
  highScore: number;
  isNewRecord: boolean;
  levelReached: number;
  foodsEaten: number;
  reason: 'mistakes' | 'crash';
}

interface Section2CanvasProps {
  screen: GameScreenState;
  runSeed: number;
  startLevel?: number;
  verticalAxisRef: React.MutableRefObject<{ up: boolean; down: boolean }>;
  onHudUpdate: (snapshot: Section2HudSnapshot) => void;
  onGameOver: (result: Section2RunResult) => void;
}

export function Section2Canvas({
  screen,
  runSeed,
  startLevel = SECTION2_MIN_LEVEL,
  verticalAxisRef,
  onHudUpdate,
  onGameOver,
}: Section2CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<LoadedSpriteMap | null>(null);
  const arenaWidthRef = useRef<number>(ARENA_WIDTH);

  const screenRef = useRef<GameScreenState>(screen);
  screenRef.current = screen;

  const startLevelRef = useRef<number>(getSection2LevelConfig(startLevel).level);
  startLevelRef.current = getSection2LevelConfig(startLevel).level;

  const callbacksRef = useRef({ onHudUpdate, onGameOver });
  callbacksRef.current = { onHudUpdate, onGameOver };

  const simRef = useRef<{
    player: FlyerPlayerState;
    items: FlyerItem[];
    obstacles: TunnelObstacle[];
    reveals: MysteryReveal[];
    tunnel: TunnelPhaseState;
    nextId: number;
    itemSpawnTimer: number;
    obstacleSpawnTimer: number;
    level: number;
    score: number;
    highScore: number;
    initialHighScore: number;
    foodsEaten: number;
    foodChances: number;
    crashChances: number;
    gameOverCause: 'mistakes' | 'crash';
    hitstopTimer: number;
    shakeTrauma: number;
    bannerTimer: number;
    scrollDist: number;
    worldTime: number;
    particles: ParticlePool;
    draggingPointerId: number | null;
    lastPublishedHudKey: string;
  }>({
    player: createInitialFlyerState(ARENA_WIDTH),
    items: [],
    obstacles: [],
    reveals: [],
    tunnel: createTunnelState(),
    nextId: 1,
    itemSpawnTimer: 0.45,
    obstacleSpawnTimer: 1.1,
    level: SECTION2_MIN_LEVEL,
    score: 0,
    highScore: loadSection2HighScore(),
    initialHighScore: loadSection2HighScore(),
    foodsEaten: 0,
    foodChances: FLYER_MAX_FOOD_CHANCES,
    crashChances: FLYER_MAX_CRASH_CHANCES,
    gameOverCause: 'mistakes',
    hitstopTimer: 0,
    shakeTrauma: 0,
    bannerTimer: 0,
    scrollDist: 0,
    worldTime: 0,
    particles: new ParticlePool(),
    draggingPointerId: null,
    lastPublishedHudKey: '',
  });

  // Sync dynamic arenaWidth to canvas aspect ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const syncArenaWidth = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const computed = Math.round(ARENA_HEIGHT * (rect.width / rect.height));
        arenaWidthRef.current = Math.max(420, Math.min(1600, computed));
        simRef.current.player.y = clampFlyerY(
          simRef.current.player.y,
          simRef.current.tunnel.wallInset,
        );
      }
    };
    syncArenaWidth();
    const ro = new ResizeObserver(syncArenaWidth);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Reset Section 2 simulation on new run
  useEffect(() => {
    if (runSeed === 0) return;
    const s = simRef.current;
    const w = arenaWidthRef.current;
    const initialLvl = startLevelRef.current;
    const storedBest = loadSection2HighScore();
    const tunnelParam =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tunnel')
        : null;
    const tunnelMode: TunnelStartMode =
      tunnelParam === '1'
        ? 'inside'
        : tunnelParam === 'portal'
          ? 'portal'
          : tunnelParam === 'exit'
            ? 'exit'
            : 'sky';

    s.player = createInitialFlyerState(w);
    s.items = [];
    s.obstacles = [];
    s.reveals = [];
    s.tunnel = createTunnelState(tunnelMode, w);
    s.nextId = 1;
    s.itemSpawnTimer = 0.45;
    s.obstacleSpawnTimer = tunnelMode === 'inside' ? 0.45 : 0.9;
    s.level = initialLvl;
    s.score = 0;
    s.highScore = storedBest;
    s.initialHighScore = storedBest;
    s.foodsEaten = 0;
    s.foodChances = FLYER_MAX_FOOD_CHANCES;
    s.crashChances = FLYER_MAX_CRASH_CHANCES;
    s.gameOverCause = 'mistakes';
    s.hitstopTimer = 0;
    s.shakeTrauma = 0;
    s.bannerTimer = 0;
    s.scrollDist = 0;
    s.particles.clear();
    s.draggingPointerId = null;
    s.lastPublishedHudKey = '';

    if (tunnelMode === 'portal') {
      const sampleObs = spawnTunnelObstacle(
        s.nextId++,
        initialLvl,
        w,
        TUNNEL_WALL_MAX_INSET,
        () => 0.72,
        'doubleGap',
      );
      sampleObs.x = Math.round(w * 0.85);
      s.obstacles.push(sampleObs);
    } else if (tunnelMode === 'inside') {
      const obs1 = spawnTunnelObstacle(
        s.nextId++,
        initialLvl,
        w,
        TUNNEL_WALL_MAX_INSET,
        () => 0.52,
        'spinningGear',
      );
      obs1.x = Math.round(w * 0.52);
      const obs2 = spawnTunnelObstacle(
        s.nextId++,
        initialLvl,
        w,
        TUNNEL_WALL_MAX_INSET,
        () => 0.48,
        'movingIronPlate',
      );
      obs2.x = Math.round(w * 0.82);
      const obs3 = spawnTunnelObstacle(
        s.nextId++,
        initialLvl,
        w,
        TUNNEL_WALL_MAX_INSET,
        () => 0.72,
        'doubleGap',
      );
      obs3.x = Math.round(w * 1.15);
      s.obstacles.push(obs1, obs2, obs3);
    }

    callbacksRef.current.onHudUpdate({
      level: initialLvl,
      score: 0,
      highScore: storedBest,
      foodChances: FLYER_MAX_FOOD_CHANCES,
      crashChances: FLYER_MAX_CRASH_CHANCES,
      inTunnel: s.tunnel.inTunnel,
      tunnelWarning: s.tunnel.warningActive,
      levelTransitionBanner: false,
    });
  }, [runSeed]);

  // Unified 60fps Endless Flyer loop
  useEffect(() => {
    let mounted = true;
    let rafId = 0;
    let lastDrawnState: string | null = null;
    let lastSpritesLoaded = false;

    preloadAllSprites()
      .then((loaded) => {
        if (mounted) spritesRef.current = loaded;
      })
      .catch((err) => {
        console.error('Gagal memuat sprite Bagian 2:', err);
      });

    let prevTs = performance.now();

    const loop = (now: number) => {
      if (!mounted) return;
      const rawDt = (now - prevTs) / 1000;
      prevTs = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      const s = simRef.current;
      const arenaWidth = arenaWidthRef.current;
      const currentScreen = screenRef.current;
      const isFrozenState = currentScreen === 'paused' || currentScreen === 'gameover';
      const spritesNowLoaded = spritesRef.current !== null;

      if (currentScreen === 'title') {
        s.worldTime += dt;
        s.scrollDist += 115 * dt;
      } else if (currentScreen === 'playing') {
        s.worldTime += dt;
        s.shakeTrauma = Math.max(0, s.shakeTrauma - dt * 2.4);
        s.particles.update(dt);

        s.reveals = stepMysteryReveals(s.reveals, dt, 48);

        if (s.bannerTimer > 0) {
          s.bannerTimer = Math.max(0, s.bannerTimer - dt);
        }

        if (s.hitstopTimer > 0) {
          s.hitstopTimer = Math.max(0, s.hitstopTimer - dt);
        } else {
          // 1. Dynamic speed & level progression based on score
          const speedInfo = computeSection2ScrollSpeed(startLevelRef.current, s.score);
          if (speedInfo.currentLevel > s.level) {
            s.level = speedInfo.currentLevel;
            s.bannerTimer = 1.9;
            audioManager.playSfx('sfxLevelUp', 0);
            if (!s.tunnel.inTunnel) {
              void audioManager.playLevelBgm(s.level);
            }
            s.particles.spawnConfettiBurst(arenaWidth, 24);
          }
          const scrollSpeed = speedInfo.scrollSpeed;
          s.scrollDist += scrollSpeed * dt;

          // 2. Dark Tunnel ("Lorong Gelap") real horizontal portal cycle & audio switch
          const tunnelEvents = stepTunnelState(
            s.tunnel,
            dt,
            scrollSpeed,
            s.player.x,
            arenaWidth,
          );
          if (tunnelEvents.enteredTunnel) {
            s.obstacleSpawnTimer = Math.min(s.obstacleSpawnTimer, 0.55);
            audioManager.startTunnelSuspenseBgm();
          } else if (tunnelEvents.exitedTunnel) {
            void audioManager.stopTunnelSuspenseBgm();
          }

          // 3. Player vertical movement + billowing cape animation
          const vAxis =
            (verticalAxisRef.current.down ? 1 : 0) -
            (verticalAxisRef.current.up ? 1 : 0);
          stepFlyerMovement(s.player, dt, vAxis, arenaWidth, s.tunnel.wallInset);

          // 4. Spawn items (foods max 3 horizontal/diagonal, traps, mystery boxes) cleanly clear of walls/portals
          const cfg = getSection2LevelConfig(s.level);
          const densityFactor = 1 + (Math.max(ARENA_WIDTH, arenaWidth) / ARENA_WIDTH - 1) * 0.35;
          let rightmostItemX = -Infinity;
          for (const it of s.items) {
            if (!it.resolved && it.x > rightmostItemX) {
              rightmostItemX = it.x;
            }
          }
          let nearRightObstacle = false;
          let rightmostObsEdge = -Infinity;
          for (const obs of s.obstacles) {
            const rightEdge = obs.x + obs.width / 2;
            if (rightEdge > rightmostObsEdge) rightmostObsEdge = rightEdge;
            if (rightEdge > arenaWidth - 115) {
              nearRightObstacle = true;
            }
          }
          const nearPortalArch =
            s.tunnel.active &&
            (Math.abs(s.tunnel.leftX - (arenaWidth + 68)) < 110 ||
              Math.abs(s.tunnel.rightX - (arenaWidth + 68)) < 110);
          const itemLaneInset =
            s.tunnel.active && s.tunnel.leftX <= arenaWidth + 140 && s.tunnel.rightX >= arenaWidth - 20
              ? TUNNEL_WALL_MAX_INSET
              : s.tunnel.wallInset;

          s.itemSpawnTimer -= dt;
          if (
            s.itemSpawnTimer <= 0 &&
            rightmostItemX < arenaWidth - 36 &&
            !nearRightObstacle &&
            !nearPortalArch
          ) {
            const wave = spawnSection2Wave(
              s.nextId,
              s.level,
              arenaWidth,
              itemLaneInset,
              Math.random,
            );
            s.nextId = wave.nextId;
            s.items.push(...wave.items);
            const rawInterval =
              cfg.spawnIntervalMin +
              Math.random() * (cfg.spawnIntervalMax - cfg.spawnIntervalMin);
            s.itemSpawnTimer = (rawInterval * (wave.items.length > 1 ? 1.25 : 1.0)) / densityFactor;
          }

          // 5. Spawn Lorong Gelap physical obstacles strictly inside tunnel span (clear of entrance/exit portals)
          const canSpawnTunnelObstacle =
            s.tunnel.active &&
            s.tunnel.leftX < arenaWidth - 200 &&
            s.tunnel.rightX > arenaWidth + 460;
          if (canSpawnTunnelObstacle) {
            s.obstacleSpawnTimer -= dt;
            if (s.obstacleSpawnTimer <= 0 && rightmostObsEdge < arenaWidth - 150) {
              const obs = spawnTunnelObstacle(
                s.nextId++,
                s.level,
                arenaWidth,
                TUNNEL_WALL_MAX_INSET,
                Math.random,
              );
              s.obstacles.push(obs);
              const extraGap = obs.kind === 'narrowCorridor' ? 0.52 : 0;
              s.obstacleSpawnTimer =
                Math.max(1.25, 2.05 - (s.level - SECTION2_MIN_LEVEL) * 0.15) + extraGap;
            }
          }

          // 6. Scroll items & check head collisions
          const headBox = getFlyerHeadBox(s.player.x, s.player.y);
          for (const item of s.items) {
            if (item.resolved) continue;
            item.x -= scrollSpeed * item.speedScale * dt;
            item.y =
              item.baseY +
              Math.sin(s.worldTime * item.bobFreq + item.bobPhase) * item.bobAmp;
            if (item.kind === 'trap' || item.kind === 'mystery') {
              item.rotation = Math.sin(s.worldTime * 3 + item.bobPhase) * 0.14;
            }

            if (checkFlyerItemCollision(headBox, item)) {
              item.resolved = true;
              const isMystery = item.kind === 'mystery' && item.mysteryOutcome;
              const resolvedKind = isMystery ? item.mysteryOutcome!.kind : item.kind;
              const resolvedPoints = isMystery ? item.mysteryOutcome!.points : item.points;
              const popupX = Math.max(96, Math.min(arenaWidth - 96, headBox.cx + 12));

              if (isMystery) {
                audioManager.playMysteryChime(resolvedKind === 'food');
                s.reveals.push({
                  x: Math.max(72, Math.min(arenaWidth - 72, item.x)),
                  y: headBox.cy - 44,
                  spriteKey: item.mysteryOutcome!.spriteKey,
                  label: item.mysteryOutcome!.label,
                  isFood: resolvedKind === 'food',
                  life: 0,
                  maxLife: 1.1,
                });
              }

              if (resolvedKind === 'food') {
                const updated = applyFoodCatchScore(s.score, 0, resolvedPoints);
                s.score = updated.totalScore;
                s.foodsEaten += 1;
                if (s.score > s.highScore) {
                  s.highScore = saveSection2HighScore(s.score);
                }
                s.player.expression = 'makan';
                s.player.expressionTimer = FLYER_EAT_DURATION_SEC;

                audioManager.playSfx('sfxFoodCatch', 50);
                s.particles.spawnFoodBurst(headBox.cx, headBox.cy, isMystery ? 16 : 10);
                s.particles.spawnPopup(
                  isMystery ? `+${resolvedPoints} BONUS!` : `+${resolvedPoints}`,
                  popupX,
                  headBox.cy - 34,
                  isMystery ? '#FACC15' : '#15803D',
                );
              } else {
                // Non-food trap OR Zonk Mystery Box -> Salah Makan + 3x Tuing + lose 1 food chance
                const penaltyRes = applyTrapPenalty(s.score, 0, TRAP_SCORE_PENALTY);
                s.score = penaltyRes.totalScore;
                const mistakeInfo = applySection2FoodMistake(s.foodChances);
                s.foodChances = mistakeInfo.remainingFoodChances;

                s.player.expression = 'salahMakan';
                s.player.expressionTimer = FLYER_TUING_DURATION_SEC;
                s.hitstopTimer = 0.055;
                s.shakeTrauma = 0.9;

                s.particles.spawnTrapBurst(headBox.cx, headBox.cy, 16);
                s.particles.spawnPopup(
                  isMystery ? `ZONK! -${penaltyRes.appliedPenalty}` : `-${penaltyRes.appliedPenalty} TUING!!`,
                  popupX,
                  headBox.cy - 48,
                  '#E11D48',
                );

                if (mistakeInfo.isGameOver) {
                  s.gameOverCause = 'mistakes';
                  const savedBest = saveSection2HighScore(s.score);
                  s.highScore = savedBest;
                  audioManager.stopBgm(s.tunnel.inTunnel);
                  audioManager.playSfx('sfxWrongFood', 0);
                  audioManager.playTuingSfx(0.03);
                  audioManager.playSfx('sfxGameOver', 0);
                  publishSection2HudIfNeeded(s, callbacksRef.current.onHudUpdate);
                  callbacksRef.current.onGameOver({
                    score: s.score,
                    highScore: savedBest,
                    isNewRecord: s.score > s.initialHighScore && s.score > 0,
                    levelReached: s.level,
                    foodsEaten: s.foodsEaten,
                    reason: 'mistakes',
                  });
                  break;
                } else {
                  audioManager.playSfx('sfxWrongFood', 60);
                  audioManager.playTuingSfx(0.03);
                  if (mistakeInfo.isLastChance) {
                    audioManager.playSfx('sfxLastChance', 100);
                  }
                }
              }
            } else if (item.x < -item.size - 40) {
              item.resolved = true;
            }
          }

          // 7. Scroll obstacles, animate spinning gears / looping plates & check body collision (skipped during 1.5s blink invulnerability)
          if (screenRef.current === 'playing') {
            const bodyBox = getFlyerBodyBox(s.player.x, s.player.y);
            for (const obs of s.obstacles) {
              obs.x -= scrollSpeed * dt;
              stepTunnelObstacleMotion(obs, dt, s.worldTime);
              if (
                s.player.invulnTimer <= 0 &&
                checkFlyerObstacleCollision(bodyBox, obs)
              ) {
                obs.hit = true;
                const crashInfo = applySection2ObstacleCrash(s.crashChances);
                s.crashChances = crashInfo.remainingCrashChances;
                s.player.expression = 'nabrak';
                s.player.expressionTimer = FLYER_TUING_DURATION_SEC;
                s.player.invulnTimer = FLYER_CRASH_INVULN_SEC;
                s.hitstopTimer = 0.06;
                s.shakeTrauma = 1.0;

                audioManager.playCrashSfx();
                s.particles.spawnTrapBurst(bodyBox.cx + 16, bodyBox.cy, 20);
                s.particles.spawnPopup(
                  'NABRAK!!',
                  Math.max(96, bodyBox.cx + 28),
                  bodyBox.cy - 44,
                  '#F97316',
                );

                if (crashInfo.isGameOver) {
                  s.gameOverCause = 'crash';
                  const savedBest = saveSection2HighScore(s.score);
                  s.highScore = savedBest;
                  audioManager.stopBgm(s.tunnel.inTunnel);
                  audioManager.playSfx('sfxGameOver', 0);
                  publishSection2HudIfNeeded(s, callbacksRef.current.onHudUpdate);
                  callbacksRef.current.onGameOver({
                    score: s.score,
                    highScore: savedBest,
                    isNewRecord: s.score > s.initialHighScore && s.score > 0,
                    levelReached: s.level,
                    foodsEaten: s.foodsEaten,
                    reason: 'crash',
                  });
                  break;
                } else if (crashInfo.isLastChance) {
                  audioManager.playSfx('sfxLastChance', 100);
                }
              } else if (obs.x < -obs.width - 50) {
                obs.passed = true;
              }
            }
          }

          // Cull resolved items & passed obstacles
          if (s.items.length > 36) {
            s.items = s.items.filter((i) => !i.resolved);
          }
          if (s.obstacles.length > 12) {
            s.obstacles = s.obstacles.filter((o) => !o.passed);
          }
        }

        if (screenRef.current === 'playing') {
          publishSection2HudIfNeeded(s, callbacksRef.current.onHudUpdate);
        }
      }

      const renderLevel = currentScreen === 'title' ? startLevelRef.current : s.level;
      const stateKey = `${currentScreen}:${renderLevel}:${s.score}:${s.foodChances}:${s.crashChances}:${arenaWidth}`;
      const shouldRedraw =
        !isFrozenState ||
        lastDrawnState !== stateKey ||
        lastSpritesLoaded !== spritesNowLoaded;

      const canvas = canvasRef.current;
      if (canvas && shouldRedraw) {
        lastDrawnState = stateKey;
        lastSpritesLoaded = spritesNowLoaded;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.round(arenaWidth * dpr);
        const targetH = Math.round(ARENA_HEIGHT * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);

          if (s.shakeTrauma > 0.01 && currentScreen === 'playing') {
            const mag = s.shakeTrauma * s.shakeTrauma * 10;
            ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
          }

          // 1. Scrolling open sky + rolling hills parallax background
          drawSection2Background(
            ctx,
            renderLevel,
            arenaWidth,
            ARENA_HEIGHT,
            s.scrollDist,
            s.worldTime,
          );

          if (currentScreen !== 'title' && s.tunnel.active) {
            // 2. Unified single-clip Lorong Gelap scene (interior + spotlight + obstacles + rock walls + portals)
            drawTunnelScene(
              ctx,
              renderLevel,
              arenaWidth,
              ARENA_HEIGHT,
              s.scrollDist,
              s.worldTime,
              s.player.x,
              s.player.y,
              s.tunnel,
              s.obstacles,
            );
          }

          const sprites = spritesRef.current;
          if (sprites && currentScreen !== 'title') {
            // 4. Items (food, bare trap, Mystery Box)
            for (const item of s.items) {
              if (item.resolved) continue;
              if (item.kind === 'mystery') {
                drawMysteryBox(ctx, item.x, item.y, item.size, item.rotation, s.worldTime);
                continue;
              }
              const img = sprites[item.spriteKey];
              if (!img) continue;
              const { w: drawW, h: drawH } = fitSpriteContain(img, item.size);
              ctx.save();
              ctx.translate(item.x, item.y);
              ctx.rotate(item.rotation);
              ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
              ctx.restore();
            }

            // 5. Flying Superhero with 1.5s blink invulnerability + 3x Tuing on wrong-eat or crash
            const isDefeated = currentScreen === 'gameover';
            const spriteKey = resolveFlyerSprite(s.player, isDefeated, s.gameOverCause);
            const heroImg = sprites[spriteKey];
            const blinkHidden =
              !isDefeated &&
              s.player.invulnTimer > 0 &&
              Math.floor(s.player.invulnTimer * 16) % 2 === 1;

            if (heroImg && !blinkHidden) {
              const natAspect =
                heroImg.naturalHeight > 0
                  ? heroImg.naturalWidth / heroImg.naturalHeight
                  : FLYER_WIDTH / FLYER_HEIGHT;
              const baseH = FLYER_HEIGHT;
              const baseW = baseH * natAspect;
              const tuingScale = computeFlyerTuingScale(
                s.player.expression,
                s.player.expressionTimer,
                isDefeated,
              );

              let squashX = 1;
              let squashY = 1;
              if (s.player.expression === 'makan') {
                const eatT = Math.max(0, Math.min(1, s.player.expressionTimer / FLYER_EAT_DURATION_SEC));
                const bump = Math.sin(eatT * Math.PI) * 0.1;
                squashX = 1 + bump * 0.6;
                squashY = 1 - bump * 0.4;
              }

              const pullCenter =
                ((tuingScale - 1) / Math.max(1, WRONG_TUING_MAX_SCALE - 1)) * 0.35;
              const drawX = s.player.x + (arenaWidth * 0.42 - s.player.x) * pullCenter;
              const drawY = s.player.y;
              const tiltAngle = Math.max(-0.22, Math.min(0.22, s.player.vy * 0.00042));

              // Subtle speed lines behind cape
              ctx.save();
              ctx.strokeStyle =
                s.tunnel.darknessAlpha > 0.3
                  ? 'rgba(186, 230, 253, 0.55)'
                  : 'rgba(255, 255, 255, 0.65)';
              ctx.lineWidth = 2.5;
              ctx.lineCap = 'round';
              for (let l = 0; l < 3; l++) {
                const ly = drawY - 22 + l * 22 + Math.sin(s.worldTime * 8 + l) * 3;
                const lx = drawX - baseW * 0.55 - ((s.worldTime * 180 + l * 30) % 45);
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.lineTo(lx - 26, ly);
                ctx.stroke();
              }
              ctx.restore();

              ctx.save();
              ctx.translate(drawX, drawY);
              ctx.rotate(tiltAngle);
              const scaledW = baseW * tuingScale * squashX;
              const scaledH = baseH * tuingScale * squashY;
              ctx.drawImage(heroImg, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
              ctx.restore();
            }

            // 6. Revealed Mystery Box items
            drawMysteryReveals(ctx, s.reveals, sprites, s.worldTime, 60, false);
          }

          s.particles.draw(ctx);
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
    };
  }, [verticalAxisRef]);

  const toArenaY = (clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.height <= 0) return null;
    return ((clientY - rect.top) / rect.height) * ARENA_HEIGHT;
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="section2-canvas"
      className="w-full h-full block touch-none select-none"
      onPointerDown={(e) => {
        if (screenRef.current !== 'playing') return;
        void audioManager.unlock().then(() => {
          if (simRef.current.tunnel.inTunnel && !audioManager.isCaveAcousticsActive()) {
            audioManager.startTunnelSuspenseBgm();
          }
        });
        e.currentTarget.setPointerCapture(e.pointerId);
        simRef.current.draggingPointerId = e.pointerId;
        const wy = toArenaY(e.clientY);
        if (wy !== null) {
          simRef.current.player.targetY = clampFlyerY(wy, simRef.current.tunnel.wallInset);
        }
      }}
      onPointerMove={(e) => {
        if (screenRef.current !== 'playing') return;
        if (simRef.current.draggingPointerId !== e.pointerId && e.buttons === 0) return;
        const wy = toArenaY(e.clientY);
        if (wy !== null) {
          simRef.current.player.targetY = clampFlyerY(wy, simRef.current.tunnel.wallInset);
        }
      }}
      onPointerUp={(e) => {
        if (simRef.current.draggingPointerId === e.pointerId) {
          simRef.current.draggingPointerId = null;
          simRef.current.player.targetY = null;
        }
      }}
      onPointerCancel={(e) => {
        if (simRef.current.draggingPointerId === e.pointerId) {
          simRef.current.draggingPointerId = null;
          simRef.current.player.targetY = null;
        }
      }}
    />
  );
}

function publishSection2HudIfNeeded(
  s: {
    level: number;
    score: number;
    highScore: number;
    foodChances: number;
    crashChances: number;
    tunnel: TunnelPhaseState;
    bannerTimer: number;
    lastPublishedHudKey: string;
  },
  onHudUpdate: (snapshot: Section2HudSnapshot) => void,
): void {
  const banner = s.bannerTimer > 0;
  const key = `${s.level}|${s.score}|${s.highScore}|${s.foodChances}|${s.crashChances}|${s.tunnel.inTunnel ? 1 : 0}|${s.tunnel.warningActive ? 1 : 0}|${banner ? 1 : 0}`;
  if (key === s.lastPublishedHudKey) return;
  s.lastPublishedHudKey = key;
  onHudUpdate({
    level: s.level,
    score: s.score,
    highScore: s.highScore,
    foodChances: s.foodChances,
    crashChances: s.crashChances,
    inTunnel: s.tunnel.inTunnel,
    tunnelWarning: s.tunnel.warningActive,
    levelTransitionBanner: banner,
  });
}
