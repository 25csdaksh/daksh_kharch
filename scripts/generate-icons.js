import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  function chunk(type, d) {
    const b = Buffer.alloc(12 + d.length);
    b.writeUInt32BE(d.length, 0); b.write(type, 4, 4, 'ascii');
    d.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + d.length)), 8 + d.length);
    return b;
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]);
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterPNG(width, height, raw) {
  const bpp = 4;
  const stride = width * bpp;
  const decoded = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const filterType = raw[y * (stride + 1)];
    const rowOffset = y * (stride + 1) + 1;
    const prevRowOffset = (y - 1) * stride;
    const currRowOffset = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rowOffset + x];
      const a = (x >= bpp) ? decoded[currRowOffset + x - bpp] : 0;
      const b = (y > 0) ? decoded[prevRowOffset + x] : 0;
      const c = (y > 0 && x >= bpp) ? decoded[prevRowOffset + x - bpp] : 0;
      let val = rawByte;
      if (filterType === 1) val = (rawByte + a) & 0xff;
      else if (filterType === 2) val = (rawByte + b) & 0xff;
      else if (filterType === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) val = (rawByte + paethPredictor(a, b, c)) & 0xff;
      decoded[currRowOffset + x] = val;
    }
  }
  return decoded;
}

function resampleRGBA(srcRGBA, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      const srcX = (dx + 0.5) * xRatio - 0.5;
      const srcY = (dy + 0.5) * yRatio - 0.5;
      
      const x0 = Math.max(0, Math.floor(srcX));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.max(0, Math.floor(srcY));
      const y1 = Math.min(srcH - 1, y0 + 1);
      
      const xWeight = Math.max(0, Math.min(1, srcX - x0));
      const yWeight = Math.max(0, Math.min(1, srcY - y0));
      
      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;
      
      const dstIdx = (dy * dstW + dx) * 4;
      for (let c = 0; c < 4; c++) {
        const top = srcRGBA[idx00 + c] * (1 - xWeight) + srcRGBA[idx10 + c] * xWeight;
        const bottom = srcRGBA[idx01 + c] * (1 - xWeight) + srcRGBA[idx11 + c] * xWeight;
        dst[dstIdx + c] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }
  return dst;
}

function composite(bgRGBA, size, fgRGBA, fgW, fgH, offsetX, offsetY) {
  const out = Buffer.from(bgRGBA);
  for (let y = 0; y < fgH; y++) {
    const dstY = offsetY + y;
    if (dstY < 0 || dstY >= size) continue;
    for (let x = 0; x < fgW; x++) {
      const dstX = offsetX + x;
      if (dstX < 0 || dstX >= size) continue;
      const fgIdx = (y * fgW + x) * 4;
      const dstIdx = (dstY * size + dstX) * 4;
      const fa = fgRGBA[fgIdx + 3] / 255;
      if (fa <= 0) continue;
      const ba = out[dstIdx + 3] / 255;
      const outA = fa + ba * (1 - fa);
      for (let c = 0; c < 3; c++) {
        const fCol = fgRGBA[fgIdx + c];
        const bCol = out[dstIdx + c];
        out[dstIdx + c] = Math.round((fCol * fa + bCol * ba * (1 - fa)) / (outA || 1));
      }
      out[dstIdx + 3] = Math.round(outA * 255);
    }
  }
  return out;
}

// Read original logo
const logoPath = path.resolve('public/hisabsetu-logo.png');
const buf = fs.readFileSync(logoPath);
let pos = 8, chunks = [], width, height;
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IHDR') {
    width = buf.readUInt32BE(pos + 8);
    height = buf.readUInt32BE(pos + 12);
  } else if (type === 'IDAT') chunks.push(buf.subarray(pos + 8, pos + 8 + len));
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(chunks));
const decoded = unfilterPNG(width, height, raw);

// Emblem bounding box inside hisabsetu-logo.png
// minX: 323, maxX: 755 (width: 433)
// minY: 5, maxY: 364 (height: 360)
const srcCropX = 320;
const srcCropY = 4;
const srcCropW = 440;
const srcCropH = 362;

const emblemCrop = Buffer.alloc(srcCropW * srcCropH * 4);
for (let y = 0; y < srcCropH; y++) {
  for (let x = 0; x < srcCropW; x++) {
    const sIdx = ((srcCropY + y) * width + (srcCropX + x)) * 4;
    const dIdx = (y * srcCropW + x) * 4;
    emblemCrop[dIdx] = decoded[sIdx];
    emblemCrop[dIdx+1] = decoded[sIdx+1];
    emblemCrop[dIdx+2] = decoded[sIdx+2];
    emblemCrop[dIdx+3] = decoded[sIdx+3];
  }
}

