const fs = require('fs');
const path = require('path');

const files = ['icon.png', 'adaptive-icon.png', 'logo.png', 'logo2.png'];
files.forEach(f => {
  const p = path.join(__dirname, 'assets', 'images', f);
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    // PNG header: width at offset 16, height at offset 20 (4 bytes each, big-endian)
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      console.log(f + ': ' + w + 'x' + h + (w === h ? ' (square)' : ' (NOT square)'));
    }
  }
});
