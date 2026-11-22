import React from 'react';
import { getLevelConfig, getSection2LevelConfig, TOTAL_LEVELS } from '../game/levels';
import { evaluateLevelTargetProgress, evaluateMistakes } from '../game/rules';
import {
  CrownIcon,
  FullscreenIcon,
  HeartIcon,
  PauseIcon,
  ShieldIcon,
  SoundIcon,
} from './TitleEmblem';

export interface HudSnapshot {
  level: number;
  timeRemaining: number;
  score: number;
  foodsEaten: number;
  levelFoodsEaten: number;
  levelScore: number;
  mistakes: number;
  levelTransitionBanner: boolean;
}

interface TopRightUtilityProps {
  muted: boolean;
  isFullscreen: boolean;
  showPause?: boolean;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onPause?: () => void;
}

export function TopRightUtilityButtons({
  muted,
  isFullscreen,
  showPause = false,
  onToggleMute,
  onToggleFullscreen,
  onPause,
}: TopRightUtilityProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
      {showPause && onPause && (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onPause();
          }}
          aria-label="Jeda permainan"
          title="Jeda (P / Esc)"
          style={{ '--btn-lip': '#D97706' } as React.CSSProperties}
          className="kawaii-icon-btn w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] text-amber-900 border-amber-500 flex items-center justify-center cursor-pointer"
        >
          <PauseIcon />
        </button>
      )}
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          onToggleMute();
        }}
        aria-label={muted ? 'Aktifkan suara' : 'Bisukan suara'}
        title={muted ? 'Aktifkan Suara (M)' : 'Bisukan Suara (M)'}
        style={{ '--btn-lip': muted ? '#BE123C' : '#0284C7' } as React.CSSProperties}
        className={`kawaii-icon-btn w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center cursor-pointer ${
          muted
            ? 'bg-[#FFE4E6] hover:bg-[#FECDD3] text-rose-700 border-rose-400'
            : 'bg-[#E0F2FE] hover:bg-[#BAE6FD] text-sky-800 border-sky-400'
        }`}
      >
        <SoundIcon muted={muted} />
      </button>
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => {
          e.currentTarget.blur();
          onToggleFullscreen();
        }}
        aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
        title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
        style={{ '--btn-lip': '#059669' } as React.CSSProperties}
        className="kawaii-icon-btn w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#D1FAE5] hover:bg-[#A7F3D0] text-emerald-900 border-emerald-500 flex items-center justify-center cursor-pointer"
      >
        <FullscreenIcon isFullscreen={isFullscreen} />
      </button>
    </div>
  );
}

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  isFullscreen: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export function GameHud({
  hud,
  muted,
  isFullscreen,
  onPause,
  onToggleMute,
  onToggleFullscreen,
}: GameHudProps) {
  const cfg = getLevelConfig(hud.level);
  const mistakeState = evaluateMistakes(hud.mistakes);
  const targetState = evaluateLevelTargetProgress(hud.level, hud.levelFoodsEaten, hud.levelScore);
  const displaySeconds = Math.max(0, Math.ceil(hud.timeRemaining));
  const isUrgent = displaySeconds <= 10 && displaySeconds > 0;

  const foodRatio = Math.min(1, hud.levelFoodsEaten / Math.max(1, targetState.targetFoods));
  const scoreRatio = Math.min(1, hud.levelScore / Math.max(1, targetState.targetLevelScore));
  const levelProgress = (foodRatio + scoreRatio) / 2;
  const totalProgressPct = Math.round(
    (((hud.level - 1) + levelProgress) / TOTAL_LEVELS) * 100,
  );

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-3 overflow-hidden">
      {/* TOP HUD (centered neatly on wide desktop, compact on mobile 9:16) */}
      <div className="w-full max-w-[740px] mx-auto space-y-1.5 min-w-0">
        {/* Row 1: Kawaii Level Plaque + Utility buttons */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="min-w-0 flex-1 bg-[#FFFDF9] border-[2.5px] border-pink-400 rounded-2xl px-2.5 py-1 shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_3px_0_rgba(219,39,119,0.22)] overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
              <span className="font-display text-xs sm:text-sm font-bold text-rose-600 tracking-wide truncate">
                LOMBA MAKAN BERGIZI
              </span>
              <span
                className="font-display text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-lg border truncate"
                style={{
                  backgroundColor: cfg.badgeBg,
                  color: cfg.badgeText,
                  borderColor: cfg.accentColor,
                }}
              >
                {cfg.title}: {cfg.subtitle}
              </span>
            </div>
          </div>

          <TopRightUtilityButtons
            muted={muted}
            isFullscreen={isFullscreen}
            showPause
            onPause={onPause}
            onToggleMute={onToggleMute}
            onToggleFullscreen={onToggleFullscreen}
          />
        </div>

        {/* Row 2: Toy-like Stat Stickers (Skor / Waktu / Kesempatan) */}
        <div className="grid grid-cols-3 gap-1.5 items-stretch">
          {/* Score & foods eaten */}
          <div className="min-w-0 bg-[#FFFDF9] border-[2.5px] border-amber-400 rounded-2xl px-2 py-1 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(217,119,6,0.22)] flex flex-col justify-center overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 leading-none truncate">
              Skor Total
            </span>
            <div
              className="font-display text-lg sm:text-xl font-bold text-amber-950 leading-tight tabular-nums truncate"
              data-testid="hud-score"
            >
              {hud.score}
            </div>
            <span className="text-[10px] font-extrabold text-emerald-700 leading-none tabular-nums truncate">
              {hud.foodsEaten} dimakan
            </span>
          </div>

          {/* Countdown Timer */}
          <div
            className={`min-w-0 border-[2.5px] rounded-2xl px-2 py-1 flex flex-col items-center justify-center transition-colors overflow-hidden ${
              isUrgent
                ? 'bg-[#FFE4E6] border-rose-500 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(225,29,72,0.28)] animate-pulse'
                : 'bg-[#FFFDF9] border-sky-400 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(2,132,199,0.22)]'
            }`}
          >
            <span
              className={`text-[10px] font-black uppercase tracking-wider leading-none truncate ${
                isUrgent ? 'text-rose-700' : 'text-sky-700'
              }`}
            >
              Batas Waktu
            </span>
            <div
              className={`font-display text-xl sm:text-2xl font-bold leading-tight tabular-nums ${
                isUrgent ? 'text-rose-600' : 'text-slate-800'
              }`}
              data-testid="hud-timer"
            >
              {displaySeconds}d
            </div>
          </div>

          {/* Hearts / Mistakes */}
          <div className="min-w-0 bg-[#FFFDF9] border-[2.5px] border-pink-400 rounded-2xl px-1.5 py-1 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(219,39,119,0.22)] flex flex-col items-center justify-center overflow-hidden">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-pink-700 leading-none mb-0.5 truncate max-w-full">
              {mistakeState.isLastChance ? 'Terakhir!' : 'Kesempatan'}
            </span>
            <div
              className="flex items-center justify-center gap-0.5"
              data-testid="hud-hearts"
              aria-label={`Sisa kesempatan ${mistakeState.remainingHearts} hati`}
            >
              <HeartIcon filled={mistakeState.remainingHearts >= 1} pulse={mistakeState.isLastChance} />
              <HeartIcon filled={mistakeState.remainingHearts >= 2} />
              <HeartIcon filled={mistakeState.remainingHearts >= 3} />
            </div>
          </div>
        </div>

        {/* Row 3: Level Targets + 5-Level Candy Progress Track */}
        <div
          data-testid="hud-targets"
          className="bg-[#FFFDF9]/95 border-2 border-emerald-300 rounded-2xl px-2.5 py-1.5 shadow-[0_2px_0_rgba(16,185,129,0.18)] space-y-1"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[10px] sm:text-xs font-extrabold">
            <span className="text-slate-600 uppercase tracking-wide">
              Target {cfg.title}:
            </span>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 tabular-nums">
              <span className={targetState.foodsDone ? 'text-emerald-700' : 'text-slate-800'}>
                {targetState.foodsDone ? '✓ ' : ''}Makanan: {hud.levelFoodsEaten}/{targetState.targetFoods}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className={targetState.scoreDone ? 'text-emerald-700' : 'text-amber-800'}>
                {targetState.scoreDone ? '✓ ' : ''}Skor Lv: {hud.levelScore}/{targetState.targetLevelScore}
              </span>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-rose-700 hidden sm:inline">
                Maks 3× Salah ({hud.mistakes}/3)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-pink-100 border border-pink-200 rounded-full overflow-hidden p-[1px]">
              <div
                className="h-full rounded-full transition-all duration-300 shadow-[inset_0_2px_0_rgba(255,255,255,0.45)]"
                style={{
                  width: `${Math.max(5, totalProgressPct)}%`,
                  backgroundColor: cfg.accentColor,
                }}
              />
            </div>
            <span className="text-[10px] font-black text-pink-800 tabular-nums whitespace-nowrap">
              Lv {hud.level}/{TOTAL_LEVELS}
            </span>
          </div>
        </div>

        {mistakeState.isLastChance && (
          <div className="text-center px-1">
            <span className="inline-block max-w-full bg-rose-600 border-2 border-white text-white font-display text-[11px] sm:text-xs font-bold px-3 py-0.5 rounded-2xl shadow-[0_3px_0_#9F1239] animate-pulse">
              KESEMPATAN TERAKHIR! HATI-HATI JEBAKAN!
            </span>
          </div>
        )}
      </div>

      {/* LEVEL TRANSITION BANNER */}
      {hud.levelTransitionBanner && (
        <div className="flex flex-col items-center justify-center pointer-events-none my-auto px-2">
          <div
            style={{ '--win-lip': 'rgba(219, 39, 119, 0.28)' } as React.CSSProperties}
            className="kawaii-window animate-banner-bounce max-w-full border-amber-400 rounded-[28px] px-5 py-4 text-center"
          >
            <div className="font-display text-xl sm:text-3xl font-bold text-rose-600 leading-tight kawaii-sticker-text">
              LEVEL BERIKUTNYA!
            </div>
            <div className="font-display text-base sm:text-lg font-bold mt-1" style={{ color: cfg.accentColor }}>
              {cfg.title} — {cfg.subtitle}
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-600 mt-1 tabular-nums">
              Target: {cfg.targetFoods} Makanan · {cfg.targetLevelScore} Skor Level
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL HINT TEXT */}
      <div className="flex justify-center pb-0.5 pointer-events-none max-w-full">
        <div
          data-testid="hud-control-hint"
          className="max-w-full bg-[#FFFDF9]/95 border-2 border-amber-300 rounded-2xl px-3 py-1 shadow-[0_2px_0_rgba(217,119,6,0.2)] text-center"
        >
          <p className="text-[11px] sm:text-xs font-extrabold text-slate-700 leading-tight">
            Geser layar kiri/kanan atau tekan Panah <span className="text-rose-600">← →</span> / <span className="text-rose-600">A · D</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export interface Section2HudSnapshot {
  level: number;
  score: number;
  highScore: number;
  foodChances: number; // 0..3
  crashChances: number; // 0..3
  inTunnel: boolean;
  tunnelWarning: boolean;
  levelTransitionBanner: boolean;
}

interface Section2HudProps {
  hud: Section2HudSnapshot;
  muted: boolean;
  isFullscreen: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export function Section2Hud({
  hud,
  muted,
  isFullscreen,
  onPause,
  onToggleMute,
  onToggleFullscreen,
}: Section2HudProps) {
  const cfg = getSection2LevelConfig(hud.level);
  const lowFood = hud.foodChances === 1;
  const lowCrash = hud.crashChances === 1;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-3 overflow-hidden">
      {/* TOP HUD */}
      <div className="w-full max-w-[780px] mx-auto space-y-1.5 min-w-0">
        {/* Row 1: Title + Section 2 Level Badge + Area Phase Pill + Utilities */}
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="min-w-0 flex-1 bg-[#FFFDF9] border-[2.5px] border-sky-400 rounded-2xl px-2.5 py-1 shadow-[inset_0_2px_0_rgba(255,255,255,0.9),0_3px_0_rgba(2,132,199,0.22)] overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
              <span className="font-display text-xs sm:text-sm font-bold text-sky-700 tracking-wide truncate">
                BAGIAN 2: FLYING HERO
              </span>
              <span
                className="font-display text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-lg border truncate"
                style={{
                  backgroundColor: cfg.badgeBg,
                  color: cfg.badgeText,
                  borderColor: cfg.accentColor,
                }}
              >
                {cfg.title}: {cfg.subtitle}
              </span>
              <span
                data-testid="section2-area-badge"
                className={`font-display text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                  hud.inTunnel
                    ? 'bg-indigo-900 text-amber-300 border-amber-400'
                    : hud.tunnelWarning
                      ? 'bg-amber-100 text-amber-900 border-amber-500 animate-pulse'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-400'
                }`}
              >
                {hud.inTunnel
                  ? 'LORONG GELAP!'
                  : hud.tunnelWarning
                    ? 'AWAS LORONG GELAP!'
                    : 'LANGIT CERAH'}
              </span>
            </div>
          </div>

          <TopRightUtilityButtons
            muted={muted}
            isFullscreen={isFullscreen}
            showPause
            onPause={onPause}
            onToggleMute={onToggleMute}
            onToggleFullscreen={onToggleFullscreen}
          />
        </div>

        {/* Row 2: 4 Compact Stat Cards (Skor / High Score / Salah Makan / Tabrak Rintangan) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 items-stretch">
          {/* Current Score */}
          <div className="min-w-0 bg-[#FFFDF9] border-[2.5px] border-amber-400 rounded-2xl px-2.5 py-1 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(217,119,6,0.22)] flex flex-col justify-center overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 leading-none truncate">
              Skor
            </span>
            <div
              className="font-display text-lg sm:text-xl font-bold text-amber-950 leading-tight tabular-nums truncate"
              data-testid="hud-score"
            >
              {hud.score}
            </div>
          </div>

          {/* High Score */}
          <div className="min-w-0 bg-[#FFFDF9] border-[2.5px] border-purple-400 rounded-2xl px-2.5 py-1 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(124,58,237,0.2)] flex flex-col justify-center overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 leading-none flex items-center gap-1 truncate">
              <CrownIcon />
              <span>High Score</span>
            </span>
            <div
              className="font-display text-lg sm:text-xl font-bold text-purple-950 leading-tight tabular-nums truncate"
              data-testid="hud-highscore"
            >
              {hud.highScore}
            </div>
          </div>

          {/* Kesempatan Salah Makan (3 Hearts) */}
          <div className="min-w-0 bg-[#FFFDF9] border-[2.5px] border-pink-400 rounded-2xl px-2 py-1 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(219,39,119,0.22)] flex flex-col items-center justify-center overflow-hidden">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-pink-700 leading-none mb-0.5 truncate max-w-full">
              {lowFood ? 'Awas Salah Makan!' : 'Salah Makan'}
            </span>
            <div
              className="flex items-center justify-center gap-0.5"
              data-testid="hud-food-chances"
              aria-label={`Sisa kesempatan salah makan ${hud.foodChances} dari 3`}
            >
              <HeartIcon filled={hud.foodChances >= 1} pulse={lowFood} />
              <HeartIcon filled={hud.foodChances >= 2} />
              <HeartIcon filled={hud.foodChances >= 3} />
            </div>
          </div>

          {/* Kesempatan Menabrak Rintangan (3 Shields) */}
          <div className="min-w-0 bg-[#FFFDF9] border-[2.5px] border-sky-400 rounded-2xl px-2 py-1 shadow-[inset_0_2px_0_#fff,0_3px_0_rgba(2,132,199,0.22)] flex flex-col items-center justify-center overflow-hidden">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-sky-700 leading-none mb-0.5 truncate max-w-full">
              {lowCrash ? 'Awas Tabrakan!' : 'Tabrak Rintangan'}
            </span>
            <div
              className="flex items-center justify-center gap-0.5"
              data-testid="hud-crash-chances"
              aria-label={`Sisa kesempatan menabrak rintangan ${hud.crashChances} dari 3`}
            >
              <ShieldIcon filled={hud.crashChances >= 1} pulse={lowCrash} />
              <ShieldIcon filled={hud.crashChances >= 2} />
              <ShieldIcon filled={hud.crashChances >= 3} />
            </div>
          </div>
        </div>

        {hud.tunnelWarning && (
          <div className="text-center px-1">
            <span className="inline-block max-w-full bg-indigo-900 border-2 border-amber-300 text-amber-200 font-display text-[11px] sm:text-xs font-bold px-3 py-0.5 rounded-2xl shadow-[0_3px_0_#312E81] animate-pulse">
              MEMASUKI LORONG GELAP! SIAP HINDARI RINTANGAN!
            </span>
          </div>
        )}
      </div>

      {/* LEVEL UP BANNER (Lv 7..10) */}
      {hud.levelTransitionBanner && (
        <div className="flex flex-col items-center justify-center pointer-events-none my-auto px-2">
          <div
            style={{ '--win-lip': 'rgba(2, 132, 199, 0.28)' } as React.CSSProperties}
            className="kawaii-window animate-banner-bounce max-w-full border-sky-400 rounded-[28px] px-5 py-3 text-center"
          >
            <div className="font-display text-xl sm:text-2xl font-bold text-sky-600 leading-tight">
              KECEPATAN MENINGKAT!
            </div>
            <div className="font-display text-base sm:text-lg font-bold mt-0.5" style={{ color: cfg.accentColor }}>
              {cfg.title} — {cfg.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROL HINT TEXT */}
      <div className="flex justify-center pb-0.5 pointer-events-none max-w-full">
        <div
          data-testid="hud-control-hint"
          className="max-w-full bg-[#FFFDF9]/95 border-2 border-sky-300 rounded-2xl px-3 py-1 shadow-[0_2px_0_rgba(2,132,199,0.2)] text-center"
        >
          <p className="text-[11px] sm:text-xs font-extrabold text-slate-700 leading-tight">
            Geser atas/bawah atau tekan Panah <span className="text-sky-700">↑ ↓</span> / <span className="text-sky-700">W · S</span>
          </p>
        </div>
      </div>
    </div>
  );
}