// 1. Generate 512x512 emblem centered on transparent background
const emblem512 = Buffer.alloc(512 * 512 * 4, 0);
// scale emblem to fit 440px box inside 512x512
const embScaledW = 440;
const embScaledH = Math.round(srcCropH * (embScaledW / srcCropW));
const embScaled = resampleRGBA(emblemCrop, srcCropW, srcCropH, embScaledW, embScaledH);
const offX = Math.round((512 - embScaledW) / 2);
const offY = Math.round((512 - embScaledH) / 2);
const finalEmblem512 = composite(emblem512, 512, embScaled, embScaledW, embScaledH, offX, offY);

fs.writeFileSync('public/hisabsetu-emblem.png', encodePNG(512, 512, finalEmblem512));
fs.writeFileSync('src/assets/hisabsetu-emblem.png', encodePNG(512, 512, finalEmblem512));
console.log('Saved public/hisabsetu-emblem.png & src/assets/hisabsetu-emblem.png (512x512)');

// Densities and sizes
const densities = [
  { name: 'mipmap-mdpi', iconSize: 48, adaptiveSize: 108 },
  { name: 'mipmap-hdpi', iconSize: 72, adaptiveSize: 162 },
  { name: 'mipmap-xhdpi', iconSize: 96, adaptiveSize: 216 },
  { name: 'mipmap-xxhdpi', iconSize: 144, adaptiveSize: 324 },
  { name: 'mipmap-xxxhdpi', iconSize: 192, adaptiveSize: 432 }
];

densities.forEach(({ name, iconSize, adaptiveSize }) => {
  const dir = path.resolve('android/app/src/main/res', name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // A. Adaptive Foreground (108dp canvas, emblem safe-zone ~60-66% of canvas)
  const fgW = Math.round(adaptiveSize * 0.62);
  const fgH = Math.round(fgW * (srcCropH / srcCropW));
  const fgScaled = resampleRGBA(emblemCrop, srcCropW, srcCropH, fgW, fgH);
  const fgCanvas = Buffer.alloc(adaptiveSize * adaptiveSize * 4, 0);
  const fgOffX = Math.round((adaptiveSize - fgW) / 2);
  const fgOffY = Math.round((adaptiveSize - fgH) / 2);
  const fgIcon = composite(fgCanvas, adaptiveSize, fgScaled, fgW, fgH, fgOffX, fgOffY);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), encodePNG(adaptiveSize, adaptiveSize, fgIcon));

  // B. Legacy Square Icon (White / subtle background, emblem centered ~75%)
  const sqW = Math.round(iconSize * 0.76);
  const sqH = Math.round(sqW * (srcCropH / srcCropW));
  const sqScaled = resampleRGBA(emblemCrop, srcCropW, srcCropH, sqW, sqH);
  // White card background
  const sqCanvas = Buffer.alloc(iconSize * iconSize * 4);
  for (let i = 0; i < iconSize * iconSize; i++) {
    sqCanvas[i * 4] = 255;
    sqCanvas[i * 4 + 1] = 255;
    sqCanvas[i * 4 + 2] = 255;
    sqCanvas[i * 4 + 3] = 255;
  }
  const sqOffX = Math.round((iconSize - sqW) / 2);
  const sqOffY = Math.round((iconSize - sqH) / 2);
  const sqIcon = composite(sqCanvas, iconSize, sqScaled, sqW, sqH, sqOffX, sqOffY);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), encodePNG(iconSize, iconSize, sqIcon));

  // C. Legacy Round Icon (Circle masked white background)
  const roundCanvas = Buffer.alloc(iconSize * iconSize * 4, 0);
  const center = (iconSize - 1) / 2;
  const radius = iconSize / 2;
  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
      const idx = (y * iconSize + x) * 4;
      if (dist <= radius - 0.5) {
        roundCanvas[idx] = 255;
        roundCanvas[idx + 1] = 255;
        roundCanvas[idx + 2] = 255;
        roundCanvas[idx + 3] = 255;
      } else if (dist < radius + 0.5) {
        const alpha = Math.max(0, Math.min(1, radius + 0.5 - dist));
        roundCanvas[idx] = 255;
        roundCanvas[idx + 1] = 255;
        roundCanvas[idx + 2] = 255;
        roundCanvas[idx + 3] = Math.round(alpha * 255);
      }
    }
  }
  const roundIcon = composite(roundCanvas, iconSize, sqScaled, sqW, sqH, sqOffX, sqOffY);
  // Re-mask circular alpha to ensure no bleed outside circle
  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
      const idx = (y * iconSize + x) * 4;
      if (dist > radius + 0.5) {
        roundIcon[idx + 3] = 0;
      } else if (dist > radius - 0.5) {
        const maskA = Math.max(0, Math.min(1, radius + 0.5 - dist));
        roundIcon[idx + 3] = Math.min(roundIcon[idx + 3], Math.round(maskA * 255));
      }
    }
  }
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), encodePNG(iconSize, iconSize, roundIcon));

  console.log(`Generated ${name} (icon: ${iconSize}x${iconSize}, adaptive: ${adaptiveSize}x${adaptiveSize})`);
});

// Remove temp file
if (fs.existsSync('public/test-emblem.png')) fs.unlinkSync('public/test-emblem.png');
console.log('Done generating all Android launcher icon assets!');
