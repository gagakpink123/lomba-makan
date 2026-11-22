import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { GameCanvas, type RunResult } from './components/GameCanvas';
import { Section2Canvas, type Section2RunResult } from './components/Section2Canvas';
import {
  GameHud,
  Section2Hud,
  TopRightUtilityButtons,
  type HudSnapshot,
  type Section2HudSnapshot,
} from './components/GameHud';
import {
  FoodCatalogModal,
  GameOverModal,
  InstructionsModal,
  LevelSelectModal,
  PauseModal,
  SoundSettingsModal,
  VictoryModal,
} from './components/GameModals';
import { LoadingScreen } from './components/LoadingScreen';
import {
  CatalogIcon,
  InstagramIcon,
  PlayIcon,
  ThreadsIcon,
  TikTokIcon,
  TitleEmblem,
} from './components/TitleEmblem';
import { CHARACTER_SPRITES, FLYER_SPRITES } from './game/assets';
import { audioManager, type AudioSettings } from './game/audio';
import {
  getLevelConfig,
  getSection2LevelConfig,
  getSectionForLevel,
  LEVEL_DURATION_SECONDS,
  SECTION2_MAX_LEVEL,
  SECTION2_MIN_LEVEL,
} from './game/levels';
import type { GameScreenState } from './game/rules';
import {
  FLYER_MAX_CRASH_CHANCES,
  FLYER_MAX_FOOD_CHANCES,
  loadSection2HighScore,
} from './game/section2Rules';

