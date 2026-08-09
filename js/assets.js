/* Hellroach — asset loader. Loads the user-supplied art (background + three
   roach sprites). Each Image is exposed on the Assets object; sprites fall
   back to procedural drawing until an image finishes loading (or if a file
   is missing), so the game never breaks on a slow or absent asset. */
'use strict';

const Assets = {
  background: null,
  roachDefault: null,
  roachDisco: null,
  roachBikini: null,
  _loaded: 0,

  load() {
    const map = {
      background: 'assets/background.png',
      roachDefault: 'assets/roach-default.png',
      roachDisco: 'assets/roach-disco.png',
      roachBikini: 'assets/roach-bikini.png',
    };
    for (const key in map) {
      const im = new Image();
      im.src = map[key];
      this[key] = im;
    }
  },

  /* True when the given image finished loading (or we gave up on it). */
  ready(img) {
    return !!(img && img.complete && img.naturalWidth > 0);
  },
};

Assets.load();
