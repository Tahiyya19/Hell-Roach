# 🪳 HELLROACH

A browser-based Flappy Bird parody. Fly a cockroach through sunflower "pipes"
against a hellscape, with a signature **earned disco slow-mo** mode. Zero
dependencies — plain HTML5 Canvas + vanilla JS, no build step, works offline
from `file://`.

## Run it

Just open `index.html`, or serve the folder:

```bash
Hosted: https://tahiyya19.github.io/Hell-Roach/
```

## Controls

| Input | Action |
|---|---|
| Space / ArrowUp / Enter / Click / Tap | Flap (also starts / retries) |
| `D` or the 🕺 button | Activate disco (earned — see below) |
| `M` or the 🔊 button | Mute |

## Disco mode (earned, 5 seconds)

Disco is an **earned ability**: pass 5 sunflowers to fill the meter (shown as
the pink bar under the score), then press `D` (or 🕺) to unleash **7 seconds**
of disco:

- World slows to 45% speed (physics + scroll).
- Disco lights, a spinning ball, and a color wash flash over the scene.
- The roach swaps to the **sunglasses + sparkly disco jacket** sprite.
- **Bikini-clad roach NPCs** perch on the sunflowers, watching you fly by
  (cosmetic — no hitbox).
- The music **switches to `assets/disco-music.mp3`** for those 5 seconds, then
  back to the main music.

The meter resets after the 7 seconds (or on death) — you have to earn it again.

## Design decisions (from PRD open questions)

1. **Disco trigger** — earned ability, not a free toggle: 5 pipes fill the
   meter, one 5-second activation per fill. Slows the world to 45%, swaps in
   the disco roach + bikini-roach NPCs, and plays the separate disco track.
2. **Difficulty ramp** — gentle optional ramp included: gap narrows and scroll
   speed rises slightly as your score climbs (capped). Flat for the first ~10
   points, so it still reads as classic Flappy. Disable by zeroing the ramp
   values in `js/config.js`.
3. **Power-ups** — none beyond disco mode (MVP scope).
4. **Art** — user-supplied PNGs in `assets/` (`background.png`,
   `roach-default.png`, `roach-disco.png`, `roach-bikini.png`) drawn onto the
   canvas (roaches drawn ~2× larger so they read clearly; the background
   slides forever as a seamless mirror loop); procedural drawing remains only
   as an offline fallback.
5. **Persistence** — browser `localStorage` only. Keys:
   `hellroach.stats.v1` (best / runs / total) and `hellroach.muted.v1`.

## Music

- **Main music** — a built-in procedural funky synth-pop loop (Web Audio,
  ~112 BPM, A-minor) plays by default. To drop in a properly licensed /
  royalty-free track instead (never pull copyrighted uploads from
  Spotify/SoundCloud — those are usually unlicensed), copy a `.mp3`/`.ogg`
  into `assets/` and set `CONFIG.musicUrl = 'assets/your-track.mp3'` in
  `js/config.js`.
- **Disco music** — `assets/disco-music.mp3` (user-provided) plays **only**
  during the 5-second disco window, then the main music resumes. Point
  `CONFIG.discoMusicUrl` at any other file to swap it.

## Tuning

Everything game-feel lives in `js/config.js` — gravity, flap impulse, pipe
speed/spacing/gap, disco time scale / duration / meter cost, difficulty ramp,
volumes, and both music file slots.

## Project structure

```
index.html          shell + DOM overlays (start / HUD / game over)
css/style.css       hellish theme
js/config.js        tuning + music file slots
js/assets.js        loads the PNG art (background + roach sprites)
js/sprites.js       roach / sunflower / vine drawing (PNG-first, procedural fallback)
js/audio.js         Web Audio SFX + synth loop + main & disco music tracks
js/background.js    background art, embers, disco light overlay
js/game.js          loop, physics, collisions, scoring, disco meter, stats
assets/             your art + music (background.png, roach-*.png, disco-music.mp3)
```