export default function App() {
  const fullscreenWrapperRef = useRef<HTMLElement | null>(null);
  const inputAxisRef = useRef<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const verticalAxisRef = useRef<{ up: boolean; down: boolean }>({
    up: false,
    down: false,
  });

  const [screen, setScreen] = useState<GameScreenState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  });

  const [runSeed, setRunSeed] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 1;
      }
    }
    return 0;
  });

  const [selectedStartLevel, setSelectedStartLevel] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const raw = Number(params.get('level'));
      if (Number.isFinite(raw) && raw >= 1) {
        if (raw >= SECTION2_MIN_LEVEL) {
          return getSection2LevelConfig(Math.min(SECTION2_MAX_LEVEL, raw)).level;
        }
        return getLevelConfig(raw).level;
      }
    }
    return 1;
  });

  const activeSection = getSectionForLevel(selectedStartLevel);

  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return true;
      }
    }
    return false;
  });

  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showFoodCatalog, setShowFoodCatalog] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    audioManager.getSettings(),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [hud, setHud] = useState<HudSnapshot>({
    level: selectedStartLevel,
    timeRemaining: LEVEL_DURATION_SECONDS,
    score: 0,
    foodsEaten: 0,
    levelFoodsEaten: 0,
    levelScore: 0,
    mistakes: 0,
    levelTransitionBanner: false,
  });

  const [hud2, setHud2] = useState<Section2HudSnapshot>(() => ({
    level: Math.max(SECTION2_MIN_LEVEL, selectedStartLevel),
    score: 0,
    highScore: loadSection2HighScore(),
    foodChances: FLYER_MAX_FOOD_CHANCES,
    crashChances: FLYER_MAX_CRASH_CHANCES,
    inTunnel: false,
    tunnelWarning: false,
    levelTransitionBanner: false,
  }));

  const [lastResult, setLastResult] = useState<{
    score: number;
    levelReached: number;
    foodsEaten: number;
    reason?: 'mistakes' | 'timeout' | 'crash';
    highScore?: number;
    isNewRecord?: boolean;
  }>({
    score: 0,
    levelReached: 1,
    foodsEaten: 0,
    reason: 'mistakes',
  });

  // Sync document.body.dataset.state for accessibility and automated checks
  useEffect(() => {
    if (!isLoaded) {
      document.body.dataset.state = 'loading';
      delete document.body.dataset.outcome;
      return;
    }
    const mappedState = screen === 'victory' ? 'gameover' : screen;
    document.body.dataset.state = mappedState;
    if (screen === 'victory') {
      document.body.dataset.outcome = 'victory';
    } else if (screen === 'gameover') {
      document.body.dataset.outcome = 'defeat';
    } else {
      delete document.body.dataset.outcome;
    }
  }, [isLoaded, screen]);

  // Listen to fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const clearInputs = useCallback(() => {
    inputAxisRef.current.left = false;
    inputAxisRef.current.right = false;
    verticalAxisRef.current.up = false;
    verticalAxisRef.current.down = false;
  }, []);

  const startGameAtLevel = useCallback(
    (levelToStart: number) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      clearInputs();
      setShowLevelSelect(false);
      setShowInstructions(false);
      setShowFoodCatalog(false);
      setShowSoundSettings(false);
      setRunSeed((prev) => prev + 1);
      setScreen('playing');

      void audioManager.unlock().then(() => {
        audioManager.playSfx('sfxButton', 0);
        void audioManager.playLevelBgm(levelToStart);
      });
    },
    [clearInputs],
  );

  const startNewGame = useCallback(() => {
    startGameAtLevel(selectedStartLevel);
  }, [selectedStartLevel, startGameAtLevel]);

  const handleStartSection2FromVictory = useCallback(() => {
    setSelectedStartLevel(SECTION2_MIN_LEVEL);
    startGameAtLevel(SECTION2_MIN_LEVEL);
  }, [startGameAtLevel]);

  const handleTitleStartClick = useCallback(() => {
    startNewGame();
  }, [startNewGame]);

  const handleLoadingComplete = useCallback((loadedHighScore: number) => {
    setAudioSettings(audioManager.getSettings());
    setHud2((prev) => ({ ...prev, highScore: loadedHighScore }));
    setIsLoaded(true);
  }, []);

  const handlePause = useCallback(() => {
    if (screen !== 'playing') return;
    clearInputs();
    audioManager.playSfx('sfxButton', 0);
    audioManager.pauseBgm();
    setScreen('paused');
  }, [clearInputs, screen]);

  const handleResume = useCallback(() => {
    if (screen !== 'paused') return;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    clearInputs();
    audioManager.playSfx('sfxButton', 0);
    void audioManager.resumeBgm();
    setScreen('playing');
  }, [clearInputs, screen]);

  const handleReturnToMenu = useCallback(() => {
    clearInputs();
    audioManager.playSfx('sfxButton', 0);
    audioManager.stopBgm();
    setShowLevelSelect(false);
    setShowInstructions(false);
    setShowFoodCatalog(false);
    setShowSoundSettings(false);
    setScreen('title');
  }, [clearInputs]);

  const handleToggleMute = useCallback(() => {
    void audioManager.unlock();
    const muted = audioManager.toggleMute();
    setAudioSettings(audioManager.getSettings());
    if (!muted) {
      audioManager.playSfx('sfxButton', 0);
    }
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    void audioManager.unlock();
    audioManager.playSfx('sfxButton', 0);
    const target = fullscreenWrapperRef.current ?? document.documentElement;
    if (!document.fullscreenElement) {
      if (target.requestFullscreen) {
        void target.requestFullscreen().catch(() => {});
      }
    } else if (document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleMusicVolume = useCallback((v: number) => {
    void audioManager.unlock();
    audioManager.setMusicVolume(v);
    setAudioSettings(audioManager.getSettings());
  }, []);

  const handleSfxVolume = useCallback((v: number) => {
    void audioManager.unlock();
    audioManager.setSfxVolume(v);
    setAudioSettings(audioManager.getSettings());
    audioManager.playSfx('sfxButton', 90);
  }, []);

  const handleGameOver = useCallback(
    (result: RunResult | Section2RunResult) => {
      clearInputs();
      setLastResult(result);
      setScreen('gameover');
    },
    [clearInputs],
  );

  const handleVictory = useCallback(
    (result: RunResult) => {
      clearInputs();
      setLastResult(result);
      setScreen('victory');
    },
    [clearInputs],
  );

  // Keyboard controls + blur safety
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'ArrowUp' ||
        key === 'ArrowDown' ||
        key === ' '
      ) {
        e.preventDefault();
      }

      if (key === 'm' || key === 'M') {
        handleToggleMute();
        return;
      }

      if (!isLoaded) return;

      if (screen === 'title') {
        if (showInstructions && (key === 'Enter' || key === ' ')) {
          startNewGame();
          return;
        }
        if (
          !showLevelSelect &&
          !showInstructions &&
          !showFoodCatalog &&
          !showSoundSettings &&
          (key === 'Enter' || key === ' ')
        ) {
          handleTitleStartClick();
          return;
        }
        if (key === 'Escape') {
          setShowLevelSelect(false);
          setShowInstructions(false);
          setShowFoodCatalog(false);
          setShowSoundSettings(false);
          return;
        }
      }

      if (screen === 'playing') {
        if (key === 'Escape' || key === 'p' || key === 'P') {
          handlePause();
          return;
        }
        if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
          void audioManager.unlock();
          inputAxisRef.current.left = true;
        }
        if (key === 'ArrowRight' || key === 'd' || key === 'D') {
          void audioManager.unlock();
          inputAxisRef.current.right = true;
        }
        if (key === 'ArrowUp' || key === 'w' || key === 'W') {
          void audioManager.unlock();
          verticalAxisRef.current.up = true;
        }
        if (key === 'ArrowDown' || key === 's' || key === 'S') {
          void audioManager.unlock();
          verticalAxisRef.current.down = true;
        }
      } else if (screen === 'paused') {
        if (key === 'Escape' || key === 'p' || key === 'P') {
          handleResume();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        inputAxisRef.current.left = false;
      }
      if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        inputAxisRef.current.right = false;
      }
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        verticalAxisRef.current.up = false;
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        verticalAxisRef.current.down = false;
      }
    };

    const onBlurOrHide = () => {
      clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrHide);
    document.addEventListener('visibilitychange', onBlurOrHide);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrHide);
      document.removeEventListener('visibilitychange', onBlurOrHide);
    };
  }, [
    clearInputs,
    handlePause,
    handleResume,
    handleTitleStartClick,
    handleToggleMute,
    isLoaded,
    screen,
    showFoodCatalog,
    showInstructions,
    showLevelSelect,
    showSoundSettings,
    startNewGame,
  ]);

  return (
    <>
      <main
        ref={fullscreenWrapperRef}
        className="w-screen h-[100dvh] overflow-hidden flex items-center justify-center kawaii-backdrop"
      >
      {/* Responsive Stage: fixed 9:16 on mobile devices, full responsive arena on desktop */}
      <div
        data-testid="game-stage"
        className="game-stage-responsive relative overflow-hidden bg-[#CBEFFF]"
      >
        {/* 60fps Isolated Simulation Canvas (Section 1 vs Section 2) */}
        {activeSection === 2 ? (
          <Section2Canvas
            screen={screen}
            runSeed={runSeed}
            startLevel={selectedStartLevel}
            verticalAxisRef={verticalAxisRef}
            onHudUpdate={setHud2}
            onGameOver={handleGameOver}
          />
        ) : (
          <GameCanvas
            screen={screen}
            runSeed={runSeed}
            startLevel={selectedStartLevel}
            inputAxisRef={inputAxisRef}
            onHudUpdate={setHud}
            onGameOver={handleGameOver}
            onVictory={handleVictory}
          />
        )}

        {/* STARTUP LOADING PAGE */}
        {!isLoaded && <LoadingScreen onReady={handleLoadingComplete} />}

        {/* TITLE / SIMPLIFIED MAIN MENU OVERLAY */}
        {isLoaded && screen === 'title' && (() => {
          const isSec2 = activeSection === 2;
          const selectedLevelCfg = isSec2
            ? getSection2LevelConfig(selectedStartLevel)
            : getLevelConfig(selectedStartLevel);
          return (
          <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-4 overflow-hidden">
            {/* Top-right Mute & Fullscreen controls */}
            <div className="flex justify-end shrink-0">
              <TopRightUtilityButtons
                muted={audioSettings.muted}
                isFullscreen={isFullscreen}
                onToggleMute={handleToggleMute}
                onToggleFullscreen={handleToggleFullscreen}
              />
            </div>

            {/* Title Lockup */}
            <div className="mt-0.5 shrink-0 min-w-0">
              <TitleEmblem />
            </div>

            {/* Hero Character Showcase (adapts to selected Section 1 vs Section 2) */}
            <div className="flex-1 flex flex-col items-center justify-center my-1 min-h-0 gap-2">
              <img
                src={isSec2 ? FLYER_SPRITES.flyerIdle1 : CHARACTER_SPRITES.walk1}
                alt={isSec2 ? 'Superhero terbang Lomba Makan Bergizi Bagian 2' : 'Karakter utama Lomba Makan Bergizi'}
                referrerPolicy="no-referrer"
                className="h-28 sm:h-40 max-h-full w-auto object-contain animate-float-slow drop-shadow-[0_12px_14px_rgba(190,24,93,0.18)]"
              />
              <div
                data-testid="selected-level-badge"
                className="bg-[#FFFDF9]/95 border-2 rounded-2xl px-3 py-1 shadow-[0_2px_0_rgba(15,23,42,0.1)] flex items-center gap-1.5 max-w-full"
                style={{ borderColor: selectedLevelCfg.accentColor }}
              >
                <span className="text-[11px] sm:text-xs font-black text-slate-600 whitespace-nowrap">
                  Siap Main:
                </span>
                <span
                  className="font-display text-xs sm:text-sm font-bold truncate"
                  style={{ color: selectedLevelCfg.badgeText }}
                >
                  {selectedLevelCfg.title} · {selectedLevelCfg.subtitle}
                </span>
              </div>
            </div>

            {/* Simplified Main Menu Actions */}
            <div className="w-full max-w-[368px] mx-auto space-y-2 pb-0.5 shrink-0 min-w-0">
              {/* Side-by-side Primary Row: Mulai Bermain & Pilih Level */}
              <div
                data-testid="primary-menu-row"
                className="grid grid-cols-2 gap-2.5 items-stretch"
              >
                <button
                  type="button"
                  data-testid="start-menu-btn"
                  onClick={handleTitleStartClick}
                  style={{ '--btn-lip': isSec2 ? '#0369A1' : '#15803D' } as React.CSSProperties}
                  className={`kawaii-btn min-w-0 py-2.5 sm:py-3 px-2.5 rounded-[20px] text-white font-display text-sm sm:text-base font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isSec2
                      ? 'bg-sky-500 hover:bg-sky-400 border-sky-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700'
                  }`}
                >
                  <PlayIcon />
                  <span>MULAI BERMAIN</span>
                </button>

                <button
                  type="button"
                  data-testid="open-level-select-btn"
                  onClick={() => {
                    void audioManager.unlock();
                    audioManager.playSfx('sfxButton', 0);
                    setShowInstructions(false);
                    setShowFoodCatalog(false);
                    setShowSoundSettings(false);
                    setShowLevelSelect(true);
                  }}
                  style={{ '--btn-lip': '#DB2777' } as React.CSSProperties}
                  className="kawaii-btn min-w-0 py-2.5 sm:py-3 px-2.5 rounded-[20px] bg-pink-500 hover:bg-pink-400 border-pink-700 text-white font-display text-sm sm:text-base font-bold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>PILIH LEVEL</span>
                  <span className="bg-white/25 px-1.5 py-0.5 rounded-lg text-[11px] sm:text-xs leading-none">
                    Lv {selectedStartLevel}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  void audioManager.unlock();
                  audioManager.playSfx('sfxButton', 0);
                  setShowFoodCatalog(true);
                }}
                style={{ '--btn-lip': '#DB2777' } as React.CSSProperties}
                className="kawaii-btn w-full py-1.5 sm:py-2 px-3 rounded-[18px] bg-[#FCE7F3] hover:bg-[#FBCFE8] border-pink-500 text-pink-900 font-display text-sm sm:text-base font-bold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <CatalogIcon />
                <span>KATALOG MAKANAN</span>
              </button>

              <div className="flex items-stretch gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    void audioManager.unlock();
                    audioManager.playSfx('sfxButton', 0);
                    setShowInstructions(true);
                  }}
                  style={{ '--btn-lip': '#D97706' } as React.CSSProperties}
                  className="kawaii-btn py-1.5 sm:py-2 px-3 sm:px-4 shrink-0 rounded-[18px] bg-[#FEF3C7] hover:bg-[#FDE68A] border-amber-500 text-amber-950 font-display text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
                >
                  PETUNJUK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void audioManager.unlock();
                    audioManager.playSfx('sfxButton', 0);
                    setShowSoundSettings(true);
                  }}
                  style={{ '--btn-lip': '#0284C7' } as React.CSSProperties}
                  className="kawaii-btn flex-1 min-w-0 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-[18px] bg-[#E0F2FE] hover:bg-[#BAE6FD] border-sky-500 text-sky-950 font-display text-xs sm:text-sm font-bold cursor-pointer leading-tight whitespace-nowrap truncate"
                >
                  ATUR SUARA
                </button>
              </div>

              <p className="text-center text-[10px] sm:text-[11px] font-extrabold text-slate-700 leading-tight pt-0.5">
                {isSec2
                  ? 'Geser Atas-Bawah / Panah ↑-↓ / W-S · P Jeda'
                  : 'Geser Kiri-Kanan / Panah ←-→ / A-D · P Jeda'}
              </p>

              {/* Compact Creator Credit / Copyright Strip */}
              <div
                data-testid="creator-credit"
                className="flex items-center justify-between gap-2 bg-[#FFFDF9]/95 border-[2.5px] border-pink-300 rounded-2xl px-3 py-1.5 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(219,39,119,0.18)]"
              >
                <span className="text-[11px] sm:text-xs font-extrabold text-pink-800 truncate">
                  © adnanjogja
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href="https://www.tiktok.com/@adnanjogja"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok adnanjogja"
                    title="TikTok @adnanjogja"
                    style={{ '--btn-lip': '#1E293B' } as React.CSSProperties}
                    className="kawaii-icon-btn w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border-slate-700 text-white flex items-center justify-center"
                  >
                    <TikTokIcon />
                  </a>
                  <a
                    href="https://www.instagram.com/adnanjogja/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram adnanjogja"
                    title="Instagram @adnanjogja"
                    style={{ '--btn-lip': '#BE185D' } as React.CSSProperties}
                    className="kawaii-icon-btn w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-pink-500 hover:bg-pink-400 border-pink-700 text-white flex items-center justify-center"
                  >
                    <InstagramIcon />
                  </a>
                  <a
                    href="https://www.threads.com/@adnanjogja"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Threads adnanjogja"
                    title="Threads @adnanjogja"
                    style={{ '--btn-lip': '#334155' } as React.CSSProperties}
                    className="kawaii-icon-btn w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FFFDF9] hover:bg-slate-100 border-slate-700 text-slate-900 flex items-center justify-center"
                  >
                    <ThreadsIcon />
                  </a>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* PLAYING HUD */}
        {isLoaded && screen === 'playing' && (
          activeSection === 2 ? (
            <Section2Hud
              hud={hud2}
              muted={audioSettings.muted}
              isFullscreen={isFullscreen}
              onPause={handlePause}
              onToggleMute={handleToggleMute}
              onToggleFullscreen={handleToggleFullscreen}
            />
          ) : (
            <GameHud
              hud={hud}
              muted={audioSettings.muted}
              isFullscreen={isFullscreen}
              onPause={handlePause}
              onToggleMute={handleToggleMute}
              onToggleFullscreen={handleToggleFullscreen}
            />
          )
        )}

        {/* MODALS */}
        {isLoaded && showLevelSelect && (
          <LevelSelectModal
            selectedLevel={selectedStartLevel}
            onSelectLevel={(lvl) => {
              void audioManager.unlock();
              audioManager.playSfx('sfxButton', 0);
              setSelectedStartLevel(lvl);
              setShowLevelSelect(false);
            }}
            onClose={() => {
              audioManager.playSfx('sfxButton', 0);
              setShowLevelSelect(false);
            }}
          />
        )}

        {isLoaded && showInstructions && (
          <InstructionsModal
            startLevel={selectedStartLevel}
            onStart={startNewGame}
            onClose={() => {
              audioManager.playSfx('sfxButton', 0);
              setShowInstructions(false);
            }}
          />
        )}

        {showFoodCatalog && (
          <FoodCatalogModal
            onClose={() => {
              audioManager.playSfx('sfxButton', 0);
              setShowFoodCatalog(false);
            }}
          />
        )}

        {showSoundSettings && (
          <SoundSettingsModal
            settings={audioSettings}
            onChangeMusic={handleMusicVolume}
            onChangeSfx={handleSfxVolume}
            onToggleMute={handleToggleMute}
            onClose={() => {
              audioManager.playSfx('sfxButton', 0);
              setShowSoundSettings(false);
            }}
          />
        )}

        {screen === 'paused' && (
          <PauseModal
            level={activeSection === 2 ? hud2.level : hud.level}
            score={activeSection === 2 ? hud2.score : hud.score}
            onResume={handleResume}
            onRestart={startNewGame}
            onMainMenu={handleReturnToMenu}
          />
        )}

        {screen === 'gameover' && (
          <GameOverModal
            score={lastResult.score}
            levelReached={lastResult.levelReached}
            foodsEaten={lastResult.foodsEaten}
            highScore={lastResult.highScore}
            isNewRecord={lastResult.isNewRecord}
            reason={lastResult.reason}
            onRetry={startNewGame}
            onMainMenu={handleReturnToMenu}
          />
        )}

        {screen === 'victory' && (
          <VictoryModal
            score={lastResult.score}
            foodsEaten={lastResult.foodsEaten}
            onPlayAgain={startNewGame}
            onStartSection2={handleStartSection2FromVictory}
            onMainMenu={handleReturnToMenu}
          />
        )}
      </div>
      </main>
      <Analytics />
    </>
  );
}
