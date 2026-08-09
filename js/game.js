/* Hellroach — main game. State machine: start → playing → dying → over. */
'use strict';

/* ------------------------------------------------------------- stats -- */

const Stats = {
  _data: null,
  load() {
    if (this._data) return this._data;
    let d = { best: 0, runs: 0, total: 0 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) d = Object.assign(d, JSON.parse(raw));
    } catch (e) { /* private mode / disabled storage */ }
    this._data = d;
    return d;
  },
  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data)); } catch (e) { /* ignore */ }
  },
  record(score) {
    const d = this.load();
    d.runs += 1;
    d.total += score;
    if (score > d.best) d.best = score;
    this.save();
  },
  avg() {
    const d = this.load();
    return d.runs ? Math.round(d.total / d.runs) : 0;
  },
};

/* -------------------------------------------------------------- state -- */

const G = {
  state: 'start',           // start | playing | dying | over
  t: 0,
  roach: { y: 0, vy: 0, angle: 0, wing: 0 },
  pipes: [],
  score: 0,
  dist: 0,
  deathT: 0,
  disco: { active: false, flash: 0, meter: 0, timer: 0 },
  bg: null,
};

/* --------------------------------------------------------------- dom -- */

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const el = {
  hud: $('hud'),
  score: $('score'),
  discoBadge: $('disco-badge'),
  discoMeter: $('disco-meter'),
  discoMeterFill: $('disco-meter-fill'),
  discoBtn: $('disco-btn'),
  muteBtn: $('mute-btn'),
  start: $('start-screen'),
  startBtn: $('start-btn'),
  startBest: $('start-best'),
  startAvg: $('start-avg'),
  over: $('over-screen'),
  retryBtn: $('retry-btn'),
  finalScore: $('final-score'),
  overBest: $('over-best'),
  overAvg: $('over-avg'),
};

/* ------------------------------------------------------------ canvas -- */

let DPR = 1;
function fitCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = CONFIG.W * DPR;
  canvas.height = CONFIG.H * DPR;
  const scale = Math.min(window.innerWidth / CONFIG.W, window.innerHeight / CONFIG.H);
  canvas.style.width = Math.floor(CONFIG.W * scale) + 'px';
  canvas.style.height = Math.floor(CONFIG.H * scale) + 'px';
}
window.addEventListener('resize', fitCanvas);

/* --------------------------------------------------------------- ui -- */

function updateScoreUI() {
  el.score.textContent = G.score;
}

function updateStatsUI() {
  const s = Stats.load();
  el.startBest.textContent = s.runs ? s.best : '—';
  el.startAvg.textContent = s.runs ? Stats.avg() : '—';
}

function updateDiscoUI() {
  const d = G.disco;
  el.discoMeterFill.style.width = Math.round(d.meter * 100) + '%';
  el.discoMeter.classList.toggle('on', d.active);
  el.discoMeter.classList.toggle('ready', !d.active && d.meter >= 1);
  if (d.active) {
    el.discoBadge.classList.add('on');
    el.discoBadge.classList.remove('off');
    el.discoBadge.textContent = '🪩 ' + d.timer.toFixed(1) + 's';
    el.discoBtn.classList.add('active');
    el.discoBtn.classList.remove('locked');
  } else if (d.meter >= 1) {
    el.discoBadge.classList.remove('on', 'off');
    el.discoBadge.textContent = '🪩 READY — D!';
    el.discoBtn.classList.remove('locked');
    el.discoBtn.classList.remove('active');
  } else {
    el.discoBadge.classList.remove('on');
    el.discoBadge.classList.add('off');
    el.discoBadge.textContent = '🪩 ' + Math.ceil((1 - d.meter) / CONFIG.discoMeterPerPoint) + ' pts to disco';
    el.discoBtn.classList.add('locked');
    el.discoBtn.classList.remove('active');
  }
}

function updateMuteUI() {
  el.muteBtn.textContent = AudioSys.muted ? '🔇' : '🔊';
}

function showOver() {
  el.hud.classList.add('hidden');
  el.finalScore.textContent = G.score;
  const s = Stats.load();
  el.overBest.textContent = s.best;
  el.overAvg.textContent = Stats.avg();
  el.over.classList.remove('hidden');
  el.over.classList.add('visible');
}

