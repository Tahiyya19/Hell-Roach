/* Hellroach — hellscape background with layered parallax, drifting embers,
   a brimstone ground, and the rotating disco-light overlay. */
'use strict';

class Background {
  constructor(ctx) {
    this.ctx = ctx;
    this.t = 0;
    this.panX = 400;          // starts centered on the art; grows forever for the loop
    this.offsetFar = 0;
    this.offsetNear = 0;
    this.offsetGround = 0;
    this.embers = [];

    // cached sky gradient
    const H = CONFIG.H, gH = CONFIG.groundHeight;
    const sky = ctx.createLinearGradient(0, 0, 0, H - gH);
    sky.addColorStop(0, '#150303');
    sky.addColorStop(0.45, '#3a0b06');
    sky.addColorStop(0.8, '#7a1d09');
    sky.addColorStop(1, '#a83a12');
    this.sky = sky;

    // cached lava glows
    this.glowLocs = [
      { x: 80, r: 300, ph: 0 },
      { x: 340, r: 260, ph: 2.1 },
      { x: 210, r: 220, ph: 4.0 },
    ];
    this.glowGrads = this.glowLocs.map(l => {
      const g = ctx.createRadialGradient(l.x, H - gH, 10, l.x, H - gH, l.r);
      g.addColorStop(0, 'rgba(255,120,30,0.55)');
      g.addColorStop(0.5, 'rgba(200,60,15,0.22)');
      g.addColorStop(1, 'rgba(120,20,5,0)');
      return g;
    });

    // ground edge heights: one seamless period of 480px
    this.groundEdge = [];
    for (let i = 0; i <= 12; i++) this.groundEdge.push(hash(i * 3.3) * 9);
    // lava cracks
    this.cracks = [];
    for (let i = 0; i < 5; i++) {
      const c = { x: hash(i * 11.7) * CONFIG.W, segs: [] };
      const n = 3 + Math.floor(hash(i * 5.1) * 3);
      let y = -2;
      for (let j = 0; j < n; j++) {
        y += 10 + hash(i * 7.7 + j) * 14;
        c.segs.push({ x: c.x + (hash(i * 3.9 + j) - 0.5) * 34, y });
      }
      this.cracks.push(c);
    }
  }

  update(sdt, disco) {
    this.t += sdt;
    this.panX += 9 * sdt;
    this.offsetFar += 26 * sdt;
    this.offsetNear += 52 * sdt;
    this.offsetGround += 95 * sdt;
    this._updateEmbers(sdt, disco);
  }

  _updateEmbers(sdt, disco) {
    const H = CONFIG.H, gH = CONFIG.groundHeight;
    if (this.embers.length < (disco ? 70 : 46) && Math.random() < 0.55) {
      this.embers.push({
        x: Math.random() * CONFIG.W,
        y: H - gH + Math.random() * 26,
        vy: 16 + Math.random() * 34,
        vx: (Math.random() - 0.5) * 14,
        r: 1 + Math.random() * 2.3,
        life: 0,
        maxLife: 2.5 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        ash: Math.random() < 0.35,
      });
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const e = this.embers[i];
      e.life += sdt;
      if (e.life > e.maxLife) { this.embers.splice(i, 1); continue; }
      e.y -= e.vy * sdt;
      e.x += (e.vx + Math.sin(this.t * 2 + e.phase) * 16) * sdt;
    }
  }

  draw(ctx, t) {
    const W = CONFIG.W, H = CONFIG.H, gH = CONFIG.groundHeight, gy = H - gH;

    // user-supplied background art: cover-fit, sliding left forever. Every
    // other copy is mirrored so the seam lines up — a true continuous loop
    // with no jump when the pan wraps.
    const img = Assets.background;
    if (Assets.ready(img)) {
      const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * sc;
      const dh = img.naturalHeight * sc;
      const period = dw * 2;
      const dx = -(this.panX % period);   // ∈ (-period, 0], slides left as panX grows
      for (let k = 0; k < 3; k++) {
        const x = dx + k * dw;
        if (x > W) continue;
        if (k % 2 === 0) {
          ctx.drawImage(img, x, 0, dw, dh);
        } else {
          ctx.save();
          ctx.translate(x + dw, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, dw, dh);
          ctx.restore();
        }
      }
      this._drawEmbers(ctx);
      return;
    }

    // sky
    ctx.fillStyle = this.sky;
    ctx.fillRect(0, 0, W, H);

    // pulsing lava glow on the horizon
    for (let i = 0; i < this.glowLocs.length; i++) {
      const l = this.glowLocs[i];
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 1.3 + l.ph);
      ctx.fillStyle = this.glowGrads[i];
      ctx.fillRect(l.x - l.r, gy - l.r, l.r * 2, l.r * 2);
    }
    ctx.globalAlpha = 1;

    // distant + near rock spire layers
    this._drawSpires(ctx, this.offsetFar, 0.75, '#200609', 130, 300);
    this._drawSpires(ctx, this.offsetNear, 1.15, '#2e0b0c', 90, 240);

    this._drawEmbers(ctx);

