import React, { useEffect, useRef, useState } from 'react';
import { AUDIO_TRACKS, preloadAllSprites, TOTAL_SPRITE_ASSETS } from '../game/assets';
import { audioManager } from '../game/audio';
import { loadSection2HighScore } from '../game/section2Rules';
import { TitleEmblem } from './TitleEmblem';

interface LoadingScreenProps {
  onReady: (highScore: number) => void;
}

const TOTAL_AUDIO_ASSETS = Object.keys(AUDIO_TRACKS).length;
const SETTINGS_STEPS = 2; // Fonts + stored game/audio settings

export function LoadingScreen({ onReady }: LoadingScreenProps) {
  const [spriteLoaded, setSpriteLoaded] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(0);
  const [settingsDone, setSettingsDone] = useState(0);
  const [statusLabel, setStatusLabel] = useState('Menyiapkan aset gambar...');

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const totalItems = TOTAL_SPRITE_ASSETS + TOTAL_AUDIO_ASSETS + SETTINGS_STEPS;
  const completedItems = spriteLoaded + audioLoaded + settingsDone;
  const percent = Math.min(100, Math.round((completedItems / Math.max(1, totalItems)) * 100));

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
        setStatusLabel('Memuat karakter, makanan & rintangan...');
        const spritePromise = preloadAllSprites((done) => {
          if (!cancelled) setSpriteLoaded(done);
        }).catch(() => {
          if (!cancelled) setSpriteLoaded(TOTAL_SPRITE_ASSETS);
        });

        const audioPromise = audioManager
          .preloadAssetBytes((done) => {
            if (!cancelled) setAudioLoaded(done);
          })
          .catch(() => {
            if (!cancelled) setAudioLoaded(TOTAL_AUDIO_ASSETS);
          });

        await Promise.all([spritePromise, audioPromise]);
        if (cancelled) return;

        setStatusLabel('Memuat tipografi & pengaturan game...');
        const fontsReady =
          typeof document !== 'undefined' && document.fonts?.ready
            ? Promise.race([
                document.fonts.ready.then(() => undefined),
                new Promise<void>((resolve) => window.setTimeout(resolve, 1800)),
              ])
            : Promise.resolve();
        await fontsReady;
        if (cancelled) return;
        setSettingsDone(1);

        // Load stored high score before revealing main menu
        const storedHighScore = loadSection2HighScore();
        if (cancelled) return;
        setSettingsDone(2);
        setStatusLabel('Semua aset siap! Membuka menu utama...');

        await new Promise((resolve) => window.setTimeout(resolve, 260));
        if (!cancelled) {
          onReadyRef.current(storedHighScore);
        }
      } catch {
        if (!cancelled) {
          onReadyRef.current(loadSection2HighScore());
        }
      }
    };

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      data-testid="loading-screen"
      className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-[#CBEFFF] via-[#E8FAFF] to-[#B8ECC9] overflow-hidden"
    >
      {/* Decorative soft hills */}
      <svg
        viewBox="0 0 800 180"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0 w-full h-28 sm:h-36 pointer-events-none"
      >
        <path
          d="M0,110 Q200,20 420,95 T800,70 L800,180 L0,180 Z"
          fill="#94DFAD"
          opacity="0.7"
        />
        <path
          d="M0,130 Q260,55 520,120 T800,105 L800,180 L0,180 Z"
          fill="#7BD39B"
        />
      </svg>

      <div className="relative z-10 mt-2 sm:mt-4 w-full">
        <TitleEmblem />
      </div>

      {/* Center Kawaii Loading Window */}
      <div className="relative z-10 w-full max-w-[360px] my-auto">
        <div
          style={{ '--win-lip': 'rgba(219, 39, 119, 0.25)' } as React.CSSProperties}
          className="kawaii-window animate-pop-in rounded-[28px] border-pink-400 p-5 sm:p-6 text-center space-y-4"
        >
          {/* Animated toy badge */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FEF3C7] border-[2.5px] border-amber-400 shadow-[0_3px_0_#D97706] flex items-center justify-center animate-banner-bounce">
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="17" r="10.5" fill="#FDE047" stroke="#B45309" strokeWidth="2.4" />
              <path
                d="M16 4.5L18.2 10.5L24.5 10.8L19.6 14.6L21.3 20.8L16 17.2L10.7 20.8L12.4 14.6L7.5 10.8L13.8 10.5Z"
                fill="#F97316"
                stroke="#9A3412"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-rose-600 leading-tight">
              Memuat Permainan...
            </h2>
            <p
              data-testid="loading-status"
              className="text-xs sm:text-sm font-extrabold text-slate-600 min-h-[20px]"
            >
              {statusLabel}
            </p>
          </div>

          {/* Kawaii Candy Progress Bar */}
          <div className="space-y-1.5">
            <div
              role="progressbar"
              aria-label="Progres memuat aset game"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="w-full h-5 rounded-full bg-pink-100 border-2 border-pink-300 p-0.5 overflow-hidden shadow-inner"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-pink-500 transition-all duration-150 shadow-[inset_0_2px_0_rgba(255,255,255,0.55)]"
                style={{ width: `${Math.max(8, percent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-slate-600 tabular-nums px-1">
              <span>{completedItems}/{totalItems} aset &amp; pengaturan</span>
              <span data-testid="loading-percent" className="text-rose-600 font-display text-sm">
                {percent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="relative z-10 text-[11px] font-extrabold text-emerald-950/80 mb-1">
        © adnanjogja · Lomba Makan Bergizi
      </p>
    </div>
  );
}
