export type CharacterSpriteKey = 'walk1' | 'walk2' | 'makan' | 'salahMakan' | 'sebel';
export type FlyerSpriteKey = 'flyerIdle1' | 'flyerIdle2' | 'flyerMakan' | 'flyerSalahMakan' | 'flyerNabrak';

export type FoodId =
  | 'alpukat'
  | 'ayam'
  | 'bayam'
  | 'brokoli'
  | 'daging'
  | 'ikan'
  | 'jagung'
  | 'jeruk'
  | 'kentang'
  | 'melon'
  | 'pisang'
  | 'pokcoy'
  | 'roti'
  | 'susu'
  | 'telur'
  | 'tempe'
  | 'terong'
  | 'wortel';

export type TrapId =
  | 'batuBata'
  | 'bola'
  | 'boneka'
  | 'granat'
  | 'mobilMainan'
  | 'palu'
  | 'roda'
  | 'tabungGas'
  | 'ultraman';

export type ItemSpriteKey = FoodId | TrapId;

export const CHARACTER_SPRITES: Record<CharacterSpriteKey, string> = {
  walk1: '/assets/aistudio/walk_1_2c8e80f8.png',
  walk2: '/assets/aistudio/walk_2_2d51f048.png',
  makan: '/assets/aistudio/makan_new_77ab1c0e.png',
  salahMakan: '/assets/aistudio/salah_makan_c47808ed.png',
  sebel: '/assets/aistudio/sebel_896fa741.png',
};

export const SUPERHERO_SPRITE = '/assets/aistudio/superhero_a7ba2afc.png';

export const FLYER_SPRITES: Record<FlyerSpriteKey, string> = {
  flyerIdle1: '/assets/aistudio/superhero2_-_idle1_08c44d92.png',
  flyerIdle2: '/assets/aistudio/superhero2_-_idle2_de9ace56.png',
  flyerMakan: '/assets/aistudio/superhero2_-_makan_3b11651d.png',
  flyerSalahMakan: '/assets/aistudio/superhero2_-_salah_makan_b6172c6c.png',
  flyerNabrak: '/assets/aistudio/superhero2_-_nabrak_16000ed9.png',
};

export type FoodCategory =
  | 'Protein'
  | 'Sayuran'
  | 'Buah'
  | 'Karbo & Susu';

interface FoodAssetMeta {
  src: string;
  label: string;
  category: FoodCategory;
  points: number;
  nutritionTier: string;
  nutrients: string;
  benefits: string;
}

