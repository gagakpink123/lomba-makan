import React, { useState } from 'react';
import {
  CHARACTER_SPRITES,
  FLYER_SPRITES,
  FOOD_SPRITES,
  TRAP_SPRITES,
  type FoodCategory,
  type FoodId,
} from '../game/assets';
import type { AudioSettings } from '../game/audio';
import {
  getLevelConfig,
  getSection2LevelConfig,
  getSectionForLevel,
  LEVELS,
  SECTION2_LEVELS,
  TOTAL_LEVELS,
} from '../game/levels';
import { TRAP_SCORE_PENALTY } from '../game/rules';

interface InstructionsModalProps {
  startLevel?: number;
  onStart: () => void;
  onClose: () => void;
}

export function InstructionsModal({ startLevel = 1, onStart, onClose }: InstructionsModalProps) {
  const isSection2 = getSectionForLevel(startLevel) === 2;
  const startCfg = isSection2
    ? getSection2LevelConfig(startLevel)
    : getLevelConfig(startLevel);
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-pink-950/45 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-instructions-title"
    >
      <div
        style={{ '--win-lip': isSection2 ? 'rgba(2, 132, 199, 0.32)' : 'rgba(245, 158, 11, 0.32)' } as React.CSSProperties}
        className={`kawaii-window animate-pop-in w-full max-w-[392px] max-h-full overflow-y-auto rounded-[28px] p-4 sm:p-5 text-slate-800 ${
          isSection2 ? 'border-sky-400' : 'border-amber-400'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 mb-3 pb-2.5 border-b-2 border-dashed ${
            isSection2 ? 'border-sky-200' : 'border-amber-200'
          }`}
        >
          <div className="min-w-0">
            <h2
              id="modal-instructions-title"
              className={`font-display text-xl sm:text-2xl font-bold leading-tight ${
                isSection2 ? 'text-sky-700' : 'text-rose-600'
              }`}
            >
              {isSection2 ? 'Cara Bermain · Bagian 2' : 'Cara Bermain'}
            </h2>
            <p className="text-[11px] font-extrabold text-slate-600 mt-0.5 truncate">
              Mulai dari {startCfg.title} · {startCfg.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup petunjuk"
            style={{ '--btn-lip': isSection2 ? '#0284C7' : '#D97706' } as React.CSSProperties}
            className={`kawaii-icon-btn w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full font-black flex items-center justify-center cursor-pointer ${
              isSection2
                ? 'bg-[#E0F2FE] hover:bg-[#BAE6FD] border-sky-400 text-sky-900'
                : 'bg-[#FEF3C7] hover:bg-[#FDE68A] border-amber-400 text-amber-900'
            }`}
          >
            ✕
          </button>
        </div>

        {isSection2 ? (
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm font-bold text-slate-700 leading-snug mb-3.5 sm:mb-4">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-sky-500 border border-sky-700 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#0369A1]">1</span>
              <span>Geser layar atas/bawah atau tekan Panah ↑ ↓ / W · S untuk menerbangkan Superhero.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-emerald-500 border border-emerald-700 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#15803D]">2</span>
              <span>Makan makanan bergizi (+10 s.d. +25 poin) yang muncul hingga 3 baris!</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-rose-500 border border-rose-700 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#BE123C]">3</span>
              <span>Hindari jebakan non-makanan (maks 3× Salah Makan) &amp; buka Mistery Box (?).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-indigo-600 border border-indigo-900 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#312E81]">4</span>
              <span>Saat masuk Lorong Gelap, hindari rintangan stalaktit/pilar (maks 3× Tabrak, kebal kedip 1,5 detik).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-amber-400 border border-amber-700 text-amber-950 text-xs flex items-center justify-center font-black shadow-[0_2px_0_#D97706]">5</span>
              <span>Kejar High Score tertinggi! Game berakhir jika salah satu kesempatan habis.</span>
            </li>
          </ul>
        ) : (
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm font-bold text-slate-700 leading-snug mb-3.5 sm:mb-4">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-emerald-500 border border-emerald-700 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#15803D]">1</span>
              <span>Geser layar kiri/kanan atau tekan Panah ← → / A · D untuk bergerak.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-emerald-500 border border-emerald-700 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#15803D]">2</span>
              <span>Tangkap makanan bergizi dengan kepala (leher ke atas) untuk skor +10 hingga +25 poin! Jika kena badan, karakter jadi kesal.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-rose-500 border border-rose-700 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#BE123C]">3</span>
              <span>Hindari benda jebakan! Salah makan mengurangi {TRAP_SCORE_PENALTY} skor, 1 hati, dan memicu efek 3× Tuing.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-amber-400 border border-amber-700 text-amber-950 text-xs flex items-center justify-center font-black shadow-[0_2px_0_#D97706]">4</span>
              <span>Penuhi target makanan &amp; target skor level dalam 60 detik (maksimal 3× salah tiap level).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-lg bg-sky-500 border border-sky-700 text-white text-xs flex items-center justify-center font-black shadow-[0_2px_0_#0369A1]">5</span>
              <span>Tuntaskan {TOTAL_LEVELS} level untuk menang! Di level 2–{TOTAL_LEVELS} muncul Mistery Box (bonus gizi atau jebakan).</span>
            </li>
          </ul>
        )}

        {/* Mini visual legend using authentic reference sprites */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="min-w-0 rounded-2xl bg-[#ECFDF5] border-[2.5px] border-emerald-300 p-2 shadow-[0_3px_0_rgba(16,185,129,0.18)]">
            <p className="text-[11px] sm:text-xs font-black text-emerald-800 mb-1.5 text-center">
              Makanan (+10 s.d. +25)
            </p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <img src={FOOD_SPRITES.ikan.src} alt="Ikan Segar (+25)" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
              <img src={FOOD_SPRITES.telur.src} alt="Telur Rebus (+20)" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
              <img src={FOOD_SPRITES.brokoli.src} alt="Brokoli (+15)" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
              <img src={FOOD_SPRITES.jeruk.src} alt="Jeruk (+12)" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
            </div>
          </div>
          <div className="min-w-0 rounded-2xl bg-[#FFF1F2] border-[2.5px] border-rose-300 p-2 shadow-[0_3px_0_rgba(244,63,94,0.18)]">
            <p className="text-[11px] sm:text-xs font-black text-rose-800 mb-1.5 text-center">
              Jebakan (-{TRAP_SCORE_PENALTY} Skor)
            </p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <img src={TRAP_SPRITES.batuBata.src} alt="Batu bata" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
              <img src={TRAP_SPRITES.palu.src} alt="Palu" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
              <img src={TRAP_SPRITES.granat.src} alt="Granat" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
              <img src={TRAP_SPRITES.tabungGas.src} alt="Tabung Gas" referrerPolicy="no-referrer" className="w-7 h-7 object-contain" />
            </div>
          </div>
        </div>

        <button
          type="button"
          data-start="true"
          onClick={onStart}
          style={{ '--btn-lip': isSection2 ? '#0369A1' : '#15803D' } as React.CSSProperties}
          className={`kawaii-btn w-full py-3 rounded-[20px] text-white font-display text-xl font-bold tracking-wide cursor-pointer ${
            isSection2
              ? 'bg-sky-500 hover:bg-sky-400 border-sky-700'
              : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-700'
          }`}
        >
          {startCfg.level > 1 ? `MULAI LEVEL ${startCfg.level}!` : 'MULAI!'}
        </button>
      </div>
    </div>
  );
}

type CatalogFilter = 'Semua' | FoodCategory;

const CATALOG_FILTERS: readonly CatalogFilter[] = [
  'Semua',
  'Protein',
  'Sayuran',
  'Buah',
  'Karbo & Susu',
];

const FOOD_CATALOG_IDS: readonly FoodId[] = (
  Object.keys(FOOD_SPRITES) as FoodId[]
).sort((a, b) => FOOD_SPRITES[b].points - FOOD_SPRITES[a].points);

export function FoodCatalogModal({ onClose }: { onClose: () => void }) {
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>('Semua');

  const visibleIds = FOOD_CATALOG_IDS.filter(
    (id) => activeFilter === 'Semua' || FOOD_SPRITES[id].category === activeFilter,
  );

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-pink-950/45 p-2.5 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-catalog-title"
    >
      <div
        style={{ '--win-lip': 'rgba(16, 185, 129, 0.30)' } as React.CSSProperties}
        className="kawaii-window animate-pop-in w-full max-w-[740px] max-h-full flex flex-col rounded-[28px] border-emerald-400 p-3.5 sm:p-5 text-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2.5 pb-2.5 border-b-2 border-dashed border-emerald-200 shrink-0">
          <div className="min-w-0">
            <h2 id="modal-catalog-title" className="font-display text-xl sm:text-2xl font-bold text-emerald-700 leading-tight">
              Katalog Makanan Bergizi
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-600 mt-0.5">
              Kenali kandungan gizi &amp; manfaatnya bagi pertumbuhan tubuhmu ({visibleIds.length} item).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup katalog makanan"
            style={{ '--btn-lip': '#059669' } as React.CSSProperties}
            className="kawaii-icon-btn w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-[#D1FAE5] hover:bg-[#A7F3D0] border-emerald-400 text-emerald-900 font-black flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 shrink-0"
          role="tablist"
          aria-label="Filter kategori makanan"
        >
          {CATALOG_FILTERS.map((cat) => {
            const active = activeFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-emerald-500 border-emerald-700 text-white shadow-[0_2px_0_#15803D]'
                    : 'bg-[#F8FAFC] border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Scrollable Nutrition Cards */}
        <div
          data-testid="catalog-grid"
          className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-2.5"
        >
          {visibleIds.map((id) => {
            const item = FOOD_SPRITES[id];
            return (
              <article
                key={id}
                className="flex items-start gap-3 rounded-2xl bg-[#FFFDF9] border-2 border-amber-200 p-2.5 sm:p-3 shadow-[0_2px_0_rgba(217,119,6,0.12)]"
              >
                <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-2xl bg-[#FFF7ED] border border-amber-200 flex items-center justify-center p-1.5">
                  <img
                    src={item.src}
                    alt={item.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                      {item.label}
                    </h3>
                    <span className="font-display text-xs sm:text-sm font-bold text-emerald-700 tabular-nums whitespace-nowrap shrink-0">
                      +{item.points} Poin
                    </span>
                  </div>
                  <div className="text-[11px] font-extrabold text-pink-700">
                    {item.category} <span aria-hidden="true">·</span> {item.nutritionTier}
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-slate-700 leading-snug">
                    <span className="text-amber-800 font-black">Gizi:</span> {item.nutrients}
                  </p>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-600 leading-snug">
                    <span className="text-emerald-800 font-black">Manfaat:</span> {item.benefits}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-2 border-t-2 border-dashed border-emerald-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            style={{ '--btn-lip': '#059669' } as React.CSSProperties}
            className="kawaii-btn w-full sm:w-auto sm:min-w-[200px] sm:mx-auto sm:block py-2 px-6 rounded-[18px] bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white font-display text-base sm:text-lg font-bold cursor-pointer"
          >
            TUTUP KATALOG
          </button>
        </div>
      </div>
    </div>
  );
}

interface SoundSettingsModalProps {
  settings: AudioSettings;
  onChangeMusic: (v: number) => void;
  onChangeSfx: (v: number) => void;
  onToggleMute: () => void;
  onClose: () => void;
}

export function SoundSettingsModal({
  settings,
  onChangeMusic,
  onChangeSfx,
  onToggleMute,
  onClose,
}: SoundSettingsModalProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-pink-950/45 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sound-title"
    >
      <div
        style={{ '--win-lip': 'rgba(2, 132, 199, 0.28)' } as React.CSSProperties}
        className="kawaii-window animate-pop-in w-full max-w-[340px] max-h-full overflow-y-auto rounded-[28px] border-sky-400 p-4 sm:p-5 text-slate-800"
      >
        <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b-2 border-dashed border-sky-200">
          <h2 id="modal-sound-title" className="font-display text-xl sm:text-2xl font-bold text-sky-700">
            Pengaturan Suara
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan suara"
            style={{ '--btn-lip': '#0284C7' } as React.CSSProperties}
            className="kawaii-icon-btn w-9 h-9 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] border-sky-400 text-sky-900 font-black flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-5">
          <div>
            <div className="flex items-center justify-between text-sm font-extrabold mb-1.5">
              <label htmlFor="music-volume-slider">Volume Musik Latar</label>
              <span className="tabular-nums text-sky-700">{Math.round(settings.musicVolume * 100)}%</span>
            </div>
            <input
              id="music-volume-slider"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.musicVolume * 100)}
              onChange={(e) => onChangeMusic(Number(e.target.value) / 100)}
              className="kawaii-slider w-full text-sky-500 bg-sky-100 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm font-extrabold mb-1.5">
              <label htmlFor="sfx-volume-slider">Volume Efek Suara</label>
              <span className="tabular-nums text-rose-600">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <input
              id="sfx-volume-slider"
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => onChangeSfx(Number(e.target.value) / 100)}
              className="kawaii-slider w-full text-rose-500 bg-rose-100 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t-2 border-dashed border-slate-200">
            <span className="text-sm font-extrabold text-slate-700">Status Audio</span>
            <button
              type="button"
              onClick={onToggleMute}
              style={{ '--btn-lip': settings.muted ? '#BE123C' : '#059669' } as React.CSSProperties}
              className={`kawaii-icon-btn px-4 py-1.5 rounded-xl text-sm font-extrabold cursor-pointer ${
                settings.muted
                  ? 'bg-[#FFE4E6] text-rose-700 border-rose-400 hover:bg-[#FECDD3]'
                  : 'bg-[#D1FAE5] text-emerald-800 border-emerald-400 hover:bg-[#A7F3D0]'
              }`}
            >
              {settings.muted ? 'Suara Dibisukan' : 'Suara Aktif'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{ '--btn-lip': '#0369A1' } as React.CSSProperties}
          className="kawaii-btn w-full py-2.5 rounded-[20px] bg-sky-500 hover:bg-sky-400 border-sky-700 text-white font-display text-lg font-bold cursor-pointer"
        >
          SIMPAN &amp; TUTUP
        </button>
      </div>
    </div>
  );
}

interface PauseModalProps {
  level: number;
  score: number;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function PauseModal({ level, score, onResume, onRestart, onMainMenu }: PauseModalProps) {
  const isSection2 = getSectionForLevel(level) === 2;
  const cfg = isSection2 ? getSection2LevelConfig(level) : getLevelConfig(level);
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-pink-950/45 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-pause-title"
    >
      <div
        style={{ '--win-lip': 'rgba(217, 119, 6, 0.3)' } as React.CSSProperties}
        className="kawaii-window animate-pop-in w-full max-w-[325px] max-h-full overflow-y-auto rounded-[28px] border-amber-400 p-5 sm:p-6 text-center"
      >
        <h2 id="modal-pause-title" className="font-display text-2xl sm:text-3xl font-bold text-amber-700 mb-1">
          PERMAINAN DIJEDA
        </h2>
        <p className="text-sm font-extrabold text-slate-500 mb-4 tabular-nums">
          {cfg.title} · Skor: {score}
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onResume}
            style={{ '--btn-lip': '#15803D' } as React.CSSProperties}
            className="kawaii-btn w-full py-3 rounded-[20px] bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white font-display text-xl font-bold cursor-pointer"
          >
            LANJUTKAN
          </button>
          <button
            type="button"
            onClick={onRestart}
            style={{ '--btn-lip': '#D97706' } as React.CSSProperties}
            className="kawaii-btn w-full py-2.5 rounded-[20px] bg-amber-300 hover:bg-amber-200 border-amber-600 text-amber-950 font-display text-lg font-bold cursor-pointer"
          >
            ULANGI
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            style={{ '--btn-lip': '#BE123C' } as React.CSSProperties}
            className="kawaii-btn w-full py-2.5 rounded-[20px] bg-[#FFE4E6] hover:bg-[#FECDD3] border-rose-400 text-rose-800 font-display text-lg font-bold cursor-pointer"
          >
            MENU UTAMA
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  score: number;
  levelReached: number;
  foodsEaten: number;
  highScore?: number;
  isNewRecord?: boolean;
  reason?: 'mistakes' | 'timeout' | 'crash';
  onRetry: () => void;
  onMainMenu: () => void;
}

export function GameOverModal({
  score,
  levelReached,
  foodsEaten,
  highScore,
  isNewRecord = false,
  reason = 'mistakes',
  onRetry,
  onMainMenu,
}: GameOverModalProps) {
  const isSection2 = getSectionForLevel(levelReached) === 2;
  const cfg = isSection2
    ? getSection2LevelConfig(levelReached)
    : getLevelConfig(levelReached);

  const spriteSrc = isSection2
    ? reason === 'crash'
      ? FLYER_SPRITES.flyerNabrak
      : FLYER_SPRITES.flyerSalahMakan
    : CHARACTER_SPRITES.salahMakan;

  const heading =
    reason === 'timeout'
      ? 'WAKTU HABIS!'
      : reason === 'crash'
        ? 'NABRAK RINTANGAN!'
        : 'YAH, KALAH!';

  const message =
    reason === 'timeout'
      ? `Target ${cfg.title} belum terpenuhi sebelum waktu habis. Ayo coba lebih cepat!`
      : reason === 'crash'
        ? 'Kesempatan menabrak rintangan di Lorong Gelap sudah habis! Ayo terbang lebih sigap!'
        : 'Aduh, benda jebakan termakan 3 kali! Jangan menyerah, ayo coba lagi!';

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-rose-950/50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-gameover-title"
    >
      <div
        style={{ '--win-lip': 'rgba(225, 29, 72, 0.3)' } as React.CSSProperties}
        className="kawaii-window animate-pop-in w-full max-w-[356px] max-h-full overflow-y-auto rounded-[28px] border-rose-400 p-4 sm:p-5 text-center"
      >
        <h2 id="modal-gameover-title" className="font-display text-2xl sm:text-3xl font-bold text-rose-600 mb-1">
          {heading}
        </h2>

        {isNewRecord && (
          <div className="inline-block bg-amber-400 border-2 border-amber-700 text-amber-950 font-display text-xs font-bold px-3 py-0.5 rounded-xl mb-1 shadow-[0_2px_0_#D97706]">
            REKOR HIGH SCORE BARU!
          </div>
        )}

        <div className="flex justify-center my-2">
          <img
            src={spriteSrc}
            alt={reason === 'crash' ? 'Superhero menabrak rintangan' : 'Karakter salah makan'}
            referrerPolicy="no-referrer"
            className="h-28 sm:h-32 w-auto object-contain animate-banner-bounce drop-shadow-md"
          />
        </div>

        <p className="text-sm font-bold text-slate-600 mb-4 px-2">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="rounded-2xl bg-[#FFFBEB] border-[2.5px] border-amber-300 p-2.5 shadow-[0_3px_0_rgba(217,119,6,0.18)]">
            <div className="text-[11px] font-black text-amber-700 uppercase">Skor Akhir</div>
            <div className="font-display text-2xl font-bold text-amber-950 tabular-nums">{score}</div>
            {isSection2 && typeof highScore === 'number' && (
              <div className="text-[11px] font-extrabold text-purple-700 tabular-nums">
                Terbaik: {highScore}
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-[#FFF1F2] border-[2.5px] border-rose-300 p-2.5 shadow-[0_3px_0_rgba(225,29,72,0.18)]">
            <div className="text-[11px] font-black text-rose-700 uppercase">Level Terakhir</div>
            <div className="font-display text-xl font-bold text-rose-900 tabular-nums">
              {cfg.title}
            </div>
            <div className="text-[11px] font-extrabold text-rose-600 tabular-nums">{foodsEaten} makanan</div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRetry}
            style={{ '--btn-lip': '#15803D' } as React.CSSProperties}
            className="kawaii-btn w-full py-3 rounded-[20px] bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white font-display text-xl font-bold cursor-pointer"
          >
            COBA LAGI
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            style={{ '--btn-lip': '#64748B' } as React.CSSProperties}
            className="kawaii-btn w-full py-2.5 rounded-[20px] bg-slate-100 hover:bg-slate-200 border-slate-400 text-slate-700 font-display text-lg font-bold cursor-pointer"
          >
            MENU UTAMA
          </button>
        </div>
      </div>
    </div>
  );
}

interface VictoryModalProps {
  score: number;
  foodsEaten: number;
  onPlayAgain: () => void;
  onStartSection2?: () => void;
  onMainMenu: () => void;
}

export function VictoryModal({
  score,
  foodsEaten,
  onPlayAgain,
  onStartSection2,
  onMainMenu,
}: VictoryModalProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-pink-950/40 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-victory-title"
    >
      <div
        style={{ '--win-lip': 'rgba(245, 158, 11, 0.34)' } as React.CSSProperties}
        className="kawaii-window animate-pop-in w-full max-w-[356px] max-h-full overflow-y-auto rounded-[28px] border-amber-400 p-4 sm:p-5 text-center relative"
      >
        <div className="text-xs font-black tracking-wide text-amber-700 uppercase mb-1">
          Bagian 1 · {TOTAL_LEVELS}/{TOTAL_LEVELS} Level Tuntas
        </div>
        <h2 id="modal-victory-title" className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 leading-tight mb-2">
          SELAMAT! KAMU JUARA!
        </h2>

        <div className="flex justify-center my-2 relative">
          <img
            src={CHARACTER_SPRITES.makan}
            alt="Karakter juara Lomba Makan Bergizi"
            referrerPolicy="no-referrer"
            className="h-32 w-auto object-contain animate-float-slow drop-shadow-md"
          />
        </div>

        <p className="text-sm font-bold text-slate-600 mb-4">
          Hebat! Kamu menaklukkan Bagian 1! Siap terbang di Bagian 2 (Level 6–10)?
        </p>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="rounded-2xl bg-[#FFFBEB] border-[2.5px] border-amber-300 p-2.5 shadow-[0_3px_0_rgba(217,119,6,0.18)]">
            <div className="text-[11px] font-black text-amber-700 uppercase">Skor Akhir</div>
            <div className="font-display text-2xl font-bold text-amber-950 tabular-nums">{score}</div>
          </div>
          <div className="rounded-2xl bg-[#ECFDF5] border-[2.5px] border-emerald-300 p-2.5 shadow-[0_3px_0_rgba(16,185,129,0.18)]">
            <div className="text-[11px] font-black text-emerald-700 uppercase">Total Makanan</div>
            <div className="font-display text-2xl font-bold text-emerald-900 tabular-nums">{foodsEaten}</div>
          </div>
        </div>

        <div className="space-y-2.5">
          {onStartSection2 && (
            <button
              type="button"
              data-start="true"
              onClick={onStartSection2}
              style={{ '--btn-lip': '#0369A1' } as React.CSSProperties}
              className="kawaii-btn w-full py-3 rounded-[20px] bg-sky-500 hover:bg-sky-400 border-sky-700 text-white font-display text-lg font-bold cursor-pointer"
            >
              LANJUT BAGIAN 2 (LEVEL 6)
            </button>
          )}
          <button
            type="button"
            onClick={onPlayAgain}
            style={{ '--btn-lip': '#15803D' } as React.CSSProperties}
            className="kawaii-btn w-full py-2.5 rounded-[20px] bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white font-display text-lg font-bold cursor-pointer"
          >
            MAIN LAGI BAGIAN 1
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            style={{ '--btn-lip': '#64748B' } as React.CSSProperties}
            className="kawaii-btn w-full py-2.5 rounded-[20px] bg-slate-100 hover:bg-slate-200 border-slate-400 text-slate-700 font-display text-lg font-bold cursor-pointer"
          >
            MENU UTAMA
          </button>
        </div>
      </div>
    </div>
  );
}

interface LevelSelectModalProps {
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

export function LevelSelectModal({
  selectedLevel,
  onSelectLevel,
  onClose,
}: LevelSelectModalProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-pink-950/45 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-level-select-title"
      data-testid="level-select-modal"
    >
      <div
        style={{ '--win-lip': 'rgba(219, 39, 119, 0.28)' } as React.CSSProperties}
        className="kawaii-window animate-pop-in w-full max-w-[420px] max-h-full overflow-y-auto rounded-[28px] border-pink-400 p-4 sm:p-5 text-slate-800"
      >
        <div className="flex items-start justify-between gap-2 mb-3.5 pb-2.5 border-b-2 border-dashed border-pink-200">
          <div className="min-w-0">
            <h2
              id="modal-level-select-title"
              className="font-display text-xl sm:text-2xl font-bold text-rose-600 leading-tight"
            >
              Pilih Level Permainan
            </h2>
            <p className="text-[11px] sm:text-xs font-extrabold text-slate-600 mt-0.5">
              Pilih level lalu tekan Mulai Bermain di halaman utama.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela pilihan level"
            style={{ '--btn-lip': '#DB2777' } as React.CSSProperties}
            className="kawaii-icon-btn w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-[#FCE7F3] hover:bg-[#FBCFE8] border-pink-400 text-pink-900 font-black flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Section 1: Level 1-5 */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wide text-rose-700">
              Bagian 1 · Tangkap Makanan
            </span>
            <span className="text-[11px] font-extrabold text-slate-500">Level 1–5</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Pilih level Bagian 1">
            {LEVELS.map((lvlCfg) => {
              const active = selectedLevel === lvlCfg.level;
              return (
                <button
                  key={lvlCfg.level}
                  type="button"
                  data-testid={`level-option-${lvlCfg.level}`}
                  aria-pressed={active}
                  aria-label={`Pilih Level ${lvlCfg.level}: ${lvlCfg.subtitle}`}
                  onClick={() => onSelectLevel(lvlCfg.level)}
                  style={{
                    '--btn-lip': active ? lvlCfg.accentColor : '#F472B6',
                    backgroundColor: active ? lvlCfg.accentColor : '#FFFFFF',
                    borderColor: active ? '#1E293B' : '#F9A8D4',
                    color: active ? '#FFFFFF' : '#831843',
                  } as React.CSSProperties}
                  className="kawaii-icon-btn py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <span className="font-display text-base sm:text-lg font-bold leading-none">
                    {lvlCfg.level}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold leading-none truncate max-w-full ${
                      active ? 'text-white/95' : 'text-pink-700'
                    }`}
                  >
                    Lv {lvlCfg.level}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Level 6-10 */}
        <div className="pt-3 border-t-2 border-dashed border-sky-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wide text-sky-700">
              Bagian 2 · Superhero Terbang
            </span>
            <span className="text-[11px] font-extrabold text-slate-500">Level 6–10</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Pilih level Bagian 2">
            {SECTION2_LEVELS.map((lvlCfg) => {
              const active = selectedLevel === lvlCfg.level;
              return (
                <button
                  key={lvlCfg.level}
                  type="button"
                  data-testid={`level-option-${lvlCfg.level}`}
                  aria-pressed={active}
                  aria-label={`Pilih Level ${lvlCfg.level}: ${lvlCfg.subtitle}`}
                  onClick={() => onSelectLevel(lvlCfg.level)}
                  style={{
                    '--btn-lip': active ? lvlCfg.accentColor : '#38BDF8',
                    backgroundColor: active ? lvlCfg.accentColor : '#FFFFFF',
                    borderColor: active ? '#1E293B' : '#7DD3FC',
                    color: active ? '#FFFFFF' : '#075985',
                  } as React.CSSProperties}
                  className="kawaii-icon-btn py-2 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                >
                  <span className="font-display text-base sm:text-lg font-bold leading-none">
                    {lvlCfg.level}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold leading-none truncate max-w-full ${
                      active ? 'text-white/95' : 'text-sky-700'
                    }`}
                  >
                    Lv {lvlCfg.level}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
