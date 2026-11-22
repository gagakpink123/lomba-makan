import { getSection2LevelConfig } from './levels';
import {
  TUNNEL_WALL_MAX_INSET,
  type TunnelObstacle,
  type TunnelPhaseState,
} from './section2Rules';

function drawFluffyCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha = 0.9,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.arc(-20, 6, 16, 0, Math.PI * 2);
  ctx.arc(22, 6, 17, 0, Math.PI * 2);
  ctx.arc(6, -10, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-9, 6, 3.6, 2.1, 0, 0, Math.PI * 2);
  ctx.ellipse(11, 6, 3.6, 2.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the sunny parallax sky + clouds + rolling hills across the full canvas.
 * The Lorong Gelap cave interior is drawn in its own world-space clipped span [leftX, rightX]
 * so sunny sky naturally remains visible outside both entrance and exit portals!
 */
export function drawSection2Background(
  ctx: CanvasRenderingContext2D,
  level: number,
  w: number,
  h: number,
  scrollDist: number,
  time: number,
): void {
  const cfg = getSection2LevelConfig(level);

  // 1. Vibrant Open Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, cfg.skyTop);
  skyGrad.addColorStop(0.75, cfg.skyBottom);
  skyGrad.addColorStop(1, cfg.hillBack);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Parallax clouds & optional rainbow arc
  const span = w + 180;
  const cloudCount = Math.max(3, Math.round(w / 220));
  for (let i = 0; i < cloudCount; i++) {
    const cx =
      (((i * (span / cloudCount) - scrollDist * 0.22) % span) + span) % span - 90;
    const cy = 148 + (i % 3) * 72 + Math.sin(time * 1.3 + i) * 5;
    drawFluffyCloud(ctx, cx, cy, i % 2 === 0 ? 0.95 : 0.72, 0.9);
  }

  if (level >= 7) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = level === 7 ? '#F472B6' : '#FBBF24';
    ctx.lineWidth = 6;
    const arcX = (((w * 0.7 - scrollDist * 0.12) % (w + 300)) + (w + 300)) % (w + 300) - 150;
    ctx.beginPath();
    ctx.arc(arcX, h - 180, 110, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Multi-plane Parallax Rolling Hills (constantly scrolling right-to-left)
  const hillBaseY = h - 76;
  const stepX = 18;
  const backScroll = scrollDist * 0.34;
  const frontScroll = scrollDist * 0.62;

  ctx.save();
  ctx.fillStyle = cfg.hillBack;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + stepX; x += stepX) {
    const cx = Math.min(x, w);
    const sx = cx + backScroll;
    const hy =
      hillBaseY -
      118 -
      Math.sin(sx * 0.011) * 32 -
      Math.cos(sx * 0.022 + 0.6) * 14;
    ctx.lineTo(cx, hy);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cfg.hillFront;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + stepX; x += stepX) {
    const cx = Math.min(x, w);
    const sx = cx + frontScroll;
    const hy =
      hillBaseY -
      62 -
      Math.sin(sx * 0.016 + 1.3) * 24 -
      Math.cos(sx * 0.031) * 10;
    ctx.lineTo(cx, hy);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = cfg.accentColor;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(0, hillBaseY + 18, w, h - (hillBaseY + 18));
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(0, hillBaseY + 18, w, 4);
  ctx.restore();

}

function getTunnelVisibleBounds(
  w: number,
  tunnel: TunnelPhaseState,
): { clipLeft: number; clipRight: number; visible: boolean } {
  if (!tunnel.active) {
    return { clipLeft: 0, clipRight: 0, visible: false };
  }
  const clipLeft = Math.max(0, tunnel.leftX - 40);
  const clipRight = Math.min(w, tunnel.rightX + 40);
  return {
    clipLeft,
    clipRight,
    visible: clipRight > clipLeft + 1,
  };
}

/**
 * Builds an organic arched cave silhouette clip path between tunnel.leftX and tunnel.rightX
 * so there is never a hard vertical seam separating sunny sky and cave interior.
 */
function traceTunnelArchClipPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tunnel: TunnelPhaseState,
): void {
  const topY = 112 + TUNNEL_WALL_MAX_INSET;
  const botY = h - 38 - TUNNEL_WALL_MAX_INSET;
  const midY = (topY + botY) * 0.5;
  const halfSpanY = Math.max(1, (botY - topY) * 0.5);

  const leftEdgeAt = (y: number): number => {
    if (tunnel.leftX <= -80) return -10;
    const norm = Math.min(1, Math.abs(y - midY) / halfSpanY);
    const archBow = (1 - norm * norm) * -28 + norm * norm * 32;
    const jag = Math.sin(y * 0.055) * 6;
    return tunnel.leftX + archBow + jag;
  };

  const rightEdgeAt = (y: number): number => {
    if (tunnel.rightX >= w + 80) return w + 10;
    const norm = Math.min(1, Math.abs(y - midY) / halfSpanY);
    const archBow = (1 - norm * norm) * 28 - norm * norm * 32;
    const jag = Math.sin(y * 0.055 + 1.4) * 6;
    return tunnel.rightX + archBow + jag;
  };

  ctx.beginPath();
  ctx.moveTo(leftEdgeAt(0), 0);
  for (let y = 24; y <= h; y += 24) {
    ctx.lineTo(leftEdgeAt(y), y);
  }
  ctx.lineTo(leftEdgeAt(h), h);
  for (let y = h; y >= 0; y -= 24) {
    ctx.lineTo(rightEdgeAt(y), y);
  }
  ctx.closePath();
}

/**
 * Draws the detailed cavern rock interior within an already-clipped tunnel arch.
 */
function drawTunnelCaveInterior(
  ctx: CanvasRenderingContext2D,
  h: number,
  scrollDist: number,
  time: number,
  clipLeft: number,
  clipRight: number,
): void {

  // Deep slate-indigo cavern backdrop
  const caveGrad = ctx.createLinearGradient(0, 0, 0, h);
  caveGrad.addColorStop(0, '#090D1F');
  caveGrad.addColorStop(0.5, '#17153B');
  caveGrad.addColorStop(1, '#0B1024');
  ctx.fillStyle = caveGrad;
  ctx.fillRect(clipLeft, 0, clipRight - clipLeft, h);

  // Far parallax rock wall pillars & cavern arch silhouettes
  const farSpan = 220;
  const farShift = scrollDist * 0.32;
  ctx.fillStyle = '#1E1B4B';
  const startFar = Math.floor((clipLeft + farShift) / farSpan) * farSpan - farShift - farSpan;
  for (let gx = startFar; gx < clipRight + farSpan; gx += farSpan) {
    ctx.beginPath();
    ctx.moveTo(gx - 34, 0);
    ctx.lineTo(gx + 34, 0);
    ctx.lineTo(gx + 22, h * 0.42);
    ctx.lineTo(gx + 40, h);
    ctx.lineTo(gx - 40, h);
    ctx.lineTo(gx - 20, h * 0.46);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#252059';
    ctx.beginPath();
    ctx.moveTo(gx + 75, 90);
    ctx.lineTo(gx + 135, 90);
    ctx.lineTo(gx + 106, 235);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1E1B4B';
  }

  // Sedimentary horizontal rock strata bands across background wall
  const strataOffset = (scrollDist * 0.48) % 180;
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.12)';
  ctx.lineWidth = 2;
  for (let y = 170; y <= h - 140; y += 54) {
    ctx.beginPath();
    for (let x = clipLeft - 20; x <= clipRight + 36; x += 36) {
      const waveY = y + Math.sin((x + strataOffset) * 0.03 + y) * 7;
      if (x === clipLeft - 20) ctx.moveTo(x, waveY);
      else ctx.lineTo(x, waveY);
    }
    ctx.stroke();
  }

  // Subtle glowing cave crystal dust & cracks + hanging cave lanterns
  const crackSpan = 260;
  const crackShift = scrollDist * 0.48;
  const startCrack = Math.floor((clipLeft + crackShift) / crackSpan) * crackSpan - crackShift - crackSpan;
  for (let cx = startCrack; cx < clipRight + crackSpan; cx += crackSpan) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 40, 245);
    ctx.lineTo(cx + 58, 285);
    ctx.lineTo(cx + 49, 325);
    ctx.lineTo(cx + 68, 360);
    ctx.stroke();

    const lanternX = cx + 150;
    const lanternY = 112 + TUNNEL_WALL_MAX_INSET + 12;
    const flicker = 0.88 + Math.sin(time * 9 + cx) * 0.12;

    const glow = ctx.createRadialGradient(lanternX, lanternY + 14, 4, lanternX, lanternY + 14, 92);
    glow.addColorStop(0, `rgba(253, 224, 71, ${0.34 * flicker})`);
    glow.addColorStop(0.55, `rgba(251, 146, 60, ${0.14 * flicker})`);
    glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lanternX, lanternY + 14, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lanternX, lanternY - 18);
    ctx.lineTo(lanternX, lanternY + 4);
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(lanternX - 7, lanternY + 4, 14, 18, 4);
    ctx.fill();
    ctx.stroke();
  }

}

