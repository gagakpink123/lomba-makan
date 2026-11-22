import React, { useEffect, useRef } from 'react';
import {
  preloadAllSprites,
  type LoadedSpriteMap,
} from '../game/assets';
import { audioManager } from '../game/audio';
import { drawLevelBackground } from '../game/backgrounds';
import {
  drawMysteryBox,
  drawMysteryReveals,
  fitSpriteContain,
  stepMysteryReveals,
  type MysteryReveal,
} from '../game/canvasHelpers';
import { getLevelConfig, LEVEL_DURATION_SECONDS } from '../game/levels';
import { ParticlePool } from '../game/particles';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  EAT_EXPRESSION_DURATION_SEC,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  SEBEL_EXPRESSION_DURATION_SEC,
  SUPERHERO_BANNER_TEXT,
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
  evaluateMistakes,
  getPlayerBodyBox,
  getPlayerHeadBox,
  getPlayerMouthBox,
  resolveCharacterSprite,
  shouldTriggerSuperhero,
  spawnFallingItem,
  stepPlayerMovement,
  stepSuperheroFlyby,
  type FallingItem,
  type GameScreenState,
  type PlayerState,
  type SuperheroFlyby,
} from '../game/rules';
import type { HudSnapshot } from './GameHud';

export interface RunResult {
  score: number;
  levelReached: number;
  foodsEaten: number;
  reason?: 'mistakes' | 'timeout';
}

interface GameCanvasProps {
  screen: GameScreenState;
  runSeed: number;
  startLevel?: number;
  inputAxisRef: React.MutableRefObject<{ left: boolean; right: boolean }>;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (result: RunResult) => void;
  onVictory: (result: RunResult) => void;
}

