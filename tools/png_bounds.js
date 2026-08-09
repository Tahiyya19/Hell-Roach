/* Measure the visible (non-transparent) bounds of each roach PNG. */
'use strict';
const fs = require('fs');
const zlib = require('zlib');

function decodePNG(path) {
  const buf = fs.readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG: ' + path);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const idat = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(buf.slice(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * 4 + 1;
  const px = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(w * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * stride];
    const row = raw.slice(y * stride + 1, (y + 1) * stride);
    const out = Buffer.alloc(w * 4);
    if (f === 1) for (let x = 0; x < w * 4; x++) out[x] = (row[x] + (x >= 4 ? out[x - 4] : 0)) & 0xff;
    else if (f === 2) for (let x = 0; x < w * 4; x++) out[x] = (row[x] + prev[x]) & 0xff;
    else if (f === 3) for (let x = 0; x < w * 4; x++) out[x] = (row[x] + ((x >= 4 ? out[x - 4] : 0) + prev[x]) >> 1) & 0xff;
    else if (f === 4) {
      for (let x = 0; x < w * 4; x++) {
        const a = x >= 4 ? out[x - 4] : 0, b = prev[x], c = x >= 4 ? prev[x - 4] : 0;
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        out[x] = (row[x] + pr) & 0xff;
      }
    } else out.set(row);
    out.copy(px, y * w * 4);
    prev = out;
  }
  return { w, h, px };
}

function bounds(path, alphaMin) {
  const { w, h, px } = decodePNG(path);
  let minX = w, minY = h, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = px[(y * w + x) * 4 + 3];
      if (a >= alphaMin) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        count++;
      }
    }
  }
  return { w, h, bw: maxX - minX + 1, bh: maxY - minY + 1, count };
}

for (const f of process.argv.slice(2)) {
  const vis = bounds(f, 16);
  console.log(f, `frame ${vis.w}x${vis.h}  visible ${vis.bw}x${vis.bh}  frac ${(vis.bw / vis.w).toFixed(2)}x${(vis.bh / vis.h).toFixed(2)}`);
}