/**
 * Draws richly textured sedimentary ceiling & floor stone walls within an already-clipped tunnel arch.
 */
function drawTunnelCeilingAndFloorWalls(
  ctx: CanvasRenderingContext2D,
  h: number,
  scrollDist: number,
  clipLeft: number,
  clipRight: number,
): void {
  const inset = TUNNEL_WALL_MAX_INSET;
  const topWallBottom = 112 + inset;
  const bottomWallTop = h - 38 - inset;
  const step = 24;
  const phase = scrollDist * 1.0;

  // 1. Ceiling rock mass with jagged rocky underside
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, topWallBottom + 18);
  ceilGrad.addColorStop(0, '#1E1B4B');
  ceilGrad.addColorStop(0.65, '#312E81');
  ceilGrad.addColorStop(1, '#4338CA');
  ctx.fillStyle = ceilGrad;
  ctx.beginPath();
  ctx.moveTo(clipLeft - step, 0);
  ctx.lineTo(clipRight + step, 0);
  for (let x = clipRight + step; x >= clipLeft - step; x -= step) {
    const jag = Math.sin((x + phase) * 0.048) * 10 + Math.cos((x + phase) * 0.12) * 5;
    ctx.lineTo(x, topWallBottom + jag);
  }
  ctx.closePath();
  ctx.fill();

  // Textured stone masonry seams inside ceiling rock
  ctx.save();
  ctx.clip();
  const blockSpan = 64;
  const startBlock = Math.floor((clipLeft + phase) / blockSpan) * blockSpan - phase - blockSpan;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 2;
  for (let bx = startBlock; bx < clipRight + blockSpan; bx += blockSpan) {
    for (let row = 0; row < 4; row++) {
      const y = 32 + row * 38;
      const offsetX = (row % 2) * (blockSpan * 0.5);
      ctx.fillStyle = row % 2 === 0 ? 'rgba(99, 102, 241, 0.16)' : 'rgba(30, 27, 75, 0.25)';
      ctx.fillRect(bx + offsetX + 2, y + 2, blockSpan - 6, 32);
      ctx.strokeRect(bx + offsetX, y, blockSpan, 38);
    }
  }
  ctx.restore();

  // High-contrast glowing sky-blue crystal rim along ceiling edge
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let x = clipLeft - step; x <= clipRight + step; x += step) {
    const jag = Math.sin((x + phase) * 0.048) * 10 + Math.cos((x + phase) * 0.12) * 5;
    if (x === clipLeft - step) ctx.moveTo(x, topWallBottom + jag);
    else ctx.lineTo(x, topWallBottom + jag);
  }
  ctx.stroke();

  // 2. Floor rock mass with jagged rocky top edge
  const floorGrad = ctx.createLinearGradient(0, bottomWallTop - 16, 0, h);
  floorGrad.addColorStop(0, '#4338CA');
  floorGrad.addColorStop(0.32, '#312E81');
  floorGrad.addColorStop(1, '#1E1B4B');
  ctx.fillStyle = floorGrad;
  ctx.beginPath();
  ctx.moveTo(clipLeft - step, h);
  for (let x = clipLeft - step; x <= clipRight + step; x += step) {
    const jag = Math.sin((x + phase + 40) * 0.05) * 10 + Math.cos((x + phase) * 0.11) * 5;
    ctx.lineTo(x, bottomWallTop + jag);
  }
  ctx.lineTo(clipRight + step, h);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 2;
  for (let bx = startBlock; bx < clipRight + blockSpan; bx += blockSpan) {
    for (let row = 0; row < 3; row++) {
      const y = bottomWallTop + 6 + row * 34;
      const offsetX = (row % 2) * (blockSpan * 0.5);
      ctx.fillStyle = row % 2 === 0 ? 'rgba(99, 102, 241, 0.18)' : 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(bx + offsetX + 2, y + 2, blockSpan - 6, 28);
      ctx.strokeRect(bx + offsetX, y, blockSpan, 34);
    }
  }
  ctx.restore();

  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let x = clipLeft - step; x <= clipRight + step; x += step) {
    const jag = Math.sin((x + phase + 40) * 0.05) * 10 + Math.cos((x + phase) * 0.11) * 5;
    if (x === clipLeft - step) ctx.moveTo(x, bottomWallTop + jag);
    else ctx.lineTo(x, bottomWallTop + jag);
  }
  ctx.stroke();

  const crystalSpan = 160;
  const startCrys = Math.floor((clipLeft + phase) / crystalSpan) * crystalSpan - phase - crystalSpan;
  for (let cx = startCrys; cx < clipRight + crystalSpan; cx += crystalSpan) {
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(cx - 8, topWallBottom - 4);
    ctx.lineTo(cx + 8, topWallBottom - 4);
    ctx.lineTo(cx, topWallBottom + 16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#22D3EE';
    ctx.beginPath();
    ctx.moveTo(cx + 68, bottomWallTop + 4);
    ctx.lineTo(cx + 84, bottomWallTop + 4);
    ctx.lineTo(cx + 76, bottomWallTop - 16);
    ctx.closePath();
    ctx.fill();
  }

}