    this._drawGround(ctx, t, gy, gH);
  }

  /* Drifting embers / ash, drawn on top of either background style. */
  _drawEmbers(ctx) {
    for (const e of this.embers) {
      const aIn = Math.min(1, e.life / 0.6);
      const aOut = Math.min(1, (e.maxLife - e.life) / 0.9);
      const a = Math.max(0, Math.min(aIn, aOut));
      ctx.globalAlpha = a * (e.ash ? 0.5 : 0.9);
      ctx.fillStyle = e.ash ? '#c9c2b4' : `hsl(${28 + Math.random() * 14}, 100%, ${52 + Math.random() * 22}%)`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = a * 0.35;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawSpires(ctx, offset, scale, color, minH, maxH) {
    const W = CONFIG.W, H = CONFIG.H;
    const tile = 240;
    const base = Math.floor(offset / tile);
    const fx = offset % tile;
    ctx.fillStyle = color;
    const count = Math.ceil(W / tile) + 2;
    for (let i = base; i < base + count; i++) {
      const seed = hash(i * 7.31);
      const sx = i * tile - fx;
      const w = tile * (0.75 + seed * 0.55);
      const h = minH + hash(i * 3.17) * (maxH - minH);
      const top = H - CONFIG.groundHeight - h * scale * 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, H);
      const steps = 5;
      for (let j = 0; j <= steps; j++) {
        const u = j / steps;
        const y = top + hash(i * 13.1 + j * 0.7) * h * 0.16 * scale;
        ctx.lineTo(sx + w * u, y);
      }
      ctx.lineTo(sx + w, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawGround(ctx, t, gy, gH) {
    const W = CONFIG.W, H = CONFIG.H;
    // base rock
    const g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, '#2b0b05');
    g.addColorStop(1, '#100304');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, W, gH);

    // glowing molten top edge (scrolling, seamless)
    const period = 480;
    const off = this.offsetGround % period;
    const startIdx = Math.floor(off / 40);
    const frac = (off % 40) / 40;
    ctx.beginPath();
    ctx.moveTo(0, gy + 4);
    for (let i = 0; i <= 12; i++) {
      const idx = (startIdx + i) % 12;
      const x = i * 40 - frac * 40;
      ctx.lineTo(x, gy + 3 + this.groundEdge[idx]);
    }
    ctx.lineTo(W, gy + 3 + this.groundEdge[(startIdx + 12) % 12]);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = '#3d1206';
    ctx.fill();
    // hot brimstone line
    ctx.strokeStyle = `rgba(255,${140 + Math.round(60 * Math.sin(t * 2.4))},40,0.9)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, gy + 4);
    for (let i = 0; i <= 12; i++) {
      const idx = (startIdx + i) % 12;
      const x = i * 40 - frac * 40;
      ctx.lineTo(x, gy + 3 + this.groundEdge[idx]);
    }
    ctx.stroke();

    // lava cracks
    for (let i = 0; i < this.cracks.length; i++) {
      const c = this.cracks[i];
      const pulse = 0.35 + 0.3 * Math.sin(t * 1.8 + i * 1.9);
      ctx.strokeStyle = `rgba(255,110,25,${pulse})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(c.x, gy);
      for (const s of c.segs) ctx.lineTo(s.x, Math.min(H, gy + s.y));
      ctx.stroke();
    }

    // glow strip along the edge
    const glow = ctx.createLinearGradient(0, gy, 0, gy + 8);
    glow.addColorStop(0, 'rgba(255,150,50,0.55)');
    glow.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, gy, W, 8);
  }

  /* ------------------------------------------------ disco overlay -- */

  drawDisco(ctx, t) {
    const W = CONFIG.W;
    const bx = W - 66, by = 54; // disco ball position

    // rotating light rays fanning down from the ball
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fanCenter = Math.PI / 2 + Math.sin(t * 0.7) * 0.35;
    const spread = 2.3;
    const rays = 12;
    for (let k = 0; k < rays; k++) {
      const a = fanCenter - spread / 2 + (k / (rays - 1)) * spread + Math.sin(t * 0.9 + k) * 0.05;
      const hue = (k * 30 + t * 160) % 360;
      ctx.fillStyle = `hsla(${hue}, 95%, 62%, ${0.05 + 0.035 * Math.sin(t * 3 + k * 1.7)})`;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a - 0.07) * 1000, by + Math.sin(a - 0.07) * 1000);
      ctx.lineTo(bx + Math.cos(a + 0.07) * 1000, by + Math.sin(a + 0.07) * 1000);
      ctx.closePath();
      ctx.fill();
    }

    // whole-scene color wash
    ctx.fillStyle = `hsla(${(t * 90) % 360}, 90%, 55%, 0.035)`;
    ctx.fillRect(0, 0, W, CONFIG.H);
    ctx.restore();

    // disco ball
    ctx.save();
    const r = 20;
    const g = this.ctx.createRadialGradient(bx - 6, by - 7, 2, bx, by, r);
    g.addColorStop(0, '#f4f4ff');
    g.addColorStop(1, '#9a9ab5');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = 'rgba(60,60,90,0.5)';
    ctx.lineWidth = 1;
    ctx.translate(bx, by);
    ctx.rotate(t * 0.6);
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * 5, -r); ctx.lineTo(i * 5, r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r, i * 5); ctx.lineTo(r, i * 5); ctx.stroke();
    }
    ctx.restore();
    // sparkle highlight
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(bx - 6, by - 7, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // twinkling star sparkles
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 16; k++) {
      const px = (hash(k * 3.1) * W + t * 14 * (k % 2 === 0 ? 1 : -1)) % W;
      const py = 90 + hash(k * 7.7) * (CONFIG.H - 220);
      const tw = Math.max(0, Math.sin(t * 2.4 + k * 2.2));
      if (tw < 0.2) continue;
      ctx.fillStyle = `hsla(${(k * 47 + t * 120) % 360}, 100%, 80%, ${tw * 0.5})`;
      ctx.beginPath(); ctx.arc(px, py, 1 + tw * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