function startRun() {
  G.roach.y = CONFIG.H * 0.42;
  G.roach.vy = 0;
  G.roach.angle = 0;
  G.roach.wing = 0;
  G.pipes = [];
  G.score = 0;
  G.dist = 0;
  G.deathT = 0;
  // fresh run → meter resets, any leftover disco winds down
  if (G.disco.active) { AudioSys.discoOff(); AudioSys.setDisco(false); }
  G.disco.active = false;
  G.disco.meter = 0;
  G.disco.timer = 0;
  G.disco.flash = 0;
  updateDiscoUI();
  G.state = 'playing';
  el.start.classList.add('hidden');
  el.over.classList.add('hidden');
  el.over.classList.remove('visible');
  el.hud.classList.remove('hidden');
  updateScoreUI();
}

/* ------------------------------------------------------------- input -- */

function press() {
  AudioSys.ensure();
  if (G.state === 'start') {
    startRun();
    flap();
  } else if (G.state === 'playing') {
    flap();
  } else if (G.state === 'over') {
    startRun();
    flap();
  }
}

function flap() {
  if (G.state !== 'playing') return;
  G.roach.vy = CONFIG.flapVelocity;
  G.roach.wing = 1;
  AudioSys.flap();
}

/* Earned ability: fill the meter with points (5 pipes), then D unleashes
   5 seconds of disco. It runs its course, then the meter must refill. */
function toggleDisco() {
  AudioSys.ensure();
  if (G.state !== 'playing' || G.disco.active) return;
  if (G.disco.meter < 1) { denyDisco(); return; }
  G.disco.active = true;
  G.disco.timer = CONFIG.discoDuration;
  G.disco.flash = 1;
  AudioSys.discoOn();
  AudioSys.setDisco(true);
  updateDiscoUI();
}

function deactivateDisco() {
  if (!G.disco.active) return;
  G.disco.active = false;
  G.disco.timer = 0;
  G.disco.meter = 0;
  AudioSys.discoOff();
  AudioSys.setDisco(false);
  updateDiscoUI();
}

function denyDisco() {
  G.disco.flash = -0.4;   // negative → red deny flash
  AudioSys.deny();
  el.discoBadge.classList.add('shake');
  setTimeout(() => el.discoBadge.classList.remove('shake'), 400);
}

function toggleMute() {
  AudioSys.ensure();
  AudioSys.setMuted(!AudioSys.muted);
  updateMuteUI();
}

canvas.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
    e.preventDefault();
    press();
  } else if (e.code === 'KeyD') {
    toggleDisco();
  } else if (e.code === 'KeyM') {
    toggleMute();
  }
});

el.startBtn?.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); press(); });
el.retryBtn?.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); press(); });
el.discoBtn?.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); toggleDisco(); });
el.muteBtn?.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); toggleMute(); });
el.discoBadge?.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); toggleDisco(); });

/* ---------------------------------------------------------- gameplay -- */

function spawnPipe() {
  const gap = Math.max(CONFIG.gapMin, CONFIG.gapSize - G.score * CONFIG.gapRamp);
  const margin = gap * 0.5 + 80;
  const gapY = margin + Math.random() * (CONFIG.H - CONFIG.groundHeight - margin * 2);
  G.pipes.push({ x: CONFIG.W + 40, gapY, gap, seed: Math.random(), passed: false });
}

function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw));
  const ny = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function die() {
  if (G.state !== 'playing') return;
  G.state = 'dying';
  G.deathT = 0;
  deactivateDisco();
  AudioSys.death();
  Stats.record(G.score);
}