function strokeCaveRimArc(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  yStart: number,
  yEnd: number,
  yStep: number,
  midY: number,
  halfSpanY: number,
  bowSign: 1 | -1,
  jagPhase: number,
  offsetX: number,
  color: string,
  lineWidth: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let y = yStart; y <= yEnd; y += yStep) {
    const norm = Math.min(1, Math.abs(y - midY) / halfSpanY);
    const archBow = bowSign * ((1 - norm * norm) * -28 + norm * norm * 32);
    const jag = Math.sin(y * 0.055 + jagPhase) * 6;
    const px = baseX + archBow + jag + offsetX;
    if (y === yStart) ctx.moveTo(px, y);
    else ctx.lineTo(px, y);
  }
  ctx.stroke();
}

/**
 * Draws the physical Cave Entrance hillside archway at tunnel.leftX and sunlit Cave Exit archway at tunnel.rightX,
 * curving cleanly around the opening so the cave blends seamlessly into the rolling hills background.
 */
function drawTunnelPortals(
  ctx: CanvasRenderingContext2D,
  level: number,
  w: number,
  h: number,
  time: number,
  tunnel: TunnelPhaseState,
): void {
  if (!tunnel.active) return;

  const cfg = getSection2LevelConfig(level);
  const topWallBottom = 112 + TUNNEL_WALL_MAX_INSET;
  const bottomWallTop = h - 38 - TUNNEL_WALL_MAX_INSET;
  const midY = (topWallBottom + bottomWallTop) * 0.5;
  const halfSpanY = Math.max(1, (bottomWallTop - topWallBottom) * 0.5);

  // --- A. ENTRANCE PORTAL (Hillside Cliff Archway at tunnel.leftX) ---
  if (tunnel.leftX > -190 && tunnel.leftX < w + 190) {
    const lx = tunnel.leftX;
    ctx.save();

    // 1. Curved grassy hillside slope rising up from the rolling hills on the left into the cave roof
    ctx.fillStyle = cfg.hillFront;
    ctx.beginPath();
    ctx.moveTo(lx - 135, h - 56);
    ctx.quadraticCurveTo(lx - 78, bottomWallTop - 6, lx - 34, bottomWallTop + 26);
    ctx.lineTo(lx + 42, h);
    ctx.lineTo(lx - 135, h);
    ctx.closePath();
    ctx.fill();

    // 2. Curved dark stone archway rim + cliff bevel + glowing crystal threshold
    ctx.lineCap = 'round';
    strokeCaveRimArc(ctx, lx, 0, h, 20, midY, halfSpanY, 1, 0, 0, '#1E1B4B', 36);
    strokeCaveRimArc(ctx, lx, 0, h, 20, midY, halfSpanY, 1, 0, -12, '#64748B', 14);
    strokeCaveRimArc(ctx, lx, topWallBottom - 16, bottomWallTop + 16, 16, midY, halfSpanY, 1, 0, 8, '#38BDF8', 3.2);

    // Stone roof cap & mossy green foliage across the cave brow
    ctx.fillStyle = '#312E81';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx - 26, topWallBottom - 26);
    ctx.lineTo(lx + 44, topWallBottom - 26);
    ctx.lineTo(lx + 44, topWallBottom + 10);
    ctx.lineTo(lx - 18, topWallBottom + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22C55E';
    for (let m = 0; m < 5; m++) {
      ctx.beginPath();
      ctx.arc(lx - 24 + m * 15, topWallBottom - 24 + (m % 2) * 5, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Swinging warm lantern hanging from cave brow
    const swing = Math.sin(time * 4) * 3;
    const lanX = lx - 14 + swing;
    const lanY = topWallBottom + 32;
    const lanGlow = ctx.createRadialGradient(lanX, lanY, 4, lanX, lanY, 54);
    lanGlow.addColorStop(0, 'rgba(253, 224, 71, 0.75)');
    lanGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = lanGlow;
    ctx.beginPath();
    ctx.arc(lanX, lanY, 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lx - 14, topWallBottom + 12);
    ctx.lineTo(lanX, lanY - 8);
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(lanX - 7, lanY - 8, 14, 18, 4);
    ctx.fill();
    ctx.stroke();

    // Readable wooden entrance sign "MASUK GOA >>>"
    const signX = lx - 48;
    const signY = bottomWallTop - 32;
    ctx.fillStyle = '#78350F';
    ctx.fillRect(signX - 4, signY + 12, 8, 36);
    ctx.fillStyle = '#FDE047';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(signX - 66, signY - 16, 132, 32, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#78350F';
    ctx.font = '800 13px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MASUK GOA >>>', signX, signY + 1);

    ctx.restore();
  }

  // --- B. EXIT PORTAL (Sunlit Curved Cave Exit Archway + Golden Sunbeams at tunnel.rightX) ---
  if (tunnel.rightX > -190 && tunnel.rightX < w + 190) {
    const rx = tunnel.rightX;
    ctx.save();

    // 1. Hillside grass mound sloping smoothly back down into rolling hills on the right
    ctx.fillStyle = cfg.hillFront;
    ctx.beginPath();
    ctx.moveTo(rx - 40, h);
    ctx.lineTo(rx + 34, bottomWallTop + 24);
    ctx.quadraticCurveTo(rx + 84, bottomWallTop - 6, rx + 140, h - 56);
    ctx.lineTo(rx + 140, h);
    ctx.closePath();
    ctx.fill();

    // 2. Golden sunbeams pouring inward into the cave along the arched opening
    const beamGrad = ctx.createLinearGradient(rx + 45, topWallBottom, rx - 210, bottomWallTop);
    beamGrad.addColorStop(0, 'rgba(254, 249, 195, 0.56)');
    beamGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.2)');
    beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(rx + 14, topWallBottom + 10);
    ctx.lineTo(rx + 26, bottomWallTop - 10);
    ctx.lineTo(rx - 210, bottomWallTop - 4);
    ctx.lineTo(rx - 95, topWallBottom + 14);
    ctx.closePath();
    ctx.fill();

    // 3. Curved rocky cave exit rim
    ctx.lineCap = 'round';
    strokeCaveRimArc(ctx, rx, 0, h, 20, midY, halfSpanY, -1, 1.4, 0, '#1E1B4B', 34);
    strokeCaveRimArc(ctx, rx, 0, h, 20, midY, halfSpanY, -1, 1.4, 12, '#94A3B8', 12);
    strokeCaveRimArc(ctx, rx, topWallBottom - 16, bottomWallTop + 16, 16, midY, halfSpanY, -1, 1.4, -8, '#7DD3FC', 3.2);

    // Foliage on sunlit exit crest
    ctx.fillStyle = '#34D399';
    for (let m = 0; m < 5; m++) {
      ctx.beginPath();
      ctx.arc(rx - 22 + m * 15, topWallBottom - 20 + (m % 2) * 5, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Exit sign "KELUAR GOA! >>>"
    const signX = rx + 48;
    const signY = bottomWallTop - 32;
    ctx.fillStyle = '#065F46';
    ctx.fillRect(signX - 4, signY + 12, 8, 36);
    ctx.fillStyle = '#D1FAE5';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(signX - 62, signY - 16, 124, 32, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#065F46';
    ctx.font = '800 13px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KELUAR GOA! >>>', signX, signY + 1);

    ctx.restore();
  }
}

/**
 * Draws detailed rock/brick texture inside an arbitrary rectangular region (for corridor walls & doubleGap).
 */
function drawStoneMasonryRect(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  seed: number,
  accentTrimSide: 'top' | 'bottom' | 'both' | 'none' = 'none',
): void {
  if (height <= 2 || width <= 2) return;

  ctx.save();
  const grad = ctx.createLinearGradient(left, top, left + width, top);
  grad.addColorStop(0, '#3B0764');
  grad.addColorStop(0.35, '#5B21B6');
  grad.addColorStop(0.75, '#4C1D95');
  grad.addColorStop(1, '#2E1065');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 8);
  ctx.fill();

  // Clip interior masonry brick courses + chiseled fractures
  ctx.save();
  ctx.clip();
  const brickH = 26;
  const brickW = 46;
  const rows = Math.ceil(height / brickH);
  for (let r = 0; r < rows; r++) {
    const by = top + r * brickH;
    const rowShift = ((r + seed) % 2) * (brickW * 0.5);
    for (let bx = left - brickW; bx < left + width + brickW; bx += brickW) {
      const rx = bx + rowShift;
      const shadeRoll = ((r * 7 + Math.round(bx) + seed) % 3 + 3) % 3;
      ctx.fillStyle =
        shadeRoll === 0
          ? 'rgba(139, 92, 246, 0.22)'
          : shadeRoll === 1
            ? 'rgba(15, 23, 42, 0.28)'
            : 'rgba(167, 139, 250, 0.12)';
      ctx.fillRect(rx + 2, by + 2, brickW - 4, brickH - 4);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.58)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(rx, by, brickW, brickH);
    }
  }

  // Diagonal stone fracture cracks for extra tactile detail
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.24)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(left + width * 0.22, top + height * 0.2);
  ctx.lineTo(left + width * 0.36, top + height * 0.45);
  ctx.lineTo(left + width * 0.28, top + height * 0.72);
  ctx.moveTo(left + width * 0.68, top + height * 0.28);
  ctx.lineTo(left + width * 0.78, top + height * 0.58);
  ctx.stroke();

  // Reinforced stone/amber edge trim along active flyable corridor lip
  if (accentTrimSide === 'bottom' || accentTrimSide === 'both') {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(left, top + height - 10, width, 10);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(left, top + height - 3, width, 3);
  }
  if (accentTrimSide === 'top' || accentTrimSide === 'both') {
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(left, top, width, 10);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(left, top, width, 3);
  }
  ctx.restore();

  // Crisp bright outer outline for dark tunnel readability
  ctx.strokeStyle = '#FDE047';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, 8);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a faceted, sedimentary-layered jagged stalactite or stalagmite rock spire.
 */
