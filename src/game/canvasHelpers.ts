import type { ItemSpriteKey, LoadedSpriteMap } from './assets';

export interface MysteryReveal {
  x: number;
  y: number;
  spriteKey: ItemSpriteKey;
  label: string;
  isFood: boolean;
  life: number;
  maxLife: number;
}

export function fitSpriteContain(
  img: HTMLImageElement,
  targetSize: number,
): { w: number; h: number } {
  const natW = img.naturalWidth > 0 ? img.naturalWidth : targetSize;
  const natH = img.naturalHeight > 0 ? img.naturalHeight : targetSize;
  const maxDim = Math.max(natW, natH);
  const ratio = natW / natH;
  const box = ratio > 2.2 || ratio < 0.52 ? targetSize * 1.2 : targetSize;
  const scale = box / maxDim;
  return {
    w: natW * scale,
    h: natH * scale,
  };
}

export function stepMysteryReveals(
  reveals: MysteryReveal[],
  dt: number,
  riseSpeed: number,
): MysteryReveal[] {
  for (const rev of reveals) {
    rev.life += dt;
    rev.y -= riseSpeed * dt;
  }
  return reveals.length > 0 ? reveals.filter((r) => r.life < r.maxLife) : reveals;
}

export function drawMysteryBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
  time: number,
): void {
  const pulse = 1 + Math.sin(time * 6 + x) * 0.055;
  const s = size * 0.84 * pulse;
  const half = s / 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.fillStyle = '#D97706';
  ctx.beginPath();
  ctx.roundRect(-half, -half + 3, s, s, 12);
  ctx.fill();

  ctx.fillStyle = '#FDE047';
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-half, -half, s, s, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FF5C93';
  ctx.fillRect(-5, -half + 1.5, 10, s - 3);
  ctx.fillRect(-half + 1.5, -5, s - 3, 10);

  ctx.fillStyle = '#FFFDF9';
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.56, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E11D48';
  ctx.font = '700 22px Fredoka, Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 1);

  ctx.restore();
}

export function drawMysteryReveals(
  ctx: CanvasRenderingContext2D,
  reveals: readonly MysteryReveal[],
  sprites: LoadedSpriteMap,
  worldTime: number,
  baseSize = 64,
  withSparkles = false,
): void {
  for (const rev of reveals) {
    const img = sprites[rev.spriteKey];
    if (!img) continue;
    const t = rev.life / rev.maxLife;
    const alpha = t < 0.72 ? 1 : Math.max(0, 1 - (t - 0.72) / 0.28);
    const popScale = t < 0.18 ? 0.7 + (t / 0.18) * 0.54 : 1.24 - t * 0.24;
    const { w: drawW, h: drawH } = fitSpriteContain(img, baseSize * popScale);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (withSparkles) {
      const sparkleDist = 38 * popScale;
      for (let k = 0; k < 4; k++) {
        const a = worldTime * 4 + (k * Math.PI) / 2;
        const sx = rev.x + Math.cos(a) * sparkleDist;
        const sy = rev.y + Math.sin(a) * sparkleDist * 0.75;
        ctx.fillStyle = rev.isFood ? '#FBBF24' : '#FB7185';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.drawImage(img, rev.x - drawW / 2, rev.y - drawH / 2, drawW, drawH);

    ctx.font = '700 15px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#FFFDF9';
    const labelY = rev.y + Math.max(28, drawH * 0.54) + 4;
    ctx.strokeText(rev.label, rev.x, labelY);
    ctx.fillStyle = rev.isFood ? '#B45309' : '#BE123C';
    ctx.fillText(rev.label, rev.x, labelY);

    ctx.restore();
  }
}