export const FOOD_SPRITES: Record<FoodId, FoodAssetMeta> = {
  ikan: {
    src: '/assets/aistudio/ikan_60afa313.png',
    label: 'Ikan Segar',
    category: 'Protein',
    points: 25,
    nutritionTier: 'Gizi Super',
    nutrients: 'Protein Tinggi, Omega-3 (DHA & EPA), Vitamin D, Selenium',
    benefits: 'Mendukung kecerdasan otak, kesehatan mata, serta memperkuat otot dan tulang.',
  },
  daging: {
    src: '/assets/aistudio/daging_548571f5.png',
    label: 'Daging Sapi',
    category: 'Protein',
    points: 25,
    nutritionTier: 'Gizi Super',
    nutrients: 'Protein Lengkap, Zat Besi Heme, Zinc, Vitamin B12',
    benefits: 'Membentuk jaringan otot, mencegah anemia, dan menjaga stamina tubuh saat aktif.',
  },
  telur: {
    src: '/assets/aistudio/telur_new_436de849.png',
    label: 'Telur Rebus',
    category: 'Protein',
    points: 20,
    nutritionTier: 'Protein Padat',
    nutrients: 'Protein Berkualitas, Kolin, Lutein, Vitamin D & B12',
    benefits: 'Membantu perkembangan sel otak, daya ingat, dan pertumbuhan tinggi badan.',
  },
  susu: {
    src: '/assets/aistudio/susu_07904b6b.png',
    label: 'Susu Segar',
    category: 'Karbo & Susu',
    points: 20,
    nutritionTier: 'Tulang Kuat',
    nutrients: 'Kalsium Tinggi, Vitamin D, Fosfor, Protein Susu',
    benefits: 'Mengoptimalkan pertumbuhan tulang dan gigi agar padat, kuat, dan sehat.',
  },
  alpukat: {
    src: '/assets/aistudio/alpukat_9667e2de.png',
    label: 'Alpukat',
    category: 'Buah',
    points: 20,
    nutritionTier: 'Lemak Sehat',
    nutrients: 'Lemak Tak Jenuh Tunggal, Folat, Kalium, Vitamin E, Serat',
    benefits: 'Menjaga kesehatan jantung, membantu penyerapan vitamin, dan menutrisi otak.',
  },
  ayam: {
    src: '/assets/aistudio/ayam_83c5615a.png',
    label: 'Ayam Goreng',
    category: 'Protein',
    points: 20,
    nutritionTier: 'Protein Tinggi',
    nutrients: 'Protein Hewani, Niasin (Vit B3), Vitamin B6, Fosfor',
    benefits: 'Menambah massa otot, mempercepat pemulihan energi, dan menunjang pertumbuhan.',
  },
  brokoli: {
    src: '/assets/aistudio/brokoli_8b6fdb59.png',
    label: 'Brokoli',
    category: 'Sayuran',
    points: 15,
    nutritionTier: 'Kaya Serat',
    nutrients: 'Vitamin C, Vitamin K, Folat, Serat, Antioksidan Sulforafana',
    benefits: 'Meningkatkan daya tahan tubuh, menjaga kesehatan pencernaan, dan menguatkan tulang.',
  },
  bayam: {
    src: '/assets/aistudio/bayam_214cf460.png',
    label: 'Bayam Segar',
    category: 'Sayuran',
    points: 15,
    nutritionTier: 'Kaya Zat Besi',
    nutrients: 'Zat Besi, Vitamin A, Vitamin K, Asam Folat, Magnesium',
    benefits: 'Membantu pembentukan sel darah merah, menjaga ketajaman mata, dan memberi tenaga.',
  },
  tempe: {
    src: '/assets/aistudio/tempe_new_0f7548a3.png',
    label: 'Tempe Goreng',
    category: 'Protein',
    points: 15,
    nutritionTier: 'Protein Nabati',
    nutrients: 'Protein Nabati Fermentasi, Probiotik Alami, Kalsium, Vitamin B',
    benefits: 'Menyehatkan usus, membangun otot dari sumber nabati, dan mudah dicerna tubuh.',
  },
  wortel: {
    src: '/assets/aistudio/wortel_97e0f5ac.png',
    label: 'Wortel',
    category: 'Sayuran',
    points: 15,
    nutritionTier: 'Mata Sehat',
    nutrients: 'Beta-Karoten (Pro-Vitamin A), Serat, Kalium, Vitamin K1',
    benefits: 'Menjaga kesehatan penglihatan, memperhalus kulit, dan memperkuat sistem imun.',
  },
  pokcoy: {
    src: '/assets/aistudio/pokcoy_5faa80ba.png',
    label: 'Pokcoy',
    category: 'Sayuran',
    points: 15,
    nutritionTier: 'Vitamin Lengkap',
    nutrients: 'Vitamin A, Vitamin C, Vitamin K, Kalsium Nabati, Kalium',
    benefits: 'Menjaga kesegaran sel tubuh, membantu pertumbuhan tulang, dan memperlancar pencernaan.',
  },
  jeruk: {
    src: '/assets/aistudio/jeruk_db334931.png',
    label: 'Jeruk',
    category: 'Buah',
    points: 12,
    nutritionTier: 'Tinggi Vit C',
    nutrients: 'Vitamin C Tinggi, Antioksidan Flavonoid, Folat, Kalium',
    benefits: 'Melindungi tubuh dari infeksi, mempercepat penyembuhan luka, dan menyegarkan badan.',
  },
  pisang: {
    src: '/assets/aistudio/pisang_5073cfe6.png',
    label: 'Pisang',
    category: 'Buah',
    points: 12,
    nutritionTier: 'Energi Cepat',
    nutrients: 'Kalium, Vitamin B6, Karbohidrat Alami, Serat Pektin',
    benefits: 'Memberi energi cepat sebelum beraktivitas serta menjaga fungsi otot dan saraf.',
  },
  melon: {
    src: '/assets/aistudio/melon_bdfa194f.png',
    label: 'Melon',
    category: 'Buah',
    points: 12,
    nutritionTier: 'Hidrasi Segar',
    nutrients: 'Kadar Air Tinggi, Vitamin C, Vitamin A, Kalium',
    benefits: 'Mencegah dehidrasi, menjaga metabolisme tubuh tetap segar, dan menyehatkan kulit.',
  },
  terong: {
    src: '/assets/aistudio/terong_53c39873.png',
    label: 'Terong Ungu',
    category: 'Sayuran',
    points: 12,
    nutritionTier: 'Antioksidan',
    nutrients: 'Antosianin, Serat Pangan, Mangan, Vitamin B6',
    benefits: 'Melindungi sel tubuh dari radikal bebas dan membantu melancarkan pencernaan.',
  },
  kentang: {
    src: '/assets/aistudio/kentang_new_392b6483_f7644b37.png',
    label: 'Kentang',
    category: 'Karbo & Susu',
    points: 10,
    nutritionTier: 'Sumber Tenaga',
    nutrients: 'Karbohidrat Kompleks, Kalium, Vitamin C, Vitamin B6',
    benefits: 'Menjadi sumber energi tahan lama untuk belajar, bermain, dan pertumbuhan fisik.',
  },
  jagung: {
    src: '/assets/aistudio/jagung_3056e84b.png',
    label: 'Jagung Manis',
    category: 'Karbo & Susu',
    points: 10,
    nutritionTier: 'Energi & Serat',
    nutrients: 'Karbohidrat, Serat Pangan, Lutein, Zeaxanthin, Vitamin B',
    benefits: 'Menghasilkan tenaga harian serta membantu menjaga kesehatan mata dan pencernaan.',
  },
  roti: {
    src: '/assets/aistudio/roti_1385deb6.png',
    label: 'Roti Tawar',
    category: 'Karbo & Susu',
    points: 10,
    nutritionTier: 'Karbo Praktis',
    nutrients: 'Karbohidrat, Vitamin B1 & B3, Zat Besi',
    benefits: 'Memberikan asupan energi cepat sebagai bahan bakar aktivitas tubuh sehari-hari.',
  },
};