function drawRockSpire(
  ctx: CanvasRenderingContext2D,
  x: number,
  topY: number,
  bottomY: number,
  width: number,
  pointDown: boolean,
  seed: number,
): void {
  const halfW = width / 2;
  const h = Math.max(24, bottomY - topY);

  const grad = ctx.createLinearGradient(x - halfW, 0, x + halfW, 0);
  grad.addColorStop(0, '#3B0764');
  grad.addColorStop(0.32, '#7C3AED');
  grad.addColorStop(0.68, '#5B21B6');
  grad.addColorStop(1, '#2E1065');

  ctx.save();
  ctx.beginPath();
  if (pointDown) {
    ctx.moveTo(x - halfW, topY);
    ctx.lineTo(x + halfW, topY);
    ctx.lineTo(x + halfW * 0.82, topY + h * 0.34);
    ctx.lineTo(x + halfW * 0.56, topY + h * 0.68);
    ctx.lineTo(x + 4, bottomY - 4);
    ctx.lineTo(x - 2, bottomY);
    ctx.lineTo(x - halfW * 0.58, topY + h * 0.66);
    ctx.lineTo(x - halfW * 0.84, topY + h * 0.32);
  } else {
    ctx.moveTo(x, topY);
    ctx.lineTo(x + halfW * 0.58, topY + h * 0.34);
    ctx.lineTo(x + halfW * 0.84, topY + h * 0.68);
    ctx.lineTo(x + halfW, bottomY);
    ctx.lineTo(x - halfW, bottomY);
    ctx.lineTo(x - halfW * 0.82, topY + h * 0.66);
    ctx.lineTo(x - halfW * 0.54, topY + h * 0.32);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Clip sedimentary horizontal strata bands & fracture lines inside the spire
  ctx.save();
  ctx.clip();
  for (let sy = topY + 18; sy < bottomY - 12; sy += 24) {
    ctx.fillStyle = ((sy + seed) % 48) < 24 ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.22)';
    ctx.fillRect(x - halfW, sy, width, 10);
  }
  // Left bevel highlight plane
  ctx.fillStyle = 'rgba(253, 224, 71, 0.18)';
  ctx.beginPath();
  ctx.moveTo(x - halfW * 0.6, topY);
  ctx.lineTo(x - halfW * 0.1, topY);
  ctx.lineTo(x, pointDown ? bottomY : topY + h * 0.18);
  ctx.lineTo(x - halfW * 0.5, bottomY);
  ctx.closePath();
  ctx.fill();

  // Rock crack lines
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - halfW * 0.2, topY + h * 0.25);
  ctx.lineTo(x + halfW * 0.15, topY + h * 0.45);
  ctx.lineTo(x - halfW * 0.08, topY + h * 0.68);
  ctx.stroke();
  ctx.restore();

  // High-contrast bright gold rim
  ctx.strokeStyle = '#FDE047';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawPassableHoleChevrons(
  ctx: CanvasRenderingContext2D,
  x: number,
  gapTop: number,
  gapBottom: number,
  time: number,
): void {
  const cy = (gapTop + gapBottom) * 0.5;
  const pulse = 0.6 + Math.sin(time * 7 + cy) * 0.3;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = '#4ADE80';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const dx of [-10, 4]) {
    ctx.beginPath();
    ctx.moveTo(x + dx - 6, cy - 10);
    ctx.lineTo(x + dx + 4, cy);
    ctx.lineTo(x + dx - 6, cy + 10);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws a richly detailed rotating steel saw-gear obstacle mounted on a cave bracket arm.
 */
function drawSpinningGearObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  mountSide: 'top' | 'bottom',
  topAnchor: number,
  bottomAnchor: number,
  time: number,
): void {
  ctx.save();

  // 1. Steel mounting strut connecting axle to ceiling or floor rock wall (drawn behind gear)
  const wallY = mountSide === 'top' ? topAnchor - 18 : bottomAnchor + 18;
  const strutGrad = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
  strutGrad.addColorStop(0, '#1E293B');
  strutGrad.addColorStop(0.4, '#64748B');
  strutGrad.addColorStop(0.75, '#475569');
  strutGrad.addColorStop(1, '#0F172A');

  ctx.fillStyle = strutGrad;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  const strutTop = Math.min(wallY, y);
  const strutH = Math.abs(y - wallY);
  ctx.beginPath();
  ctx.roundRect(x - 8, strutTop, 16, strutH, 4);
  ctx.fill();
  ctx.stroke();

  // Cross-links / bolts along strut
  ctx.fillStyle = '#94A3B8';
  const stepDir = y > wallY ? 1 : -1;
  for (let d = 18; d < strutH - 12; d += 22) {
    const py = wallY + stepDir * d;
    ctx.beginPath();
    ctx.arc(x, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle warning glow behind spinning teeth for dark tunnel contrast
  const pulse = 0.28 + Math.sin(time * 9 + x * 0.05) * 0.08;
  const aura = ctx.createRadialGradient(x, y, radius * 0.45, x, y, radius * 1.24);
  aura.addColorStop(0, `rgba(251, 146, 60, ${pulse})`);
  aura.addColorStop(0.7, 'rgba(245, 158, 11, 0.12)');
  aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.24, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating saw-gear wheel
  ctx.translate(x, y);
  ctx.rotate(angle);

  const teeth = 12;
  const outerR = radius;
  const rootR = radius * 0.77;
  const stepAngle = (Math.PI * 2) / teeth;

  // Outer sawtooth silhouette (asymmetric aggressive blade profile)
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = i * stepAngle;
    const aTip = a0 + stepAngle * 0.32;
    const aBack = a0 + stepAngle * 0.62;
    const aNext = (i + 1) * stepAngle;
    if (i === 0) {
      ctx.moveTo(Math.cos(a0) * rootR, Math.sin(a0) * rootR);
    } else {
      ctx.lineTo(Math.cos(a0) * rootR, Math.sin(a0) * rootR);
    }
    ctx.lineTo(Math.cos(aTip) * outerR, Math.sin(aTip) * outerR);
    ctx.lineTo(Math.cos(aBack) * (rootR + (outerR - rootR) * 0.42), Math.sin(aBack) * (rootR + (outerR - rootR) * 0.42));
    ctx.lineTo(Math.cos(aNext) * rootR, Math.sin(aNext) * rootR);
  }
  ctx.closePath();

  const bladeGrad = ctx.createRadialGradient(-outerR * 0.25, -outerR * 0.25, outerR * 0.08, 0, 0, outerR);
  bladeGrad.addColorStop(0, '#E2E8F0');
  bladeGrad.addColorStop(0.45, '#94A3B8');
  bladeGrad.addColorStop(0.78, '#475569');
  bladeGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Individual metallic blade bevel highlight per tooth
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * stepAngle;
    const aTip = a0 + stepAngle * 0.32;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a0) * (rootR * 0.96), Math.sin(a0) * (rootR * 0.96));
    ctx.lineTo(Math.cos(aTip) * (outerR * 0.97), Math.sin(aTip) * (outerR * 0.97));
    ctx.stroke();
  }

  // Brushed concentric machined groove rings
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, rootR * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(241, 245, 249, 0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, rootR * 0.84, 0, Math.PI * 2);
  ctx.stroke();

  // 6 machined cutout vents so rotation velocity reads immediately
  const cutoutCount = 6;
  const innerHoleR = rootR * 0.42;
  const outerHoleR = rootR * 0.74;
  for (let i = 0; i < cutoutCount; i++) {
    const startA = i * ((Math.PI * 2) / cutoutCount) + 0.16;
    const endA = (i + 1) * ((Math.PI * 2) / cutoutCount) - 0.16;
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, outerHoleR, startA, endA);
    ctx.arc(0, 0, innerHoleR, endA, startA, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Amber/gold hazard ring collar
  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#FEF08A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, rootR * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 6 raised hex bolts around hub
  for (let i = 0; i < 6; i++) {
    const ba = i * (Math.PI / 3);
    const bx = Math.cos(ba) * (rootR * 0.27);
    const by = Math.sin(ba) * (rootR * 0.27);
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(bx + 0.6, by + 0.6, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center glowing iron axle cap
  const hubGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, rootR * 0.17);
  hubGrad.addColorStop(0, '#FEF08A');
  hubGrad.addColorStop(0.45, '#EF4444');
  hubGrad.addColorStop(1, '#7F1D1D');
  ctx.fillStyle = hubGrad;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, rootR * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a heavy industrial moving iron plate on a vertical hydraulic rail
 * with welded seams, diamond tread texture, 3D rivets, hazard stripes, and direction indicator.
 */
function drawMovingIronPlateObstacle(
  ctx: CanvasRenderingContext2D,
  obs: TunnelObstacle,
  topAnchor: number,
  bottomAnchor: number,
  time: number,
): void {
  const x = obs.x;
  const w = obs.width;
  const h = obs.blockH ?? 120;
  const y = obs.blockY ?? (topAnchor + bottomAnchor) * 0.5;
  const velY = obs.plateVelY ?? 0;
  const left = x - w / 2;
  const top = y - h / 2;

  ctx.save();

  // 1. Vertical Hydraulic Guide Rail from ceiling rock to floor rock
  const railW = 16;
  const railTop = topAnchor - 12;
  const railBottom = bottomAnchor + 12;
  const railH = Math.max(40, railBottom - railTop);

  const railGrad = ctx.createLinearGradient(x - railW / 2, 0, x + railW / 2, 0);
  railGrad.addColorStop(0, '#0F172A');
  railGrad.addColorStop(0.35, '#475569');
  railGrad.addColorStop(0.7, '#334155');
  railGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = railGrad;
  ctx.fillRect(x - railW / 2, railTop, railW, railH);

  // Inner dark guide track slot
  ctx.fillStyle = '#020617';
  ctx.fillRect(x - 3, railTop + 8, 6, railH - 16);

  // Travel range tick notches along rail
  ctx.fillStyle = 'rgba(250, 204, 21, 0.55)';
  for (let ty = railTop + 20; ty < railBottom - 16; ty += 18) {
    ctx.fillRect(x - 7, ty, 3, 2);
    ctx.fillRect(x + 4, ty, 3, 2);
  }

  // Ceiling & Floor bolted rail anchor brackets
  ctx.fillStyle = '#64748B';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.fillRect(x - 16, railTop, 32, 10);
  ctx.strokeRect(x - 16, railTop, 32, 10);
  ctx.fillRect(x - 16, railBottom - 10, 32, 10);
  ctx.strokeRect(x - 16, railBottom - 10, 32, 10);

  // 2. Heavy Armor Iron Plate shadow on rail
  ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
  ctx.beginPath();
  ctx.roundRect(left + 4, top + 5, w, h, 8);
  ctx.fill();

  // 3. Brushed Dark Steel Main Armor Body
  const plateGrad = ctx.createLinearGradient(left, top, left + w, top + h);
  plateGrad.addColorStop(0, '#64748B');
  plateGrad.addColorStop(0.28, '#475569');
  plateGrad.addColorStop(0.7, '#334155');
  plateGrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = plateGrad;
  ctx.beginPath();
  ctx.roundRect(left, top, w, h, 8);
  ctx.fill();

  ctx.save();
  ctx.clip();

  // Metallic specular bevel left/top & deep shadow bevel right/bottom
  ctx.fillStyle = 'rgba(226, 232, 240, 0.28)';
  ctx.fillRect(left, top, w, 5);
  ctx.fillRect(left, top, 5, h);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
  ctx.fillRect(left, top + h - 5, w, 5);
  ctx.fillRect(left + w - 5, top, 5, h);

  // Top & Bottom Diagonal Hazard Caution Bands (Yellow/Black Stripes)
  const stripeBandH = 14;
  for (const bandY of [top + 4, top + h - stripeBandH - 4]) {
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(left, bandY, w, stripeBandH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, bandY, w, stripeBandH);
    ctx.clip();
    ctx.fillStyle = '#0F172A';
    for (let sx = left - 20; sx < left + w + 24; sx += 16) {
      ctx.beginPath();
      ctx.moveTo(sx, bandY);
      ctx.lineTo(sx + 8, bandY);
      ctx.lineTo(sx - 2, bandY + stripeBandH);
      ctx.lineTo(sx - 10, bandY + stripeBandH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left, bandY, w, stripeBandH);
  }

  // Recessed Welded Armor Center Plate
  const innerPadX = 9;
  const innerTop = top + stripeBandH + 9;
  const innerH = Math.max(24, h - (stripeBandH + 9) * 2);
  const innerW = w - innerPadX * 2;
  const innerGrad = ctx.createLinearGradient(left + innerPadX, innerTop, left + w - innerPadX, innerTop + innerH);
  innerGrad.addColorStop(0, '#1E293B');
  innerGrad.addColorStop(0.5, '#334155');
  innerGrad.addColorStop(1, '#0F172A');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.roundRect(left + innerPadX, innerTop, innerW, innerH, 5);
  ctx.fill();
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Diamond-plate tread bumps & brushed iron scratches inside center panel (single batched path)
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.28)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let ty = innerTop + 8; ty < innerTop + innerH - 6; ty += 12) {
    for (let tx = left + innerPadX + 8; tx < left + w - innerPadX - 6; tx += 12) {
      const alt = ((Math.round(ty) + Math.round(tx)) % 24) === 0;
      const dx = 2.6;
      const dy = alt ? 2.2 : -2.2;
      ctx.moveTo(tx - dx, ty - dy);
      ctx.lineTo(tx + dx, ty + dy);
    }
  }
  ctx.stroke();

  // Welded horizontal cross-seam & scratched steel highlights
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.68)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left + innerPadX + 2, y);
  ctx.lineTo(left + w - innerPadX - 2, y);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(241, 245, 249, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(left + 16, innerTop + 14);
  ctx.lineTo(left + 30, innerTop + 10);
  ctx.moveTo(left + w - 28, innerTop + innerH - 12);
  ctx.lineTo(left + w - 14, innerTop + innerH - 16);
  ctx.stroke();

  ctx.restore(); // end clip

  // Outer high-visibility metallic rim
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.roundRect(left, top, w, h, 8);
  ctx.stroke();

  // 4. Corner & Mid-edge 3D Steel Rivets
  const rivetPositions: Array<[number, number]> = [
    [left + 6, top + 22],
    [left + w - 6, top + 22],
    [left + 6, y],
    [left + w - 6, y],
    [left + 6, top + h - 22],
    [left + w - 6, top + h - 22],
  ];
  for (const [rx, ry] of rivetPositions) {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(rx + 0.8, ry + 0.8, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(rx, ry, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(rx - 0.8, ry - 0.8, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Glowing Motion Direction Badge in center (clearly signals Up/Down loop)
  const dir = velY < -6 ? -1 : velY > 6 ? 1 : (Math.sin(time * 3) >= 0 ? 1 : -1);
  const pulse = 0.78 + Math.sin(time * 8 + x) * 0.22;
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#FACC15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (dir < 0) {
    ctx.moveTo(x - 6, y + 3);
    ctx.lineTo(x, y - 5);
    ctx.lineTo(x + 6, y + 3);
  } else {
    ctx.moveTo(x - 6, y - 3);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x + 6, y - 3);
  }
  ctx.stroke();

  ctx.restore();
}

function drawTunnelObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: readonly TunnelObstacle[],
  h: number,
  time: number,
): void {
  const topAnchor = Math.max(0, 112 + TUNNEL_WALL_MAX_INSET - 14);
  const bottomAnchor = Math.min(h, h - 38 - TUNNEL_WALL_MAX_INSET + 14);

  for (const obs of obstacles) {
    ctx.save();
    if (obs.hit) {
      ctx.globalAlpha = 0.52;
    }

    if (obs.kind === 'stalactite') {
      drawRockSpire(ctx, obs.x, topAnchor - 16, obs.topBottomY, obs.width, true, obs.id);
    } else if (obs.kind === 'stalagmite') {
      drawRockSpire(ctx, obs.x, obs.bottomTopY, bottomAnchor + 16, obs.width, false, obs.id);
    } else if (obs.kind === 'narrowCorridor') {
      const left = obs.x - obs.width / 2;
      // Ceiling squeeze block + floor squeeze block forming a tight horizontal hallway
      drawStoneMasonryRect(
        ctx,
        left,
        topAnchor - 14,
        obs.width,
        Math.max(20, obs.topBottomY - (topAnchor - 14)),
        obs.id,
        'bottom',
      );
      drawStoneMasonryRect(
        ctx,
        left,
        obs.bottomTopY,
        obs.width,
        Math.max(20, bottomAnchor + 14 - obs.bottomTopY),
        obs.id + 3,
        'top',
      );
      // Subtle cyan flight guides inside narrow corridor
      drawPassableHoleChevrons(ctx, obs.x - obs.width * 0.25, obs.topBottomY, obs.bottomTopY, time);
      drawPassableHoleChevrons(ctx, obs.x + obs.width * 0.25, obs.topBottomY, obs.bottomTopY, time);
    } else if (obs.kind === 'doubleGap') {
      const left = obs.x - obs.width / 2;
      const g1Top = obs.gap1Top ?? obs.topBottomY;
      const g1Bottom = obs.gap1Bottom ?? g1Top + 120;
      const g2Top = obs.gap2Top ?? obs.bottomTopY - 120;
      const g2Bottom = obs.gap2Bottom ?? obs.bottomTopY;

      // 1. Top wall
      drawStoneMasonryRect(
        ctx,
        left,
        topAnchor - 14,
        obs.width,
        Math.max(14, g1Top - (topAnchor - 14)),
        obs.id,
        'bottom',
      );
      // 2. Solid middle stone divider separating the 2 passable holes!
      drawStoneMasonryRect(
        ctx,
        left,
        g1Bottom,
        obs.width,
        Math.max(24, g2Top - g1Bottom),
        obs.id + 2,
        'both',
      );
      // 3. Bottom wall
      drawStoneMasonryRect(
        ctx,
        left,
        g2Bottom,
        obs.width,
        Math.max(14, bottomAnchor + 14 - g2Bottom),
        obs.id + 4,
        'top',
      );

      // Visual directional chevrons in BOTH passable holes
      drawPassableHoleChevrons(ctx, obs.x, g1Top, g1Bottom, time);
      drawPassableHoleChevrons(ctx, obs.x, g2Top, g2Bottom, time);
    } else if (obs.kind === 'spinningGear') {
      drawSpinningGearObstacle(
        ctx,
        obs.x,
        obs.blockY ?? h * 0.5,
        obs.gearRadius ?? obs.width * 0.5,
        obs.gearAngle ?? time * 5,
        obs.gearMountSide ?? 'top',
        topAnchor,
        bottomAnchor,
        time,
      );
    } else if (obs.kind === 'movingIronPlate') {
      drawMovingIronPlateObstacle(ctx, obs, topAnchor, bottomAnchor, time);
    } else {
      // Textured stone & riveted hazard monolith block
      const by = obs.blockY ?? h * 0.5;
      const bh = obs.blockH ?? 92;
      const bx = obs.x - obs.width / 2;
      const topY = by - bh / 2;

      drawStoneMasonryRect(ctx, bx, topY, obs.width, bh, obs.id, 'both');

      // Riveted iron plate in center
      ctx.fillStyle = '#EA580C';
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(bx + 10, topY + 14, obs.width - 20, bh - 28, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFDF9';
      ctx.font = '900 20px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AWAS!', obs.x, by + 1);
    }
    ctx.restore();
  }
}

/**
 * Renders the dimmed "Lorong Gelap" lighting layer within an already-clipped tunnel arch.
 */
function drawTunnelDarknessSpotlight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  heroX: number,
  heroY: number,
  clipLeft: number,
  clipRight: number,
  darknessAlpha: number,
): void {
  const strength = Math.max(0.45, darknessAlpha);

  // Soft forward headlight glow cone radiating from superhero into the dark cave
  const beamStartX = heroX + 36;
  const beamStartY = heroY - 12;
  const beamReach = Math.min(w - beamStartX + 40, 440);

  if (darknessAlpha > 0.05) {
    const beamGrad = ctx.createLinearGradient(beamStartX, beamStartY, beamStartX + beamReach, beamStartY);
    beamGrad.addColorStop(0, `rgba(254, 249, 195, ${0.34 * darknessAlpha})`);
    beamGrad.addColorStop(0.55, `rgba(186, 230, 253, ${0.16 * darknessAlpha})`);
    beamGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(beamStartX, beamStartY - 18);
    ctx.lineTo(beamStartX + beamReach, beamStartY - 168);
    ctx.lineTo(beamStartX + beamReach, beamStartY + 188);
    ctx.lineTo(beamStartX, beamStartY + 24);
    ctx.closePath();
    ctx.fill();
  }

  // Moody cave darkness vignette strictly inside the tunnel bounds
  const spotX = Math.min(w * 0.56, Math.max(clipLeft + 90, heroX + 120));
  const spotY = heroY;
  const outerR = Math.max(w, h) * 0.78;
  const vig = ctx.createRadialGradient(spotX, spotY, 125, spotX, spotY, outerR);
  vig.addColorStop(0, 'rgba(10, 14, 34, 0)');
  vig.addColorStop(0.44, `rgba(10, 14, 34, ${0.24 * strength})`);
  vig.addColorStop(1, `rgba(7, 10, 26, ${0.72 * strength})`);
  ctx.fillStyle = vig;
  ctx.fillRect(clipLeft, 0, clipRight - clipLeft, h);
}