function updatePlaying(sdt) {
  const R = CONFIG.roachRadius;
  const r = G.roach;
  const groundY = CONFIG.H - CONFIG.groundHeight;

  // physics
  r.vy = Math.min(r.vy + CONFIG.gravity * sdt, CONFIG.maxFallSpeed);
  r.y += r.vy * sdt;
  r.wing = Math.max(0, r.wing - sdt * 2.6);
  const target = clamp(r.vy * 0.0011, -0.45, 0.95);
  r.angle += (target - r.angle) * Math.min(1, sdt * 12);

  // pipes
  const speed = CONFIG.pipeSpeed + Math.min(G.score * CONFIG.speedRamp, CONFIG.speedRampMax);
  G.dist += speed * sdt;
  if (G.dist >= CONFIG.pipeSpacing) {
    spawnPipe();
    G.dist -= CONFIG.pipeSpacing;
  }
  for (let i = G.pipes.length - 1; i >= 0; i--) {
    const p = G.pipes[i];
    p.x -= speed * sdt;
    if (p.x + CONFIG.pipeWidth < -60) { G.pipes.splice(i, 1); continue; }
    if (!p.passed && p.x + CONFIG.pipeWidth < CONFIG.roachX) {
      p.passed = true;
      G.score += 1;
      G.disco.meter = Math.min(1, G.disco.meter + CONFIG.discoMeterPerPoint);
      AudioSys.score();
      updateScoreUI();
      updateDiscoUI();
    }
    // collision (sunflower head hitboxes; stems are cosmetic)
    const ins = CONFIG.pipeInsetX;
    const top = { x: p.x + ins, y: -12, w: CONFIG.pipeWidth - ins * 2, h: p.gapY - p.gap / 2 + 12 };
    const bot = { x: p.x + ins, y: p.gapY + p.gap / 2, w: CONFIG.pipeWidth - ins * 2, h: CONFIG.H - p.gapY - p.gap / 2 };
    if (circleRect(CONFIG.roachX, r.y, R, top.x, top.y, top.w, top.h) ||
        circleRect(CONFIG.roachX, r.y, R, bot.x, bot.y, bot.w, bot.h)) {
      die();
      return;
    }
  }

  // ground & ceiling
  if (r.y - R <= 0 || r.y + R >= groundY) die();
}

function updateDying(dt) {
  const R = CONFIG.roachRadius;
  const r = G.roach;
  const groundY = CONFIG.H - CONFIG.groundHeight;
  r.vy = Math.min(r.vy + CONFIG.gravity * dt, CONFIG.maxFallSpeed);
  r.y += r.vy * dt;
  r.angle += (1.45 - r.angle) * Math.min(1, dt * 8);
  if (r.y + R >= groundY) { r.y = groundY - R; r.vy = 0; }
  G.deathT += dt;
  if (G.deathT > 1.05) {
    G.state = 'over';
    showOver();
  }
}

function updateStart(sdt) {
  G.roach.y = CONFIG.H * 0.42 + Math.sin(G.t * 2.6) * 12;
  G.roach.angle = Math.sin(G.t * 2.6 + 1) * 0.08;
  G.roach.wing = Math.max(0, G.roach.wing - sdt * 2);
}

/* --------------------------------------------------------------- loop -- */

function update(dt) {
  const ts = G.disco.active ? CONFIG.discoTimeScale : 1;
  const sdt = dt * ts;
  G.t += sdt;
  if (G.disco.flash > 0) G.disco.flash = Math.max(0, G.disco.flash - dt * 2.4);
  else if (G.disco.flash < 0) G.disco.flash = Math.min(0, G.disco.flash + dt * 2.4);

  // the 5-second disco window runs on real time
  if (G.disco.active) {
    G.disco.timer -= dt;
    G.disco.meter = Math.max(0, G.disco.timer / CONFIG.discoDuration);
    updateDiscoUI();
    if (G.disco.timer <= 0) deactivateDisco();
  }

  G.bg.update(sdt, G.disco.active);

  if (G.state === 'playing') updatePlaying(sdt);
  else if (G.state === 'dying') updateDying(dt);
  else if (G.state === 'start') updateStart(sdt);
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, CONFIG.W, CONFIG.H);

  G.bg.draw(ctx, G.t);
  if (G.disco.active) G.bg.drawDisco(ctx, G.t);

  // sunflowers
  for (const p of G.pipes) {
    drawSunflowerPipe(ctx, p, G.t, G.disco.active);
  }

  // roach
  const r = G.roach;
  drawRoach(ctx, CONFIG.roachX, r.y, {
    t: G.t,
    angle: r.angle,
    wing: r.wing,
    disco: G.disco.active,
    sunglasses: G.disco.active,
  });

  // disco activation flash (white) / deny flash (red)
  if (G.disco.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${G.disco.flash * 0.22})`;
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
  } else if (G.disco.flash < 0) {
    ctx.fillStyle = `rgba(255,40,20,${-G.disco.flash * 0.26})`;
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------- init -- */

function init() {
  fitCanvas();
  G.bg = new Background(ctx);
  G.roach.y = CONFIG.H * 0.42;
  try { AudioSys.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { /* ignore */ }
  updateStatsUI();
  updateDiscoUI();
  updateMuteUI();
  requestAnimationFrame(frame);
}

init();

/* Exposed for debugging / automated checks. */
window.__game = { G, CONFIG, Stats, startRun, toggleDisco, flap, die };
