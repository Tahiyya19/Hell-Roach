/* Hellroach — sprites. Uses the user-supplied PNG art (Assets) when loaded;
   falls back to procedural canvas drawing if an image is missing or still
   loading, so the game runs offline and never breaks on a missing file. */
'use strict';

function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/* ---------------------------------------------------------------- roach -- */

const ROACH_IMG_H = 80;   // drawn height of the default roach at scale 1
const DISCO_IMG_H = 45;   // drawn height of the disco roach at scale 1 (2 sizes smaller than default:
                          //   its PNG has less transparent padding, so it would otherwise render ~2× bigger)
const BIKINI_IMG_H = 180; // drawn height of a bikini roach NPC at scale 1 (3 sizes bigger; perched at 0.55)

/*
 * opts: {
 *   angle, wing (0..1 flap energy), t (time), scale,
 *   disco (bool), sunglasses (bool), bikini (bool), dance (bool)
 * }
 *
 * Draws the matching user-supplied PNG when available (default / disco /
 * bikini roach), otherwise falls back to the procedural roach below.
 */
function drawRoach(ctx, x, y, o) {
  o = o || {};
  const img = o.bikini ? Assets.roachBikini
    : (o.sunglasses || o.disco) ? Assets.roachDisco
    : Assets.roachDefault;
  if (Assets.ready(img)) {
    drawRoachImage(ctx, x, y, o, img);
    return;
  }
  drawRoachProcedural(ctx, x, y, o);
}

function drawRoachImage(ctx, x, y, o, img) {
  const t = o.t || 0;
  const s = o.scale || 1;
  const bikini = !!o.bikini;
  const disco = !!o.disco;
  const h = (bikini ? BIKINI_IMG_H : (o.sunglasses || o.disco) ? DISCO_IMG_H : ROACH_IMG_H) * s;
  const w = h * (img.naturalWidth / img.naturalHeight);
  const wing = o.wing || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.angle || 0);
  // flap: brief upward pitch + squash-and-stretch when the wings deploy
  if (wing > 0.08) {
    ctx.rotate(-Math.sin(t * 46) * wing * 0.14);
    ctx.scale(1 + wing * 0.05, 1 - wing * 0.07);
  }
  // disco player roach bops; NPCs sway gently on their perch
  if (disco && !bikini && o.dance !== false) ctx.translate(0, Math.sin(t * 7) * 2.2);
  if (bikini) ctx.rotate(Math.sin(t * 2.2) * 0.05);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/* Procedural fallback (also used until the PNGs finish loading). */