export function GameCanvas({
  screen,
  runSeed,
  startLevel = 1,
  inputAxisRef,
  onHudUpdate,
  onGameOver,
  onVictory,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<LoadedSpriteMap | null>(null);
  const arenaWidthRef = useRef<number>(ARENA_WIDTH);

  // Store latest React callbacks/props in refs so animation loop never tears down
  const screenRef = useRef<GameScreenState>(screen);
  screenRef.current = screen;

  const startLevelRef = useRef<number>(getLevelConfig(startLevel).level);
  startLevelRef.current = getLevelConfig(startLevel).level;

  const callbacksRef = useRef({ onHudUpdate, onGameOver, onVictory });
  callbacksRef.current = { onHudUpdate, onGameOver, onVictory };

  // Mutable simulation state (never causes React 60Hz re-render)
  const simRef = useRef<{
    player: PlayerState;
    items: FallingItem[];
    reveals: MysteryReveal[];
    superhero: SuperheroFlyby | null;
    superheroTriggeredThisLevel: boolean;
    nextItemId: number;
    spawnTimer: number;
    level: number;
    timeRemaining: number;
    lastCountdownSec: number;
    score: number;
    foodsEaten: number;
    levelFoodsEaten: number;
    levelScore: number;
    mistakes: number;
    hitstopTimer: number;
    shakeTrauma: number;
    bannerTimer: number;
    worldTime: number;
    particles: ParticlePool;
    draggingPointerId: number | null;
    lastPublishedHudKey: string;
  }>({
    player: createInitialPlayerState(ARENA_WIDTH),
    items: [],
    reveals: [],
    superhero: null,
    superheroTriggeredThisLevel: false,
    nextItemId: 1,
    spawnTimer: 0.4,
    level: 1,
    timeRemaining: LEVEL_DURATION_SECONDS,
    lastCountdownSec: LEVEL_DURATION_SECONDS,
    score: 0,
    foodsEaten: 0,
    levelFoodsEaten: 0,
    levelScore: 0,
    mistakes: 0,
    hitstopTimer: 0,
    shakeTrauma: 0,
    bannerTimer: 0,
    worldTime: 0,
    particles: new ParticlePool(),
    draggingPointerId: null,
    lastPublishedHudKey: '',
  });

  // Sync dynamic arenaWidth to canvas aspect ratio (9:16 on mobile, free responsive width on desktop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncArenaWidth = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const computed = Math.round(ARENA_HEIGHT * (rect.width / rect.height));
        arenaWidthRef.current = Math.max(420, Math.min(1600, computed));
        simRef.current.player.x = clampPlayerX(simRef.current.player.x, arenaWidthRef.current);
      }
    };

    syncArenaWidth();
    const ro = new ResizeObserver(syncArenaWidth);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Reset simulation when a new run starts
  useEffect(() => {
    if (runSeed === 0) return;
    const s = simRef.current;
    const w = arenaWidthRef.current;
    const initialLvl = startLevelRef.current;
    const lvlCfg = getLevelConfig(initialLvl);
    s.player = createInitialPlayerState(w);
    s.items = [];
    s.reveals = [];
    s.superhero = null;
    s.superheroTriggeredThisLevel = false;
    s.nextItemId = 1;
    s.spawnTimer = 0.45;
    s.level = initialLvl;
    s.timeRemaining = lvlCfg.durationSeconds;
    s.lastCountdownSec = lvlCfg.durationSeconds;
    s.score = 0;
    s.foodsEaten = 0;
    s.levelFoodsEaten = 0;
    s.levelScore = 0;
    s.mistakes = 0;
    s.hitstopTimer = 0;
    s.shakeTrauma = 0;
    s.bannerTimer = 0;
    s.particles.clear();
    s.draggingPointerId = null;
    s.lastPublishedHudKey = '';

    callbacksRef.current.onHudUpdate({
      level: initialLvl,
      timeRemaining: lvlCfg.durationSeconds,
      score: 0,
      foodsEaten: 0,
      levelFoodsEaten: 0,
      levelScore: 0,
      mistakes: 0,
      levelTransitionBanner: false,
    });
  }, [runSeed]);

  // Spawn celebratory confetti when entering victory state
  useEffect(() => {
    if (screen === 'victory') {
      simRef.current.particles.spawnConfettiBurst(arenaWidthRef.current, 48);
    }
  }, [screen]);

  // Preload sprites & run unified 60 FPS loop
  useEffect(() => {
    let mounted = true;
    let rafId = 0;
    let lastDrawnState: string | null = null;
    let lastSpritesLoaded = false;

    preloadAllSprites()
      .then((loaded) => {
        if (mounted) {
          spritesRef.current = loaded;
        }
      })
      .catch((err) => {
        console.error('Gagal memuat sprite permainan:', err);
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
      } else if (currentScreen === 'playing') {
        s.worldTime += dt;

        // Shake, particles, superhero flyby & mystery box reveals tick smoothly
        s.shakeTrauma = Math.max(0, s.shakeTrauma - dt * 2.4);
        s.particles.update(dt);
        if (s.superhero?.active) {
          stepSuperheroFlyby(s.superhero, dt);
          if (!s.superhero.active) {
            s.superhero = null;
          }
        }
        s.reveals = stepMysteryReveals(s.reveals, dt, 52);

        if (s.bannerTimer > 0) {
          s.bannerTimer = Math.max(0, s.bannerTimer - dt);
        }

        if (s.hitstopTimer > 0) {
          s.hitstopTimer = Math.max(0, s.hitstopTimer - dt);
        } else {
          // 1. Player horizontal movement
          const axis =
            (inputAxisRef.current.right ? 1 : 0) -
            (inputAxisRef.current.left ? 1 : 0);
          stepPlayerMovement(s.player, dt, axis, arenaWidth);

          // 2. Spawning (scaled gently on wider desktop arenas so flow remains lively)
          const cfg = getLevelConfig(s.level);
          const densityFactor = 1 + (Math.max(ARENA_WIDTH, arenaWidth) / ARENA_WIDTH - 1) * 0.45;
          const effectiveMaxActive = Math.round(cfg.maxActiveItems * densityFactor);
          s.spawnTimer -= dt;
          const activeCount = s.items.filter((i) => !i.resolved).length;
          if (s.spawnTimer <= 0 && activeCount < effectiveMaxActive) {
            const spawned = spawnFallingItem(s.nextItemId++, s.level, s.items, Math.random, arenaWidth);
            s.items.push(spawned);
            const rawInterval =
              cfg.spawnIntervalMin +
              Math.random() * (cfg.spawnIntervalMax - cfg.spawnIntervalMin);
            s.spawnTimer = rawInterval / densityFactor;
          }

          // 3. Falling items update & head/body/mouth collisions
          const headBox = getPlayerHeadBox(s.player.x, s.player.y);
          const bodyBox = getPlayerBodyBox(s.player.x, s.player.y);
          const mouth = getPlayerMouthBox(s.player.x, s.player.y);
          for (const item of s.items) {
            if (item.resolved) continue;

            item.y += item.speed * dt;
            item.rotation += item.rotationSpeed * dt;
            const swayOffset =
              Math.sin(s.worldTime * item.swayFreq + item.swayPhase) * item.swayAmp;
            const minX = item.size / 2 + 10;
            const maxX = Math.max(minX, arenaWidth - item.size / 2 - 10);
            item.x = Math.max(minX, Math.min(maxX, item.baseX + swayOffset));

            // Food uses head-only sensor (neck up). Hitting below the neck triggers 'sebel' without catching.
            if (item.kind === 'food') {
              if (checkHeadCollision(headBox, item)) {
                item.resolved = true;
                const updated = applyFoodCatchScore(s.score, s.levelScore, item.points);
                s.score = updated.totalScore;
                s.levelScore = updated.levelScore;
                s.foodsEaten += 1;
                s.levelFoodsEaten += 1;
                s.player.expression = 'makan';
                s.player.expressionTimer = EAT_EXPRESSION_DURATION_SEC;

                const clampedPopupX = Math.max(82, Math.min(arenaWidth - 82, headBox.cx));
                audioManager.playSfx('sfxFoodCatch', 50);
                s.particles.spawnFoodBurst(headBox.cx, headBox.cy + 10, 12);
                s.particles.spawnPopup(
                  `+${item.points}`,
                  clampedPopupX,
                  headBox.cy - 22,
                  '#15803D',
                );
              } else if (checkBodyBelowNeckCollision(bodyBox, item)) {
                item.missedByBody = true;
                if (s.player.expression !== 'salahMakan') {
                  s.player.expression = 'sebel';
                  s.player.expressionTimer = SEBEL_EXPRESSION_DURATION_SEC;
                }
                audioManager.playSebelPop();
                const clampedPopupX = Math.max(82, Math.min(arenaWidth - 82, bodyBox.cx));
                s.particles.spawnPopup(
                  'KESAL!',
                  clampedPopupX,
                  bodyBox.cy - 28,
                  '#EA580C',
                );
              } else if (item.y - item.size > ARENA_HEIGHT + 24) {
                item.resolved = true;
              }
              continue;
            }

            // Traps (non-food) & Mystery Boxes preserve previous mouth collision sensor
            if (checkMouthCollision(mouth, item)) {
              item.resolved = true;

              const isMystery = item.kind === 'mystery' && item.mysteryOutcome;
              const resolvedKind = isMystery ? item.mysteryOutcome!.kind : item.kind;
              const resolvedPoints = isMystery ? item.mysteryOutcome!.points : item.points;

              const clampedPopupX = Math.max(82, Math.min(arenaWidth - 82, mouth.cx));

              if (isMystery) {
                audioManager.playMysteryChime(resolvedKind === 'food');
                s.reveals.push({
                  x: Math.max(66, Math.min(arenaWidth - 66, item.x)),
                  y: mouth.cy - 44,
                  spriteKey: item.mysteryOutcome!.spriteKey,
                  label: item.mysteryOutcome!.label,
                  isFood: resolvedKind === 'food',
                  life: 0,
                  maxLife: 1.15,
                });
              }

              if (resolvedKind === 'food') {
                const updated = applyFoodCatchScore(s.score, s.levelScore, resolvedPoints);
                s.score = updated.totalScore;
                s.levelScore = updated.levelScore;
                s.foodsEaten += 1;
                s.levelFoodsEaten += 1;
                s.player.expression = 'makan';
                s.player.expressionTimer = EAT_EXPRESSION_DURATION_SEC;

                audioManager.playSfx('sfxFoodCatch', 50);
                s.particles.spawnFoodBurst(mouth.cx, mouth.cy - 6, isMystery ? 18 : 12);
                s.particles.spawnPopup(
                  isMystery ? `+${resolvedPoints} BONUS!` : `+${resolvedPoints}`,
                  clampedPopupX,
                  isMystery ? mouth.cy - 98 : mouth.cy - 34,
                  isMystery ? '#D97706' : '#15803D',
                );
              } else {
                const penaltyRes = applyTrapPenalty(s.score, s.levelScore, TRAP_SCORE_PENALTY);
                s.score = penaltyRes.totalScore;
                s.levelScore = penaltyRes.levelScore;
                s.mistakes += 1;
                const mistakeInfo = evaluateMistakes(s.mistakes);
                if (isMystery && mistakeInfo.isGameOver && s.reveals.length > 0) {
                  s.reveals[s.reveals.length - 1].life = 0.22;
                }
                s.player.expression = 'salahMakan';
                s.player.expressionTimer = WRONG_EXPRESSION_DURATION_SEC;
                s.hitstopTimer = 0.055;
                s.shakeTrauma = 0.92;

                s.particles.spawnTrapBurst(mouth.cx, mouth.cy - 4, 16);
                s.particles.spawnPopup(
                  isMystery
                    ? `ZONK! -${penaltyRes.appliedPenalty}`
                    : `-${penaltyRes.appliedPenalty} TUING!!`,
                  clampedPopupX,
                  isMystery ? mouth.cy - 98 : mouth.cy - 48,
                  '#E11D48',
                );

                if (mistakeInfo.isGameOver) {
                  audioManager.stopBgm();
                  audioManager.playSfx('sfxWrongFood', 0);
                  audioManager.playSfx('sfxGameOver', 0);
                  publishHudIfNeeded(s, callbacksRef.current.onHudUpdate);
                  callbacksRef.current.onGameOver({
                    score: s.score,
                    levelReached: s.level,
                    foodsEaten: s.foodsEaten,
                    reason: 'mistakes',
                  });
                  break;
                } else {
                  audioManager.playSfx('sfxWrongFood', 60);
                  if (mistakeInfo.isLastChance) {
                    audioManager.playSfx('sfxLastChance', 100);
                  }
                }
              }
            } else if (item.y - item.size > ARENA_HEIGHT + 24) {
              item.resolved = true;
            }
          }

          // Trigger flying superhero once per level when <= 3 foods remain and timer still running
          if (
            screenRef.current === 'playing' &&
            shouldTriggerSuperhero(
              s.level,
              s.levelFoodsEaten,
              s.timeRemaining,
              s.superheroTriggeredThisLevel,
            )
          ) {
            s.superheroTriggeredThisLevel = true;
            s.superhero = createSuperheroFlyby(arenaWidth);
            audioManager.playPlaneFlyby();
          }

          // Cull resolved objects so array stays lean
          if (s.items.length > 36) {
            s.items = s.items.filter((i) => !i.resolved);
          }

          // 4. Countdown & Level Target Progression
          if (screenRef.current === 'playing') {
            const prog = advanceLevelProgression(
              s.level,
              s.timeRemaining,
              dt,
              s.levelFoodsEaten,
              s.levelScore,
            );
            s.timeRemaining = prog.nextTimeRemaining;

            const ceilSec = Math.max(0, Math.ceil(s.timeRemaining));
            if (ceilSec <= 10 && ceilSec >= 1 && ceilSec !== s.lastCountdownSec) {
              s.lastCountdownSec = ceilSec;
              audioManager.playSfx('sfxCountdown', 200);
            }

            if (prog.timedOut) {
              audioManager.stopBgm();
              audioManager.playSfx('sfxGameOver', 0);
              publishHudIfNeeded(s, callbacksRef.current.onHudUpdate);
              callbacksRef.current.onGameOver({
                score: s.score,
                levelReached: s.level,
                foodsEaten: s.foodsEaten,
                reason: 'timeout',
              });
            } else if (prog.wonGame) {
              audioManager.stopBgm();
              audioManager.playSfx('sfxVictory', 0);
              publishHudIfNeeded(s, callbacksRef.current.onHudUpdate);
              callbacksRef.current.onVictory({
                score: s.score,
                levelReached: s.level,
                foodsEaten: s.foodsEaten,
              });
            } else if (prog.leveledUp) {
              s.level = prog.nextLevel;
              s.mistakes = 0; // Reset 3x mistake chances on each new level
              s.levelFoodsEaten = 0;
              s.levelScore = 0;
              s.superhero = null;
              s.superheroTriggeredThisLevel = false;
              s.lastCountdownSec = LEVEL_DURATION_SECONDS;
              s.bannerTimer = 1.9;
              s.items = [];
              audioManager.playSfx('sfxLevelUp', 0);
              void audioManager.playLevelBgm(s.level);
              s.particles.spawnConfettiBurst(arenaWidth, 28);
            }
          }
        }

        publishHudIfNeeded(s, callbacksRef.current.onHudUpdate);
      } else if (currentScreen === 'victory') {
        s.worldTime += dt;
        s.particles.update(dt);
        if (Math.random() < dt * 2.5) {
          s.particles.spawnConfettiBurst(arenaWidth, 6);
        }
      }

      const renderLevel = currentScreen === 'title' ? startLevelRef.current : s.level;
      const stateKey = `${currentScreen}:${renderLevel}:${s.score}:${s.mistakes}:${arenaWidth}`;
      const shouldRedraw =
        !isFrozenState ||
        lastDrawnState !== stateKey ||
        lastSpritesLoaded !== spritesNowLoaded;

      // Render frame
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

          // Camera shake on trap collision
          if (s.shakeTrauma > 0.01 && currentScreen === 'playing') {
            const mag = s.shakeTrauma * s.shakeTrauma * 9;
            ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
          }

          drawLevelBackground(ctx, renderLevel, arenaWidth, ARENA_HEIGHT, s.worldTime);

          const sprites = spritesRef.current;
          if (sprites) {
            if (currentScreen === 'title') {
              // Gentle decorative kawaii food stickers drifting across title backdrop
              const previewFoods: Array<{ key: 'ikan' | 'jeruk' | 'brokoli' | 'alpukat'; ratioX: number; phase: number }> = [
                { key: 'ikan', ratioX: 0.13, phase: 0.4 },
                { key: 'jeruk', ratioX: 0.87, phase: 2.1 },
                { key: 'brokoli', ratioX: 0.24, phase: 3.7 },
                { key: 'alpukat', ratioX: 0.76, phase: 5.0 },
              ];
              for (const pf of previewFoods) {
                const py = ((s.worldTime * 44 + pf.phase * 130) % (ARENA_HEIGHT - 160)) + 40;
                const img = sprites[pf.key];
                if (!img) continue;
                const { w: pw, h: ph } = fitSpriteContain(img, 54);
                ctx.save();
                ctx.globalAlpha = 0.65;
                ctx.translate(arenaWidth * pf.ratioX, py);
                ctx.rotate(Math.sin(s.worldTime + pf.phase) * 0.22);
                ctx.drawImage(img, -pw / 2, -ph / 2, pw, ph);
                ctx.restore();
              }
            } else {
              // Draw flying Superhero + trailing waving flag text in upper sky (below HUD, BEHIND falling foods & traps)
              if (s.superhero?.active && sprites.superhero) {
                drawSuperheroWithFlagText(ctx, s.superhero, sprites.superhero);
              }

              // Draw falling food, trap (bare/as-is with NO circular wrapper), and Mystery Box items
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

              // Draw main character sprite with kawaii walk/eat squash-and-stretch + 3x Tuing on salah makan
              const isDefeated = currentScreen === 'gameover';
              const charKey = resolveCharacterSprite(s.player, isDefeated);
              const charImg = sprites[charKey];
              if (charImg) {
                const natAspect =
                  charImg.naturalHeight > 0
                    ? charImg.naturalWidth / charImg.naturalHeight
                    : PLAYER_WIDTH / PLAYER_HEIGHT;
                const baseH = PLAYER_HEIGHT;
                const baseW = baseH * natAspect;
                const tuingScale = computeWrongEatTuingScale(
                  s.player.expression,
                  s.player.expressionTimer,
                  isDefeated,
                );

                // Subtle toy-like squash-and-stretch on walk/eat
                let squashX = 1;
                let squashY = 1;
                if (s.player.expression === 'makan') {
                  const eatT = Math.max(0, Math.min(1, s.player.expressionTimer / EAT_EXPRESSION_DURATION_SEC));
                  const bump = Math.sin(eatT * Math.PI) * 0.09;
                  squashX = 1 - bump * 0.55;
                  squashY = 1 + bump;
                } else if (s.player.isMoving && s.player.expression === 'none') {
                  const bob = Math.sin(s.worldTime * 18) * 0.045;
                  squashX = 1 - bob;
                  squashY = 1 + bob;
                }

                const centerPull =
                  ((tuingScale - 1) / Math.max(1, WRONG_TUING_MAX_SCALE - 1)) * 0.45;
                const drawCenterX = s.player.x + (arenaWidth / 2 - s.player.x) * centerPull;
                const drawBottomY = s.player.y + baseH;
                const scaledW = baseW * tuingScale * squashX;
                const scaledH = baseH * tuingScale * squashY;

                // Soft ground shadow under character feet
                ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
                ctx.beginPath();
                ctx.ellipse(
                  drawCenterX,
                  drawBottomY - 4,
                  Math.min(arenaWidth * 0.44, scaledW * 0.36),
                  7 + (tuingScale - 1) * 2.5,
                  0,
                  0,
                  Math.PI * 2,
                );
                ctx.fill();

                ctx.drawImage(
                  charImg,
                  drawCenterX - scaledW / 2,
                  drawBottomY - scaledH,
                  scaledW,
                  scaledH,
                );
              }

              // Draw revealed Mystery Box objects cleanly IN FRONT of character without circular wrappers
              drawMysteryReveals(ctx, s.reveals, sprites, s.worldTime, 64, true);
            }
          }

          // Particles & floating score popups
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
  }, [inputAxisRef]);

  const toArenaX = (clientX: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return ((clientX - rect.left) / rect.width) * arenaWidthRef.current;
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="game-canvas"
      className="w-full h-full block touch-none select-none"
      onPointerDown={(e) => {
        if (screenRef.current !== 'playing') return;
        e.currentTarget.setPointerCapture(e.pointerId);
        simRef.current.draggingPointerId = e.pointerId;
        const wx = toArenaX(e.clientX);
        if (wx !== null) {
          simRef.current.player.targetX = clampPlayerX(wx, arenaWidthRef.current);
        }
      }}
      onPointerMove={(e) => {
        if (screenRef.current !== 'playing') return;
        if (simRef.current.draggingPointerId !== e.pointerId && e.buttons === 0) return;
        const wx = toArenaX(e.clientX);
        if (wx !== null) {
          simRef.current.player.targetX = clampPlayerX(wx, arenaWidthRef.current);
        }
      }}
      onPointerUp={(e) => {
        if (simRef.current.draggingPointerId === e.pointerId) {
          simRef.current.draggingPointerId = null;
          simRef.current.player.targetX = null;
        }
      }}
      onPointerCancel={(e) => {
        if (simRef.current.draggingPointerId === e.pointerId) {
          simRef.current.draggingPointerId = null;
          simRef.current.player.targetX = null;
        }
      }}
    />
  );
}

