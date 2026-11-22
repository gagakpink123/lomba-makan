import { getLevelConfig } from './levels';

const GROUND_TOP_OFFSET = 144;

let cachedSkyKey = '';
let cachedSkyCanvas: HTMLCanvasElement | null = null;

function drawKawaiiCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color = 'rgba(255, 255, 255, 0.92)',
  cheekColor = 'rgba(251, 113, 133, 0.45)',
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.arc(-20, 6, 16, 0, Math.PI * 2);
  ctx.arc(22, 6, 17, 0, Math.PI * 2);
  ctx.arc(6, -10, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = cheekColor;
  ctx.beginPath();
  ctx.ellipse(-10, 6, 3.8, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(12, 6, 3.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.arc(-6, 2, 1.7, 0, Math.PI * 2);
  ctx.arc(8, 2, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(1, 3.5, 2.8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  petalColor: string,
  scale = 1,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = petalColor;
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FDE047';
  ctx.beginPath();
  ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSakuraPetal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  size: number,
  color = 'rgba(255, 182, 213, 0.72)',
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.9, -size * 0.5, size * 0.85, size * 0.8, 0, size);
  ctx.bezierCurveTo(-size * 0.85, size * 0.8, -size * 0.9, -size * 0.5, 0, -size);
  ctx.fill();
  ctx.restore();
}

function drawStarShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 0.8,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
    else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws constantly scrolling, seamless parallax rolling hills and ground strip.
 * Back hill drifts smoothly at ~18 px/s, front hill at ~32 px/s so all 5 levels stay lively.
 */
function drawScrollingHillsAndGround(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  hillBack: string,
  hillFront: string,
  groundColor: string,
): void {
  const groundY = h - GROUND_TOP_OFFSET;
  const stepX = 18;
  const backPhase = time * 20;
  const frontPhase = time * 36;

  // Back hill (continuous rolling sine wave)
  ctx.fillStyle = hillBack;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + stepX; x += stepX) {
    const cx = Math.min(x, w);
    const sx = cx + backPhase;
    const hy =
      groundY -
      102 -
      Math.sin(sx * 0.0115) * 32 -
      Math.cos(sx * 0.023 + 0.7) * 14;
    ctx.lineTo(cx, hy);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Front hill (faster parallax wave)
  ctx.fillStyle = hillFront;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + stepX; x += stepX) {
    const cx = Math.min(x, w);
    const sx = cx + frontPhase;
    const hy =
      groundY -
      54 -
      Math.sin(sx * 0.0155 + 1.4) * 24 -
      Math.cos(sx * 0.031) * 10;
    ctx.lineTo(cx, hy);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Ground strip with soft depth & clean white horizon rim
  ctx.fillStyle = groundColor;
  ctx.fillRect(0, groundY, w, GROUND_TOP_OFFSET);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.fillRect(0, groundY, w, 4);

  const shadeGrad = ctx.createLinearGradient(0, groundY, 0, h);
  shadeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  shadeGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0)');
  shadeGrad.addColorStop(1, 'rgba(15, 23, 42, 0.10)');
  ctx.fillStyle = shadeGrad;
  ctx.fillRect(0, groundY, w, GROUND_TOP_OFFSET);
}

function drawSmilingSun(
  ctx: CanvasRenderingContext2D,
  sunX: number,
  sunY: number,
  time: number,
  bodyColor = '#FDE047',
  strokeColor = '#F59E0B',
): void {
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(time * 0.25);
  ctx.fillStyle = 'rgba(253, 224, 71, 0.68)';
  for (let i = 0; i < 10; i++) {
    ctx.rotate((Math.PI * 2) / 10);
    ctx.beginPath();
    ctx.roundRect(-4.5, -45, 9, 13, 4.5);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(251, 113, 133, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-11, 4, 4, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(11, 4, 4, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.arc(-7, -2, 2.3, 0, Math.PI * 2);
  ctx.arc(7, -2, 2.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 2, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function renderStaticSkyLayer(
  ctx: CanvasRenderingContext2D,
  level: number,
  w: number,
  h: number,
): void {
  const cfg = getLevelConfig(level);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, cfg.skyTop);
  grad.addColorStop(0.75, cfg.skyBottom);
  grad.addColorStop(1, cfg.hillBack);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle pastel kawaii sky polka dots across full width
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  const dotCols = Math.ceil(w / 98) + 1;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < dotCols; col++) {
      const dx = col * 98 + (row % 2 === 0 ? 28 : 74);
      const dy = 135 + row * 72;
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function getOrBuildStaticSky(level: number, w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${level}:${w}:${h}`;
  if (cachedSkyCanvas && cachedSkyKey === key) {
    return cachedSkyCanvas;
  }
  const off = cachedSkyCanvas ?? document.createElement('canvas');
  if (off.width !== w) off.width = w;
  if (off.height !== h) off.height = h;
  const octx = off.getContext('2d');
  if (!octx) return null;
  octx.clearRect(0, 0, w, h);
  renderStaticSkyLayer(octx, level, w, h);
  cachedSkyCanvas = off;
  cachedSkyKey = key;
  return cachedSkyCanvas;
}

export function drawLevelBackground(
  ctx: CanvasRenderingContext2D,
  level: number,
  w: number,
  h: number,
  time: number,
): void {
  const cfg = getLevelConfig(level);
  const staticSky = getOrBuildStaticSky(level, w, h);
  if (staticSky) {
    ctx.drawImage(staticSky, 0, 0, w, h);
  } else {
    renderStaticSkyLayer(ctx, level, w, h);
  }

  const groundY = h - GROUND_TOP_OFFSET;

  // Sky layer animations (clouds, sun, bubbles, bunting, petals, stars)
  if (level === 1) {
    // LEVEL 1: Sunny Picnic
    drawSmilingSun(ctx, Math.max(68, w * 0.12), 198, time);

    const cloudCount = Math.max(2, Math.round(w / 260));
    for (let i = 0; i < cloudCount; i++) {
      const cx = ((time * (10 + (i % 2) * 3) + i * ((w + 140) / cloudCount)) % (w + 140)) - 70;
      const cy = 175 + (i % 3) * 48;
      drawKawaiiCloud(ctx, cx, cy, i % 2 === 0 ? 0.94 : 0.74);
    }

    const petalCount = Math.min(12, Math.max(5, Math.round(w / 95)));
    for (let i = 0; i < petalCount; i++) {
      const px = (i * (w / petalCount) + time * 16 + Math.sin(time + i) * 14) % (w + 20);
      const py = 140 + ((i * 91 + time * 24) % 420);
      drawSakuraPetal(ctx, px, py, time * 1.4 + i, 5.5);
    }
  } else if (level === 2) {
    // LEVEL 2: Candy Garden
    const cloudCount = Math.max(2, Math.round(w / 260));
    for (let i = 0; i < cloudCount; i++) {
      const cx = ((time * (10 + (i % 2) * 3) + i * ((w + 150) / cloudCount)) % (w + 150)) - 75;
      const cy = 165 + (i % 2) * 74;
      drawKawaiiCloud(ctx, cx, cy, i % 2 === 0 ? 0.88 : 0.76, 'rgba(255, 245, 252, 0.92)');
    }

    const decoCount = Math.min(10, Math.max(6, Math.round(w / 95)));
    for (let i = 0; i < decoCount; i++) {
      const bx = 42 + i * ((w - 84) / Math.max(1, decoCount - 1));
      const by = 180 + ((i * 63 + time * 14) % 280);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 114, 182, 0.24)' : 'rgba(192, 132, 252, 0.24)';
      ctx.beginPath();
      ctx.arc(bx, by, 10 + (i % 3) * 4, 0, Math.PI * 2);
      ctx.fill();
      drawStarShape(ctx, bx + 14, 140 + ((i * 80) % 220) + Math.sin(time * 2 + i) * 6, 7.5, '#FDE047', 0.75);
    }
  } else if (level === 3) {
    // LEVEL 3: Happy Fruit Market
    const cloudCount = Math.max(1, Math.round(w / 340));
    for (let i = 0; i < cloudCount; i++) {
      const c1 = ((time * 9 + 110 + i * 280) % (w + 150)) - 75;
      drawKawaiiCloud(ctx, c1, 178 + (i % 2) * 38, 0.84, 'rgba(255, 251, 235, 0.92)');
    }

    const fruitCount = Math.min(10, Math.max(6, Math.round(w / 95)));
    for (let i = 0; i < fruitCount; i++) {
      const fx = 50 + i * ((w - 100) / Math.max(1, fruitCount - 1));
      const fy = 210 + (i % 3) * 75 + Math.sin(time * 1.6 + i) * 8;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = i % 2 === 0 ? '#FB923C' : '#84CC16';
      ctx.beginPath();
      ctx.arc(fx, fy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (level === 4) {
    // LEVEL 4: Bubble Dessert World
    const bubbleCount = Math.min(14, Math.max(9, Math.round(w / 72)));
    for (let i = 0; i < bubbleCount; i++) {
      const bx = 36 + ((i * ((w - 72) / bubbleCount)) % (w - 72));
      const by = groundY - 12 - ((time * (18 + (i % 3) * 7) + i * 95) % (groundY - 40));
      const r = 10 + (i % 4) * 5;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(bx - r * 0.35, by - r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const starCount = Math.min(12, Math.max(7, Math.round(w / 85)));
    for (let i = 0; i < starCount; i++) {
      const sx = 36 + i * ((w - 72) / Math.max(1, starCount - 1));
      const sy = 155 + (i % 3) * 85;
      const pulse = 0.5 + 0.38 * Math.sin(time * 3 + i);
      drawStarShape(ctx, sx, sy, 7, '#FBBF24', pulse);
    }
  } else {
    // LEVEL 5: Grand Food Festival Finale
    const buntingY = 128;
    ctx.save();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, buntingY);
    ctx.quadraticCurveTo(w * 0.5, buntingY + 26, w, buntingY);
    ctx.stroke();

    const flagColors = ['#FB7185', '#FBBF24', '#34D399', '#60A5FA', '#C084FC'];
    const flagCount = Math.min(22, Math.max(12, Math.round(w / 46)));
    for (let i = 0; i < flagCount; i++) {
      const t = (i + 0.5) / flagCount;
      const fx = t * w;
      const curveOffset = 4 * t * (1 - t) * 26;
      const fy = buntingY + curveOffset;
      const sway = Math.sin(time * 3 + i * 0.6) * 2;
      ctx.fillStyle = flagColors[i % flagColors.length];
      ctx.beginPath();
      ctx.moveTo(fx - 12, fy);
      ctx.lineTo(fx + 12, fy);
      ctx.lineTo(fx + sway, fy + 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const lanterns = [
      { x: 28, y: 175, c: '#FB7185' },
      { x: w - 28, y: 175, c: '#FBBF24' },
    ];
    for (const lan of lanterns) {
      ctx.save();
      ctx.fillStyle = lan.c;
      ctx.strokeStyle = '#9F1239';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(lan.x - 12, lan.y - 14, 24, 28, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(lan.x - 6, lan.y - 8, 5, 16);
      ctx.restore();
    }

    const starCount = Math.min(16, Math.max(10, Math.round(w / 62)));
    for (let i = 0; i < starCount; i++) {
      const lx = 26 + i * ((w - 52) / Math.max(1, starCount - 1));
      const ly = 168 + (i % 2) * 35 + Math.sin(time * 1.5 + i) * 6;
      const blink = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(time * 4 + i * 1.1));
      drawStarShape(ctx, lx, ly, 7.5, i % 2 === 0 ? '#FDE047' : '#F472B6', blink);
    }

    const confCount = Math.min(14, Math.max(8, Math.round(w / 72)));
    for (let i = 0; i < confCount; i++) {
      const cx = (i * (w / confCount) + time * 14) % w;
      const cy = 185 + ((i * 73 + time * 26) % 350);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * 1.4 + i);
      ctx.fillStyle = flagColors[i % flagColors.length];
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.roundRect(-5, -2.5, 10, 5, 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Constantly moving parallax rolling hills & ground across ALL 5 levels
  drawScrollingHillsAndGround(
    ctx,
    w,
    h,
    time,
    cfg.hillBack,
    cfg.hillFront,
    cfg.groundColor,
  );

  // Scrolling ground & horizon props per level
  if (level === 1) {
    const offset = (time * 36) % 24;
    ctx.save();
    ctx.fillStyle = '#FFF5F7';
    ctx.fillRect(0, groundY, w, 24);
    ctx.fillStyle = 'rgba(251, 113, 133, 0.4)';
    for (let gx = -24; gx < w + 24; gx += 24) {
      const px = gx - offset;
      ctx.fillRect(px, groundY, 12, 12);
      ctx.fillRect(px + 12, groundY + 12, 12, 12);
    }
    ctx.restore();

    const sway = Math.sin(time * 1.8) * 2.5;
    const flowerSpecs = [
      { ratio: 0.11, dy: -26, color: '#FFFFFF', scale: 0.95, dir: 1 },
      { ratio: 0.31, dy: -16, color: '#FBCFE8', scale: 0.85, dir: -1 },
      { ratio: 0.52, dy: -24, color: '#FDE68A', scale: 0.82, dir: 1 },
      { ratio: 0.72, dy: -22, color: '#FFFFFF', scale: 0.9, dir: 1 },
      { ratio: 0.90, dy: -30, color: '#FDE68A', scale: 0.95, dir: -1 },
      { ratio: 0.18, dy: 42, color: '#FFFFFF', scale: 0.78, dir: 0.7 },
      { ratio: 0.82, dy: 44, color: '#FDE68A', scale: 0.8, dir: -0.7 },
    ];
    for (const fl of flowerSpecs) {
      drawFlower(ctx, w * fl.ratio + sway * fl.dir, groundY + fl.dy, fl.color, fl.scale);
    }
  } else if (level === 2) {
    // Scrolling lollipop parade on the front hill
    const span = w + 160;
    const lolliColors = ['#F472B6', '#A78BFA', '#34D399', '#FBBF24'];
    const count = Math.max(3, Math.round(w / 220));
    for (let i = 0; i < count; i++) {
      const lx = ((i * (span / count) - time * 36) % span + span) % span - 80;
      const ly = groundY - 82 - (i % 2) * 14;
      ctx.fillStyle = '#FFF7ED';
      ctx.strokeStyle = '#FDBA74';
      ctx.lineWidth = 1.5;
      ctx.fillRect(lx - 4, ly, 8, groundY - ly + 6);
      ctx.fillStyle = lolliColors[i % lolliColors.length];
      ctx.beginPath();
      ctx.arc(lx, ly, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(lx, ly, 12, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  } else if (level === 3) {
    // Scrolling market booths
    const span = w + 220;
    const count = Math.max(2, Math.round(w / 320));
    for (let i = 0; i < count; i++) {
      const bx = ((i * (span / count) - time * 36) % span + span) % span - 110;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#FED7AA';
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, groundY - 76, 74, 80, [0, 0, 8, 8]);
      ctx.fill();
      ctx.stroke();
      for (let s = 0; s < 4; s++) {
        ctx.fillStyle = s % 2 === 0 ? '#FFFBEB' : '#FB7185';
        ctx.fillRect(bx - 4 + s * 20.5, groundY - 88, 20.5, 16);
        ctx.beginPath();
        ctx.arc(bx - 4 + s * 20.5 + 10.25, groundY - 72, 10.25, 0, Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }
  } else if (level === 4) {
    // Scrolling cream frosting wave
    const waveShift = (time * 36) % 30;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
    ctx.beginPath();
    ctx.moveTo(-30, groundY);
    for (let x = -30; x <= w + 30; x += 30) {
      const px = x - waveShift;
      ctx.quadraticCurveTo(px + 15, groundY + 18, px + 30, groundY);
    }
    ctx.lineTo(w + 30, groundY);
    ctx.closePath();
    ctx.fill();
  } else {
    // LEVEL 5: Festive flowers along the horizon
    const span = w + 120;
    const count = Math.max(5, Math.round(w / 120));
    for (let i = 0; i < count; i++) {
      const fx = ((i * (span / count) - time * 36) % span + span) % span - 60;
      const fy = groundY + (i % 2 === 0 ? -16 : 36);
      drawFlower(ctx, fx, fy, i % 2 === 0 ? '#FDE047' : '#F472B6', i % 2 === 0 ? 0.92 : 0.78);
    }
  }
}