/**
 * Renders the complete Lorong Gelap scene using a single arch clip pass for interior,
 * spotlight vignette, obstacles, and ceiling/floor walls, followed by entrance/exit portals.
 */
export function drawTunnelScene(
  ctx: CanvasRenderingContext2D,
  level: number,
  w: number,
  h: number,
  scrollDist: number,
  time: number,
  heroX: number,
  heroY: number,
  tunnel: TunnelPhaseState,
  obstacles: readonly TunnelObstacle[],
): void {
  const { clipLeft, clipRight, visible } = getTunnelVisibleBounds(w, tunnel);
  if (visible) {
    ctx.save();
    traceTunnelArchClipPath(ctx, w, h, tunnel);
    ctx.clip();

    drawTunnelCaveInterior(ctx, h, scrollDist, time, clipLeft, clipRight);
    drawTunnelDarknessSpotlight(ctx, w, h, heroX, heroY, clipLeft, clipRight, tunnel.darknessAlpha);
    if (obstacles.length > 0) {
      drawTunnelObstacles(ctx, obstacles, h, time);
    }
    drawTunnelCeilingAndFloorWalls(ctx, h, scrollDist, clipLeft, clipRight);

    ctx.restore();
  }

  drawTunnelPortals(ctx, level, w, h, time, tunnel);
}