function publishHudIfNeeded(
  s: {
    level: number;
    timeRemaining: number;
    score: number;
    foodsEaten: number;
    levelFoodsEaten: number;
    levelScore: number;
    mistakes: number;
    bannerTimer: number;
    lastPublishedHudKey: string;
  },
  onHudUpdate: (snapshot: HudSnapshot) => void,
): void {
  const sec = Math.max(0, Math.ceil(s.timeRemaining));
  const banner = s.bannerTimer > 0;
  const key = `${s.level}|${sec}|${s.score}|${s.foodsEaten}|${s.levelFoodsEaten}|${s.levelScore}|${s.mistakes}|${banner ? 1 : 0}`;
  if (key === s.lastPublishedHudKey) return;
  s.lastPublishedHudKey = key;
  onHudUpdate({
    level: s.level,
    timeRemaining: s.timeRemaining,
    score: s.score,
    foodsEaten: s.foodsEaten,
    levelFoodsEaten: s.levelFoodsEaten,
    levelScore: s.levelScore,
    mistakes: s.mistakes,
    levelTransitionBanner: banner,
  });
}

function drawSuperheroWithFlagText(
  ctx: CanvasRenderingContext2D,
  hero: SuperheroFlyby,
  heroImg: HTMLImageElement,
): void {
  const heroTilt = Math.sin(hero.elapsed * 2.2) * 0.035;

  // 1. Superhero sprite + subtle slipstream arcs above/below
  ctx.save();
  ctx.translate(hero.x, hero.y);
  ctx.rotate(heroTilt);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(hero.width * 0.38, -20);
  ctx.lineTo(hero.width * 0.74, -20);
  ctx.moveTo(hero.width * 0.34, 21);
  ctx.lineTo(hero.width * 0.66, 21);
  ctx.stroke();

  ctx.drawImage(
    heroImg,
    -hero.width / 2,
    -hero.height / 2,
    hero.width,
    hero.height,
  );
  ctx.restore();

  // 2. Trailing waving red ribbon + plain solid white text "KURANG 3 LAGI"
  const chars = Array.from(SUPERHERO_BANNER_TEXT);
  const scaleX = 1.18;
  const scaleY = 0.96;
  const tracking = 1.6;
  const ribbonStartX = hero.x + hero.width * 0.5 + 10;
  const padLeft = 14;
  const padRight = 24;
  const notchDepth = 11;
  const ribbonHalfH = 15;
  const baseY = hero.y + 1;

  ctx.save();
  ctx.font = '900 16px "Arial Black", "Montserrat", "Inter", ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const advances = chars.map((ch) => {
    const baseAdvance = ch === ' ' ? 7.2 : ctx.measureText(ch).width;
    return baseAdvance * scaleX + tracking;
  });
  const totalTextWidth = advances.reduce((sum, w) => sum + w, 0);
  const avgCharStep = totalTextWidth / Math.max(1, chars.length);
  const ribbonLen = padLeft + totalTextWidth + padRight;
  const ribbonEndX = ribbonStartX + ribbonLen;

  const evalWave = (dx: number) => {
    const u = Math.max(0, (dx - padLeft) / avgCharStep);
    const phase = hero.elapsed * 8.4 - u * 0.54;
    const amp = 1.6 + u * 0.44;
    return {
      waveY: Math.sin(phase) * amp,
      waveX: Math.cos(phase) * 0.7,
      tilt: Math.cos(phase) * (0.045 + u * 0.004),
    };
  };

  const leadWave = evalWave(0);
  const tailWave = evalWave(ribbonLen);

  // Subtle white tow cords connecting superhero's cape/boots to the ribbon
  const attachX = hero.x + hero.width * 0.43;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(attachX, hero.y - 4);
  ctx.quadraticCurveTo(
    (attachX + ribbonStartX) / 2,
    hero.y - 7 + leadWave.waveY * 0.5,
    ribbonStartX + 1,
    baseY + leadWave.waveY - ribbonHalfH * 0.55,
  );
  ctx.moveTo(attachX - 3, hero.y + 8);
  ctx.quadraticCurveTo(
    (attachX + ribbonStartX) / 2,
    hero.y + 9 + leadWave.waveY * 0.5,
    ribbonStartX + 1,
    baseY + leadWave.waveY + ribbonHalfH * 0.55,
  );
  ctx.stroke();

  // Waving red ribbon body with classic swallowtail notch
  const segments = 28;
  ctx.beginPath();
  for (let sIdx = 0; sIdx <= segments; sIdx++) {
    const dx = (sIdx / segments) * ribbonLen;
    const w = evalWave(dx);
    const px = ribbonStartX + dx;
    const py = baseY + w.waveY - ribbonHalfH;
    if (sIdx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.lineTo(ribbonEndX - notchDepth, baseY + tailWave.waveY);
  for (let sIdx = segments; sIdx >= 0; sIdx--) {
    const dx = (sIdx / segments) * ribbonLen;
    const w = evalWave(dx);
    const px = ribbonStartX + dx;
    const py = baseY + w.waveY + ribbonHalfH;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  const ribbonGrad = ctx.createLinearGradient(0, baseY - ribbonHalfH - 6, 0, baseY + ribbonHalfH + 6);
  ribbonGrad.addColorStop(0, '#F87171');
  ribbonGrad.addColorStop(0.22, '#EF4444');
  ribbonGrad.addColorStop(0.75, '#DC2626');
  ribbonGrad.addColorStop(1, '#B91C1C');
  ctx.fillStyle = ribbonGrad;
  ctx.fill();

  ctx.strokeStyle = '#991B1B';
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Subtle glossy highlight along upper fold of the red ribbon
  ctx.beginPath();
  for (let sIdx = 0; sIdx <= segments; sIdx++) {
    const dx = (sIdx / segments) * (ribbonLen - notchDepth * 0.8);
    const w = evalWave(dx);
    const px = ribbonStartX + dx;
    const py = baseY + w.waveY - ribbonHalfH + 3.2;
    if (sIdx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Plain solid white text "KURANG 3 LAGI" inside the red ribbon (no outline)
  let cursorX = ribbonStartX + padLeft;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const wideAdvance = advances[i];

    if (ch !== ' ') {
      const charCenterDx = (cursorX - ribbonStartX) + wideAdvance * 0.5;
      const w = evalWave(charCenterDx);

      ctx.save();
      ctx.translate(cursorX + wideAdvance * 0.5 + w.waveX, baseY + w.waveY + 0.5);
      ctx.rotate(w.tilt);
      ctx.scale(scaleX, scaleY);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    cursorX += wideAdvance;
  }

  ctx.restore();
}