export const WEIGHTED_FOOD_POOL: readonly FoodId[] = [
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
] as const;

export const TRAP_SPRITES: Record<TrapId, { src: string; label: string }> = {
  batuBata: {
    src: '/assets/aistudio/batu_bata_new_bf54b700.png',
    label: 'Batu Bata',
  },
  bola: {
    src: '/assets/aistudio/bola_new_5bf7205c.png',
    label: 'Bola',
  },
  boneka: {
    src: '/assets/aistudio/boneka_1fd01f08.png',
    label: 'Boneka',
  },
  granat: {
    src: '/assets/aistudio/granat_new_6e68cfe7.png',
    label: 'Granat',
  },
  mobilMainan: {
    src: '/assets/aistudio/mobil_mainan_fa3e3683.png',
    label: 'Mobil Mainan',
  },
  palu: {
    src: '/assets/aistudio/palu_8c0937ad.png',
    label: 'Palu',
  },
  roda: {
    src: '/assets/aistudio/roda_2f4972b2.png',
    label: 'Roda',
  },
  tabungGas: {
    src: '/assets/aistudio/Tabung_Gas_9d5a1c3e.png',
    label: 'Tabung Gas',
  },
  ultraman: {
    src: '/assets/aistudio/ultraman_56d1c015.png',
    label: 'Mainan Robot',
  },
};

