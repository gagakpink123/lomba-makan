import type { AudioTrackKey } from './assets';

interface LevelConfig {
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  themeName: string;
  durationSeconds: number;
  targetFoods: number;
  targetLevelScore: number;
  spawnIntervalMin: number;
  spawnIntervalMax: number;
  minSpeed: number;
  maxSpeed: number;
  trapProbability: number;
  mysteryBoxProbability: number;
  maxActiveItems: number;
  bgmKey: AudioTrackKey;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  skyTop: string;
  skyBottom: string;
  hillBack: string;
  hillFront: string;
  groundColor: string;
}

export const LEVEL_DURATION_SECONDS = 60;
export const TOTAL_LEVELS = 5;

export const LEVELS: readonly LevelConfig[] = [
  {
    level: 1,
    title: 'LEVEL 1',
    subtitle: 'PEMULA',
    themeName: 'Sunny Picnic',
    durationSeconds: LEVEL_DURATION_SECONDS,
    targetFoods: 10,
    targetLevelScore: 140,
    spawnIntervalMin: 0.88,
    spawnIntervalMax: 1.20,
    minSpeed: 145,
    maxSpeed: 198,
    trapProbability: 0.18,
    mysteryBoxProbability: 0,
    maxActiveItems: 5,
    bgmKey: 'bgm1',
    accentColor: '#16A34A',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
    skyTop: '#CBEFFF',
    skyBottom: '#EEFBF4',
    hillBack: '#B8ECC9',
    hillFront: '#94DFAD',
    groundColor: '#7BD39B',
  },
  {
    level: 2,
    title: 'LEVEL 2',
    subtitle: 'MULAI MENANTANG',
    themeName: 'Candy Garden',
    durationSeconds: LEVEL_DURATION_SECONDS,
    targetFoods: 15,
    targetLevelScore: 220,
    spawnIntervalMin: 0.68,
    spawnIntervalMax: 0.96,
    minSpeed: 195,
    maxSpeed: 260,
    trapProbability: 0.24,
    mysteryBoxProbability: 0.14,
    maxActiveItems: 7,
    bgmKey: 'bgm2',
    accentColor: '#DB2777',
    badgeBg: '#FCE7F3',
    badgeText: '#9D174D',
    skyTop: '#FFDDF0',
    skyBottom: '#F5E8FF',
    hillBack: '#FFC8E2',
    hillFront: '#FBB1D6',
    groundColor: '#F497C6',
  },
  {
    level: 3,
    title: 'LEVEL 3',
    subtitle: 'MAKIN SERU',
    themeName: 'Happy Fruit Market',
    durationSeconds: LEVEL_DURATION_SECONDS,
    targetFoods: 20,
    targetLevelScore: 310,
    spawnIntervalMin: 0.54,
    spawnIntervalMax: 0.78,
    minSpeed: 250,
    maxSpeed: 330,
    trapProbability: 0.30,
    mysteryBoxProbability: 0.18,
    maxActiveItems: 8,
    bgmKey: 'bgm3',
    accentColor: '#EA580C',
    badgeBg: '#FFEDD5',
    badgeText: '#9A3412',
    skyTop: '#FFF1C9',
    skyBottom: '#FFE4CE',
    hillBack: '#DCEEB2',
    hillFront: '#BEE08E',
    groundColor: '#A3D16F',
  },
  {
    level: 4,
    title: 'LEVEL 4',
    subtitle: 'SUPER CEPAT',
    themeName: 'Bubble Dessert World',
    durationSeconds: LEVEL_DURATION_SECONDS,
    targetFoods: 25,
    targetLevelScore: 400,
    spawnIntervalMin: 0.42,
    spawnIntervalMax: 0.62,
    minSpeed: 310,
    maxSpeed: 405,
    trapProbability: 0.36,
    mysteryBoxProbability: 0.21,
    maxActiveItems: 10,
    bgmKey: 'bgm4',
    accentColor: '#7C3AED',
    badgeBg: '#EDE9FE',
    badgeText: '#5B21B6',
    skyTop: '#D6ECFF',
    skyBottom: '#EFE4FF',
    hillBack: '#D8C9FA',
    hillFront: '#C3AEF5',
    groundColor: '#AE95EC',
  },
  {
    level: 5,
    title: 'LEVEL 5',
    subtitle: 'RAJA GIZI',
    themeName: 'Grand Food Festival',
    durationSeconds: LEVEL_DURATION_SECONDS,
    targetFoods: 30,
    targetLevelScore: 500,
    spawnIntervalMin: 0.33,
    spawnIntervalMax: 0.50,
    minSpeed: 370,
    maxSpeed: 480,
    trapProbability: 0.42,
    mysteryBoxProbability: 0.24,
    maxActiveItems: 11,
    bgmKey: 'bgm5',
    accentColor: '#E11D48',
    badgeBg: '#FFE4E6',
    badgeText: '#9F1239',
    skyTop: '#FFD6EA',
    skyBottom: '#FFF3C4',
    hillBack: '#BCE4FF',
    hillFront: '#93D4FF',
    groundColor: '#73C2FB',
  },
] as const;

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.max(1, Math.min(TOTAL_LEVELS, Math.round(level)));
  return LEVELS[clamped - 1];
}

type GameSection = 1 | 2;

