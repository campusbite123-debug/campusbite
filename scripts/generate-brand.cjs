// Rebuild all brand assets: node scripts/generate-brand.cjs
const Jimp = require('jimp-compact');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const size = 1024;
const scale = 2;
const markScale = 0.94;
const markInset = (size * (1 - markScale)) / 2;
const cream = [255, 247, 231];
const orange = [245, 107, 40];
const plate = { x: 548, y: 512, radius: 246, stroke: 108, opening: (46 * Math.PI) / 180 };
const fork = [
  { x: 492, y: 348, width: 28, height: 96, radius: 14 },
  { x: 534, y: 348, width: 28, height: 96, radius: 14 },
  { x: 576, y: 348, width: 28, height: 96, radius: 14 },
  { x: 492, y: 414, width: 112, height: 70, radius: 24 },
  { x: 530, y: 456, width: 36, height: 218, radius: 18 },
];
const capX = plate.x + plate.radius * Math.cos(plate.opening);
const capOffsetY = plate.radius * Math.sin(plate.opening);
const halfStroke = plate.stroke / 2;

function insideRoundedRect(x, y, rect) {
  const dx = Math.max(rect.x + rect.radius - x, 0, x - (rect.x + rect.width - rect.radius));
  const dy = Math.max(rect.y + rect.radius - y, 0, y - (rect.y + rect.height - rect.radius));
  return dx * dx + dy * dy <= rect.radius * rect.radius;
}

function insideMark(x, y) {
  x = (x - markInset) / markScale;
  y = (y - markInset) / markScale;
  const dx = x - plate.x;
  const dy = y - plate.y;
  const distance = Math.hypot(dx, dy);
  const ring =
    Math.abs(Math.atan2(dy, dx)) >= plate.opening &&
    distance >= plate.radius - halfStroke &&
    distance <= plate.radius + halfStroke;
  const caps =
    (x - capX) ** 2 + (y - (plate.y - capOffsetY)) ** 2 <= halfStroke ** 2 ||
    (x - capX) ** 2 + (y - (plate.y + capOffsetY)) ** 2 <= halfStroke ** 2;
  return ring || caps || fork.some((rect) => insideRoundedRect(x, y, rect));
}

function tint(mask, color) {
  const result = mask.clone();
  const pixels = result.bitmap.data;
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
  }
  return result;
}

async function main() {
  const imageDir = path.join(root, 'assets/images');
  const brandDir = path.join(root, 'assets/brand');
  await fs.mkdir(brandDir, { recursive: true });

  // A plate-shaped C and a fork, kept within Android's adaptive-icon safe area.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" fill="#FFF7E7">
  <g transform="translate(${markInset} ${markInset}) scale(${markScale})">
  <path d="M ${capX.toFixed(3)} ${(plate.y - capOffsetY).toFixed(3)} A ${plate.radius} ${plate.radius} 0 1 0 ${capX.toFixed(3)} ${(plate.y + capOffsetY).toFixed(3)}" fill="none" stroke="#FFF7E7" stroke-width="${plate.stroke}" stroke-linecap="round"/>
${fork.map((rect) => `  <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="${rect.radius}"/>`).join('\n')}
  </g>
</svg>
`;
  await fs.writeFile(path.join(brandDir, 'campusbite-mark.svg'), svg);

  // Supersample the same vector geometry, then downsample for smooth PNG edges.
  const mask = new Jimp(size * scale, size * scale, 0x00000000);
  const pixels = mask.bitmap.data;
  for (let y = 0; y < size * scale; y++) {
    for (let x = 0; x < size * scale; x++) {
      if (!insideMark((x + 0.5) / scale, (y + 0.5) / scale)) continue;
      const offset = (y * size * scale + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = pixels[offset + 3] = 255;
    }
  }
  mask.resize(size, size, Jimp.RESIZE_BICUBIC);

  const background = new Jimp(size, size);
  const backgroundPixels = background.bitmap.data;
  const top = [255, 137, 59];
  const bottom = [232, 79, 25];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const blend = (x * 0.35 + y * 0.65) / (size - 1);
      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        backgroundPixels[offset + channel] = Math.round(
          top[channel] + (bottom[channel] - top[channel]) * blend,
        );
      }
      backgroundPixels[offset + 3] = 255;
    }
  }

  const foreground = tint(mask, cream);
  const icon = background.clone().composite(foreground, 0, 0);
  await Promise.all([
    icon.writeAsync(path.join(imageDir, 'icon.png')),
    background.writeAsync(path.join(imageDir, 'android-icon-background.png')),
    foreground.writeAsync(path.join(imageDir, 'android-icon-foreground.png')),
    tint(mask, [255, 255, 255]).writeAsync(path.join(imageDir, 'android-icon-monochrome.png')),
    tint(mask, orange).writeAsync(path.join(imageDir, 'splash-icon.png')),
    icon.clone().resize(64, 64, Jimp.RESIZE_BICUBIC).writeAsync(path.join(imageDir, 'favicon.png')),
  ]);
  console.log(
    'Generated Campusbite SVG, launcher, adaptive, monochrome, splash and favicon assets.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
