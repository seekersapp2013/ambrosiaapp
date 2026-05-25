const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function main() {
  const img = await loadImage(path.join(__dirname, '../assets/images/logo.png'));
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  console.log('Image size:', img.width, 'x', img.height);
  
  // Sample a grid of pixels to find the dominant red
  const colors = {};
  for (let y = 0; y < img.height; y += 2) {
    for (let x = 0; x < img.width; x += 2) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      const r = d[0], g = d[1], b = d[2], a = d[3];
      if (a < 128) continue; // skip transparent
      // Only collect reddish pixels (r dominant, not too dark)
      if (r > 120 && r > g * 1.5 && r > b * 1.5) {
        const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
        colors[hex] = (colors[hex] || 0) + 1;
      }
    }
  }
  
  const sorted = Object.entries(colors).sort((a,b) => b[1]-a[1]).slice(0, 20);
  console.log('Top red pixels:');
  sorted.forEach(([hex, count]) => console.log(hex, count));
}

main().catch(console.error);