interface Section2LevelConfig {
  level: 6 | 7 | 8 | 9 | 10;
  title: string;
  subtitle: string;
  themeName: string;
  baseScrollSpeed: number;
  maxScrollSpeed: number;
  scoreAdvanceStep: number;
  spawnIntervalMin: number;
  spawnIntervalMax: number;
  trapProbability: number;
  mysteryBoxProbability: number;
  obstacleGapHeight: number;
  bgmKey: AudioTrackKey;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  skyTop: string;
  skyBottom: string;
  hillBack: string;
  hillFront: string;
}

export const SECTION2_MIN_LEVEL = 6;
export const SECTION2_MAX_LEVEL = 10;

export const SECTION2_LEVELS: readonly Section2LevelConfig[] = [
  {
    level: 6,
    title: 'LEVEL 6',
    subtitle: 'TERBANG CERIA',
    themeName: 'Langit Pagi Cerah',
    baseScrollSpeed: 235,
    maxScrollSpeed: 310,
    scoreAdvanceStep: 200,
    spawnIntervalMin: 0.72,
    spawnIntervalMax: 1.04,
    trapProbability: 0.22,
    mysteryBoxProbability: 0.14,
    obstacleGapHeight: 224,
    bgmKey: 'bgm1',
    accentColor: '#0284C7',
    badgeBg: '#E0F2FE',
    badgeText: '#075985',
    skyTop: '#93E2FE',
    skyBottom: '#E0F7FF',
    hillBack: '#A7F3D0',
    hillFront: '#6EE7B7',
  },
  {
    level: 7,
    title: 'LEVEL 7',
    subtitle: 'AWAN PELANGI',
    themeName: 'Negeri Pelangi',
    baseScrollSpeed: 275,
    maxScrollSpeed: 355,
    scoreAdvanceStep: 260,
    spawnIntervalMin: 0.62,
    spawnIntervalMax: 0.92,
    trapProbability: 0.26,
    mysteryBoxProbability: 0.16,
    obstacleGapHeight: 208,
    bgmKey: 'bgm2',
    accentColor: '#DB2777',
    badgeBg: '#FCE7F3',
    badgeText: '#9D174D',
    skyTop: '#BAE6FD',
    skyBottom: '#FDF2F8',
    hillBack: '#FBCFE8',
    hillFront: '#F9A8D4',
  },
  {
    level: 8,
    title: 'LEVEL 8',
    subtitle: 'AKSI AKROBAT',
    themeName: 'Lembah Senja',
    baseScrollSpeed: 315,
    maxScrollSpeed: 405,
    scoreAdvanceStep: 320,
    spawnIntervalMin: 0.54,
    spawnIntervalMax: 0.80,
    trapProbability: 0.30,
    mysteryBoxProbability: 0.18,
    obstacleGapHeight: 194,
    bgmKey: 'bgm3',
    accentColor: '#EA580C',
    badgeBg: '#FFEDD5',
    badgeText: '#9A3412',
    skyTop: '#FDBA74',
    skyBottom: '#FEF3C7',
    hillBack: '#FDA4AF',
    hillFront: '#FB7185',
  },
  {
    level: 9,
    title: 'LEVEL 9',
    subtitle: 'TURBO GIZI',
    themeName: 'Sakura Bintang',
    baseScrollSpeed: 355,
    maxScrollSpeed: 455,
    scoreAdvanceStep: 380,
    spawnIntervalMin: 0.46,
    spawnIntervalMax: 0.70,
    trapProbability: 0.34,
    mysteryBoxProbability: 0.20,
    obstacleGapHeight: 184,
    bgmKey: 'bgm4',
    accentColor: '#7C3AED',
    badgeBg: '#EDE9FE',
    badgeText: '#5B21B6',
    skyTop: '#C7D2FE',
    skyBottom: '#FBCFE8',
    hillBack: '#C4B5FD',
    hillFront: '#A78BFA',
  },
  {
    level: 10,
    title: 'LEVEL 10',
    subtitle: 'SUPERHERO SEJATI',
    themeName: 'Angkasa Raya',
    baseScrollSpeed: 395,
    maxScrollSpeed: 540,
    scoreAdvanceStep: 450,
    spawnIntervalMin: 0.40,
    spawnIntervalMax: 0.62,
    trapProbability: 0.37,
    mysteryBoxProbability: 0.22,
    obstacleGapHeight: 174,
    bgmKey: 'bgm5',
    accentColor: '#E11D48',
    badgeBg: '#FFE4E6',
    badgeText: '#9F1239',
    skyTop: '#FDE68A',
    skyBottom: '#FBCFE8',
    hillBack: '#93C5FD',
    hillFront: '#60A5FA',
  },
] as const;

export function getSectionForLevel(level: number): GameSection {
  return Math.round(level) >= SECTION2_MIN_LEVEL ? 2 : 1;
}

export function getSection2LevelConfig(level: number): Section2LevelConfig {
  const clamped = Math.max(SECTION2_MIN_LEVEL, Math.min(SECTION2_MAX_LEVEL, Math.round(level)));
  return SECTION2_LEVELS[clamped - SECTION2_MIN_LEVEL];
}

export function getSection2LevelForScore(startLevel: number, runScore: number): number {
  let lvl = Math.max(SECTION2_MIN_LEVEL, Math.min(SECTION2_MAX_LEVEL, Math.round(startLevel)));
  let accumulated = 0;
  while (lvl < SECTION2_MAX_LEVEL) {
    const cfg = getSection2LevelConfig(lvl);
    accumulated += cfg.scoreAdvanceStep;
    if (runScore < accumulated) break;
    lvl += 1;
  }
  return lvl;
}
