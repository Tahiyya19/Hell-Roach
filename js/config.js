/* Hellroach — central game tuning. Tweak freely; nothing else needs editing for balance. */
'use strict';

const CONFIG = {
  // Canvas logical size (portrait, like classic Flappy Bird)
  W: 480,
  H: 720,
  groundHeight: 92,

  // Physics (px, seconds)
  gravity: 1800,
  flapVelocity: -500,
  maxFallSpeed: 780,

  // Player
  roachX: 118,
  roachRadius: 15,

  // Obstacles (sunflowers)
  pipeSpeed: 150,
  pipeSpacing: 310,
  pipeWidth: 84,
  pipeInsetX: 6,          // horizontal hitbox forgiveness (px each side)
  gapSize: 172,
  headRadius: 36,         // visual radius of a sunflower head

  // Gentle difficulty ramp (optional flavor — keeps classic feel early, tightens late)
  gapRamp: 0.55,          // gap shrinks this many px per point
  gapMin: 138,
  speedRamp: 0.6,         // scroll speed grows this many px/s per point
  speedRampMax: 70,

  // Disco slow-mo (earned ability)
  discoTimeScale: 0.45,      // world runs at 45% speed while active
  discoDuration: 7,          // seconds of disco per activation
  discoMeterPerPoint: 0.2,   // meter fill per pipe passed (0.2 → 5 pipes = 1 activation)

  // Audio
  musicUrl: '',              // ← drop a royalty-free .mp3/.ogg path here to replace the built-in synth loop
  discoMusicUrl: 'assets/disco-music.mp3', // ← plays ONLY during the 5s disco window, then back to musicUrl
  musicVolume: 0.5,
  sfxVolume: 0.7,
};

const STORAGE_KEY = 'hellroach.stats.v1';
const MUTE_KEY = 'hellroach.muted.v1';