function drawRoachProcedural(ctx, x, y, o) {
  o = o || {};
  const t = o.t || 0;
  const s = o.scale || 1;
  const disco = !!o.disco;
  const dance = disco && o.dance !== false;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.angle || 0);
  ctx.scale(s, s);
  if (dance) ctx.translate(0, Math.sin(t * 7) * 1.8);

  const legSpeed = disco ? 15 : 9;
  const legAmp = disco ? 3.6 : 2.2;

  // legs (drawn under the body)
  ctx.strokeStyle = '#5a3818';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const lx = -10 + i * 7;
    const wig = Math.sin(t * legSpeed + i * 1.4) * legAmp;
    const reach = i === 1 ? 8 : 6;
    // front-side leg
    ctx.beginPath();
    ctx.moveTo(lx, -4);
    ctx.lineTo(lx + 2 + wig * 0.4, reach - 2);
    ctx.lineTo(lx + 5 + wig, reach + 3);
    ctx.stroke();
    // back-side leg
    ctx.beginPath();
    ctx.moveTo(lx, 1);
    ctx.lineTo(lx - 2 - wig * 0.4, reach - 1);
    ctx.lineTo(lx - 5 - wig, reach + 4);
    ctx.stroke();
  }

  // wings (behind the body): extend & flap right after a flap, folded nubs otherwise
  const wing = o.wing || 0;
  if (wing > 0.08) {
    const wf = Math.sin(t * 46) * wing;
    ctx.fillStyle = 'rgba(228,198,150,0.55)';
    ctx.strokeStyle = 'rgba(140,100,50,0.75)';
    ctx.lineWidth = 1.2;
    for (const side of [1, -1]) {
      ctx.save();
      ctx.translate(-7, -6);
      ctx.rotate(wf * 0.95 * side);
      ctx.beginPath();
      ctx.ellipse(-4, 0, 10.5, 5.5, -0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    ctx.fillStyle = 'rgba(176,138,86,0.5)';
    ctx.beginPath(); ctx.ellipse(-9, -7, 3.4, 4.6, -0.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-5.5, -8.5, 3.4, 4.6, -0.35, 0, Math.PI * 2); ctx.fill();
  }

  // body
  const bg = ctx.createRadialGradient(-4, -5, 2, 0, 0, 19);
  bg.addColorStop(0, '#a06f3c');
  bg.addColorStop(1, '#6b4422');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 0, 15.5, 10.5, 0, 0, Math.PI * 2); ctx.fill();
  // shell crease
  ctx.strokeStyle = 'rgba(58,34,14,0.5)';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-2.5, -9.5); ctx.quadraticCurveTo(4.5, 0, -2.5, 9.5); ctx.stroke();
  // subtle shine
  ctx.fillStyle = 'rgba(255,220,160,0.28)';
  ctx.beginPath(); ctx.ellipse(-4, -6, 4.5, 2.6, -0.5, 0, Math.PI * 2); ctx.fill();

  // bikini (NPC roaches perched on sunflowers)
  if (o.bikini) {
    ctx.fillStyle = '#ff4f9a';
    ctx.strokeStyle = '#c22a6a';
    ctx.lineWidth = 1;
    for (const bx of [-3, 6]) {
      ctx.beginPath();
      ctx.moveTo(bx, -4.5);
      ctx.lineTo(bx + 5, -8.5);
      ctx.lineTo(bx + 9, -4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // head
  const hg = ctx.createRadialGradient(14.5, -4.5, 1, 14.5, -3, 9.5);
  hg.addColorStop(0, '#b5804a');
  hg.addColorStop(1, '#7d5228');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(14.5, -3, 8.2, 7.4, 0.12, 0, Math.PI * 2); ctx.fill();

  // antennae
  ctx.strokeStyle = '#4a2c12';
  ctx.lineWidth = 1.8;
  for (const side of [1, -1]) {
    const tw = Math.sin(t * 12 + side) * 2.4;
    ctx.beginPath();
    ctx.moveTo(13, -9.5);
    ctx.quadraticCurveTo(18 + side * 3, -16 + tw * 0.4, 24 + side * 2, -14 + tw);
    ctx.stroke();
    ctx.fillStyle = '#2e1a0a';
    ctx.beginPath(); ctx.arc(24 + side * 2, -14 + tw, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // eyes (hidden under sunglasses)
  if (!o.sunglasses) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 0.8;
    for (const ex of [16.5, 11.5]) {
      ctx.beginPath(); ctx.arc(ex, -6.5, 2.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1c1006';
      ctx.beginPath(); ctx.arc(ex + 1.2, -6.2, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
    }
  }

  // sunglasses (disco roach)
  if (o.sunglasses) {
    ctx.fillStyle = '#14100c';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(8.5, -10, 7.4, 4.8, 1.6);
    ctx.roundRect(14.5, -10, 7.4, 4.8, 1.6);
    ctx.fill();
    ctx.stroke();
    // arms
    ctx.beginPath();
    ctx.moveTo(9, -8.6); ctx.lineTo(1, -7.5);
    ctx.moveTo(21.4, -8.6); ctx.lineTo(24, -6.5);
    ctx.stroke();
    // disco glint
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(11.5, -8.3, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(17.5, -8.3, 0.9, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

/* ------------------------------------------------------------ sunflower -- */

/* Head: bright petals + dark disc, with sleepy watching eyes. */
function drawSunflowerHead(ctx, x, y, r, t, hueShift) {
  ctx.save();
  ctx.translate(x, y);

  // petals
  const petals = 12;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const wob = 1 + 0.05 * Math.sin(t * 2.2 + i * 1.7);
    ctx.save();
    ctx.rotate(a);
    ctx.translate(r * 0.52, 0);
    ctx.scale(1, wob);
    const hue = hueShift || 0;
    ctx.fillStyle = i % 2 === 0 ? `hsl(${46 + hueShift}, 96%, 58%)` : `hsl(${36 + hueShift}, 96%, 52%)`;
    ctx.strokeStyle = 'rgba(120,70,0,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.52, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // disc
  const dg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.1, 0, 0, r * 0.56);
  dg.addColorStop(0, '#5c3a16');
  dg.addColorStop(1, '#331f0c');
  ctx.fillStyle = dg;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(20,10,0,0.6)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // seed speckles
  ctx.fillStyle = 'rgba(20,10,0,0.4)';
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4 + 0.4;
    const rr = r * (0.2 + 0.28 * Math.abs(Math.sin(i * 3.7)));
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // sleepy watching eyes (comedy)
  ctx.strokeStyle = 'rgba(15,8,0,0.85)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * r * 0.19, -r * 0.04, r * 0.1, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, r * 0.12, r * 0.07, 0, Math.PI);
  ctx.stroke();

  ctx.restore();
}

/* Quadratic bezier point helper. */
function qbez(p0, p1, p2, u) {
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
}

/* Curling vine stem. dir: -1 = curl up (top sunflower), +1 = curl down. */
function drawVineStem(ctx, x, yHead, yEnd, t, dir, swayPhase) {
  ctx.save();
  const curl = dir * (26 + 12 * Math.sin(t * 1.1 + swayPhase));
  const p0 = { x, y: yHead };
  const p1 = { x: x + curl * 0.6, y: (yHead + yEnd) / 2 + Math.sin(t * 1.4 + swayPhase) * 10 };
  const p2 = { x: x + curl, y: yEnd };

  // main stem
  ctx.strokeStyle = '#2f6b2c';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  ctx.stroke();

  // lighter core for depth
  ctx.strokeStyle = '#4a9a44';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
  ctx.stroke();

  // little leaves along the vine
  ctx.fillStyle = '#3f8a3a';
  const nLeaves = 5;
  for (let i = 1; i <= nLeaves; i++) {
    const u = i / (nLeaves + 1);
    const b = qbez(p0, p1, p2, u);
    const la = Math.sin(u * 9 + swayPhase) * 0.8 + Math.PI / 2 + dir * 0.5;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(la + Math.sin(t * 2 + i) * 0.15);
    ctx.beginPath();
    ctx.ellipse(0, -6, 7, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* Full sunflower pipe: stem + head. gapEdgeY is where the head's petals meet the gap. */
function drawSunflowerPipe(ctx, p, t, disco) {
  const W = CONFIG.W, H = CONFIG.H;
  const hr = CONFIG.headRadius;
  const cx = p.x + CONFIG.pipeWidth / 2;

  // top sunflower: head hangs into the gap, stem curls up off-screen
  const topHeadY = p.gapY - p.gap / 2 - hr;
  drawVineStem(ctx, cx, topHeadY + hr * 0.4, -40, t, -1, p.seed * 10);
  drawSunflowerHead(ctx, cx, topHeadY, hr, t, disco ? Math.sin(t * 2 + p.seed) * 40 : 0);

  // bottom sunflower: head rises from the gap, stem curls down to the ground
  const botHeadY = p.gapY + p.gap / 2 + hr;
  drawVineStem(ctx, cx, botHeadY - hr * 0.4, H + 20, t, 1, p.seed * 10 + 5);
  drawSunflowerHead(ctx, cx, botHeadY, hr, t, disco ? Math.sin(t * 2 + p.seed + 2) * 40 : 0);

  // disco: bikini-clad roach NPCs perch on top of the heads (cosmetic only)
  if (disco) {
    const frameH = BIKINI_IMG_H * 0.55;   // on-screen NPC frame height
    const perch = hr + frameH / 2 - 12;   // head top edge + half the NPC, minus a small foot overlap
    drawRoach(ctx, cx + 34, topHeadY - perch, {
      t, scale: 0.55, angle: 0.12, disco: true, sunglasses: true, bikini: true,
    });
    drawRoach(ctx, cx - 34, botHeadY - perch, {
      t: t + 1.3, scale: 0.55, angle: -0.12, disco: true, sunglasses: true, bikini: true,
    });
  }
}