export const TRAP_POOL: readonly TrapId[] = [
  'batuBata',
  'bola',
  'boneka',
  'granat',
  'mobilMainan',
  'palu',
  'roda',
  'tabungGas',
  'ultraman',
] as const;

export const AUDIO_TRACKS = {
  bgm1: '/assets/audio/bgm-level-1.mp3',
  bgm2: '/assets/audio/bgm-level-2.mp3',
  bgm3: '/assets/audio/bgm-level-3.mp3',
  bgm4: '/assets/audio/bgm-level-4.mp3',
  bgm5: '/assets/audio/bgm-level-5.mp3',
  sfxFoodCatch: '/assets/audio/sfx-food-catch.mp3',
  sfxWrongFood: '/assets/audio/sfx-wrong-food.mp3',
  sfxLevelUp: '/assets/audio/sfx-level-up.mp3',
  sfxGameOver: '/assets/audio/sfx-game-over.mp3',
  sfxVictory: '/assets/audio/sfx-victory.mp3',
  sfxButton: '/assets/audio/sfx-button.mp3',
  sfxCountdown: '/assets/audio/sfx-countdown.mp3',
  sfxLastChance: '/assets/audio/sfx-last-chance.mp3',
} as const;

export type AudioTrackKey = keyof typeof AUDIO_TRACKS;

export type LoadedSpriteMap = Record<
  CharacterSpriteKey | FlyerSpriteKey | ItemSpriteKey | 'superhero',
  HTMLImageElement
>;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

let cachedSprites: LoadedSpriteMap | null = null;
let inflightSpritesPromise: Promise<LoadedSpriteMap> | null = null;

export const TOTAL_SPRITE_ASSETS = 38;

export async function preloadAllSprites(
  onProgress?: (loaded: number, total: number) => void,
): Promise<LoadedSpriteMap> {
  const entries: Array<[CharacterSpriteKey | FlyerSpriteKey | ItemSpriteKey | 'superhero', string]> = [
    ['walk1', CHARACTER_SPRITES.walk1],
    ['walk2', CHARACTER_SPRITES.walk2],
    ['makan', CHARACTER_SPRITES.makan],
    ['salahMakan', CHARACTER_SPRITES.salahMakan],
    ['sebel', CHARACTER_SPRITES.sebel],
    ['superhero', SUPERHERO_SPRITE],
    ['flyerIdle1', FLYER_SPRITES.flyerIdle1],
    ['flyerIdle2', FLYER_SPRITES.flyerIdle2],
    ['flyerMakan', FLYER_SPRITES.flyerMakan],
    ['flyerSalahMakan', FLYER_SPRITES.flyerSalahMakan],
    ['flyerNabrak', FLYER_SPRITES.flyerNabrak],
    ...(Object.entries(FOOD_SPRITES) as Array<[FoodId, { src: string }]>).map(
      ([id, meta]) => [id, meta.src] as [FoodId, string],
    ),
    ...(Object.entries(TRAP_SPRITES) as Array<[TrapId, { src: string }]>).map(
      ([id, meta]) => [id, meta.src] as [TrapId, string],
    ),
  ];

  const total = entries.length;
  if (cachedSprites) {
    onProgress?.(total, total);
    return cachedSprites;
  }

  if (inflightSpritesPromise) {
    const result = await inflightSpritesPromise;
    onProgress?.(total, total);
    return result;
  }

  let completed = 0;
  onProgress?.(0, total);

  inflightSpritesPromise = Promise.all(
    entries.map(async ([key, src]) => {
      const img = await loadImage(src);
      completed += 1;
      onProgress?.(completed, total);
      return [key, img] as const;
    }),
  ).then((loaded) => {
    const map = Object.fromEntries(loaded) as LoadedSpriteMap;
    cachedSprites = map;
    inflightSpritesPromise = null;
    return map;
  }).catch((err) => {
    inflightSpritesPromise = null;
    throw err;
  });

  return inflightSpritesPromise;
}
