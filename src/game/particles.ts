type ParticleKind = 'star' | 'heart' | 'ring' | 'puff' | 'confetti';

interface Particle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FloatingPopup {
  active: boolean;
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

const STAR_COLORS = ['#FBBF24', '#FF7EB6', '#5EEAD4', '#7DD3FC', '#FDBA74'];
const PUFF_COLORS = ['#FB7185', '#FDBA74', '#FFE4E6', '#FDE047'];
const CONFETTI_COLORS = ['#FB7185', '#FBBF24', '#34D399', '#38BDF8', '#C084FC', '#F472B6'];

export class ParticlePool {
  private particles: Particle[];
  private cursor = 0;
  private popups: FloatingPopup[];
  private popupCursor = 0;

  constructor(maxParticles = 150, maxPopups = 20) {
    this.particles = Array.from({ length: maxParticles }, () => ({
      active: false,
      kind: 'star',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 6,
      rotation: 0,
      vRot: 0,
      life: 0,
      maxLife: 1,
      color: '#FBBF24',
    }));

    this.popups = Array.from({ length: maxPopups }, () => ({
      active: false,
      text: '',
      x: 0,
      y: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#16A34A',
    }));
  }

  public clear(): void {
    for (const p of this.particles) p.active = false;
    for (const pop of this.popups) pop.active = false;
  }

  private allocParticle(): Particle {
    const p = this.particles[this.cursor];
    this.cursor = (this.cursor + 1) % this.particles.length;
    return p;
  }

  public spawnFoodBurst(x: number, y: number, count = 12): void {
    // Expandable candy pop ring
    const ring = this.allocParticle();
    ring.active = true;
    ring.kind = 'ring';
    ring.x = x;
    ring.y = y;
    ring.vx = 0;
    ring.vy = 0;
    ring.size = 18;
    ring.rotation = 0;
    ring.vRot = 0;
    ring.life = 0;
    ring.maxLife = 0.34;
    ring.color = '#FBBF24';

    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 80 + Math.random() * 125;
      p.active = true;
      p.kind = i % 3 === 0 ? 'heart' : 'star';
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 65;
      p.size = 6 + Math.random() * 5;
      p.rotation = (Math.random() - 0.5) * 0.6;
      p.vRot = (Math.random() - 0.5) * 7;
      p.life = 0;
      p.maxLife = 0.52 + Math.random() * 0.25;
      p.color = STAR_COLORS[i % STAR_COLORS.length];
    }
  }

  public spawnTrapBurst(x: number, y: number, count = 14): void {
    const ring = this.allocParticle();
    ring.active = true;
    ring.kind = 'ring';
    ring.x = x;
    ring.y = y;
    ring.vx = 0;
    ring.vy = 0;
    ring.size = 24;
    ring.rotation = 0;
    ring.vRot = 0;
    ring.life = 0;
    ring.maxLife = 0.36;
    ring.color = '#FB7185';

    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 95 + Math.random() * 140;
      p.active = true;
      p.kind = i % 4 === 0 ? 'star' : 'puff';
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 45;
      p.size = 6 + Math.random() * 7;
      p.rotation = 0;
      p.vRot = (Math.random() - 0.5) * 6;
      p.life = 0;
      p.maxLife = 0.44 + Math.random() * 0.24;
      p.color = PUFF_COLORS[i % PUFF_COLORS.length];
    }
  }

  public spawnConfettiBurst(width: number, count = 32): void {
    for (let i = 0; i < count; i++) {
      const p = this.allocParticle();
      p.active = true;
      p.kind = i % 5 === 0 ? 'star' : 'confetti';
      p.x = 24 + Math.random() * (width - 48);
      p.y = -12 - Math.random() * 80;
      p.vx = (Math.random() - 0.5) * 90;
      p.vy = 110 + Math.random() * 140;
      p.size = 6 + Math.random() * 5;
      p.rotation = Math.random() * Math.PI * 2;
      p.vRot = (Math.random() - 0.5) * 9;
      p.life = 0;
      p.maxLife = 1.6 + Math.random() * 0.9;
      p.color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    }
  }

  public spawnPopup(text: string, x: number, y: number, color: string): void {
    const pop = this.popups[this.popupCursor];
    this.popupCursor = (this.popupCursor + 1) % this.popups.length;
    pop.active = true;
    pop.text = text;
    pop.x = x;
    pop.y = y;
    pop.vy = -74;
    pop.life = 0;
    pop.maxLife = 0.78;
    pop.color = color;
  }

  public update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      if (p.kind === 'ring') continue;
      if (p.kind !== 'confetti') {
        p.vy += 240 * dt;
      } else {
        p.vx += Math.sin(p.life * 6 + p.x * 0.05) * 35 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
    }

    for (const pop of this.popups) {
      if (!pop.active) continue;
      pop.life += dt;
      if (pop.life >= pop.maxLife) {
        pop.active = false;
        continue;
      }
      pop.y += pop.vy * dt;
      pop.vy *= Math.exp(-3.2 * dt);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const alpha = Math.max(0, 1 - t * t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.kind === 'ring') {
        const radius = p.size + t * 44;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 4.5 * (1 - t));
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'star') {
        drawStarPath(ctx, p.size, p.size * 0.48, 5);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (p.kind === 'heart') {
        drawMiniHeart(ctx, p.size * 0.9);
        ctx.fill();
      } else if (p.kind === 'puff') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 - t * 0.35), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.roundRect(-p.size * 0.6, -p.size * 0.35, p.size * 1.2, p.size * 0.7, 2);
        ctx.fill();
      }
      ctx.restore();
    }

    for (const pop of this.popups) {
      if (!pop.active) continue;
      const t = pop.life / pop.maxLife;
      const alpha = t < 0.16 ? t / 0.16 : Math.max(0, 1 - (t - 0.16) / 0.84);
      const scale = t < 0.18 ? 0.65 + (t / 0.18) * 0.58 : 1.23 - t * 0.22;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pop.x, pop.y);
      ctx.scale(scale, scale);
      ctx.font = '700 23px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      // Soft comic drop shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillText(pop.text, 0, 3);
      // Thick cream sticker outline
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#FFFDF9';
      ctx.strokeText(pop.text, 0, 0);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
    }
  }
}

function drawMiniHeart(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.moveTo(0, r * 0.75);
  ctx.bezierCurveTo(-r * 1.2, r * 0.1, -r * 1.1, -r * 0.9, 0, -r * 0.35);
  ctx.bezierCurveTo(r * 1.1, -r * 0.9, r * 1.2, r * 0.1, 0, r * 0.75);
  ctx.closePath();
}

function drawStarPath(
  ctx: CanvasRenderingContext2D,
  outerR: number,
  innerR: number,
  points: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
