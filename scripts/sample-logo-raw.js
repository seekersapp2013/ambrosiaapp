// Pure Node PNG pixel sampler - no external deps
// Uses zlib to decompress PNG image data
const fs = require('fs');
const zlib = require('zlib');

const buf = fs.readFileSync('assets/images/logo.png');

// Parse PNG chunks
let offset = 8; // skip PNG signature
const chunks = [];
while (offset < buf.length) {
  const length = buf.readUInt32BE(offset);
  const type = buf.slice(offset + 4, offset + 8).toString('ascii');
  const data = buf.slice(offset + 8, offset + 8 + length);
  chunks.push({ type, data });
  offset += 12 + length;
}

const ihdr = chunks.find(c => c.type === 'IHDR').data;
const width = ihdr.readUInt32BE(0);
const height = ihdr.readUInt32BE(4);
const bitDepth = ihdr[8];
const colorType = ihdr[9];
console.log(`${width}x${height} bit:${bitDepth} colorType:${colorType}`);

// Collect IDAT chunks and decompress
const idatData = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data));
const raw = zlib.inflateSync(idatData);

// colorType 6 = RGBA, 2 = RGB
const bpp = colorType === 6 ? 4 : 3;
const bytesPerRow = 1 + width * bpp; // +1 for filter byte

// Paeth predictor
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Reconstruct pixels
const pixels = Buffer.alloc(width * height * bpp);
for (let y = 0; y < height; y++) {
  const filter = raw[y * bytesPerRow];
  const rowStart = y * bytesPerRow + 1;
  const prevRowStart = (y - 1) * width * bpp;
  for (let x = 0; x < width * bpp; x++) {
    const raw_byte = raw[rowStart + x];
    const a = x >= bpp ? pixels[y * width * bpp + x - bpp] : 0;
    const b = y > 0 ? pixels[prevRowStart + x] : 0;
    const c = (x >= bpp && y > 0) ? pixels[prevRowStart + x - bpp] : 0;
    let val;
    if (filter === 0) val = raw_byte;
    else if (filter === 1) val = (raw_byte + a) & 0xff;
    else if (filter === 2) val = (raw_byte + b) & 0xff;
    else if (filter === 3) val = (raw_byte + Math.floor((a + b) / 2)) & 0xff;
    else if (filter === 4) val = (raw_byte + paeth(a, b, c)) & 0xff;
    else val = raw_byte;
    pixels[y * width * bpp + x] = val;
  }
}

// Sample reddish pixels
const colors = {};
for (let i = 0; i < pixels.length; i += bpp) {
  const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
  const a = bpp === 4 ? pixels[i+3] : 255;
  if (a < 128) continue;
  if (r > 120 && r > g * 1.4 && r > b * 1.4) {
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
    colors[hex] = (colors[hex] || 0) + 1;
  }
}

const sorted = Object.entries(colors).sort((a,b) => b[1]-a[1]).slice(0, 15);
console.log('Top red/warm pixels in logo:');
sorted.forEach(([hex, count]) => console.log(hex, 'count:', count));
