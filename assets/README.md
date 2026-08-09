# Assets

User-supplied art and music for Hellroach. Swap any file here to re-skin the
game — no code changes needed (except pointing `js/config.js` at a new file
for the music slots).

| File | Used for | Where |
|---|---|---|
| `background.png` | hellscape backdrop (cover-fit, slow pan) | drawn by `js/background.js` |
| `roach-default.png` | the player roach | `js/sprites.js` |
| `roach-disco.png` | player roach during disco (sunglasses + jacket) | `js/sprites.js` |
| `roach-bikini.png` | NPC roaches perched on sunflowers during disco | `js/sprites.js` |
| `disco-music.mp3` | plays ONLY during the 5s disco window | `CONFIG.discoMusicUrl` |

## Music

- **Main music:** by default the game plays a built-in synth loop. To use a
  file instead, copy a **properly licensed / royalty-free** `.mp3`/`.ogg` here
  and set `CONFIG.musicUrl = 'assets/your-track.mp3'` in `js/config.js`.
- **Disco music:** the file at `CONFIG.discoMusicUrl`
  (`assets/disco-music.mp3` by default) plays only during the 5-second disco
  mode; the main music resumes after. It loops if it's shorter than the window.
