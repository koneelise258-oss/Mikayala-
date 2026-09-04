const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createCrcTable() {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }
  return crcTable;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.slice(4, 8 + len);
  const checksum = crc32(typeAndData);
  buf.writeUInt32BE(checksum, 8 + len);
  return buf;
}

function generateIconPNG(size) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));

  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.42;

  let pos = 0;
  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background color: #0f172a (15, 23, 42)
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      // Subtle radial ambient purple glow in background center
      const bgGlow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 0.7);
      r += Math.round(35 * bgGlow);
      g += Math.round(15 * bgGlow);
      b += Math.round(55 * bgGlow);

      // Heart / Butterfly curve check
      // Symmetrical butterfly wings:
      const absDx = Math.abs(dx);
      // Top wing circle
      const topWingDist1 = Math.sqrt(Math.pow(absDx - 0.38, 2) + Math.pow(dy + 0.18, 2));
      const topWingDist2 = Math.sqrt(Math.pow(absDx - 0.22, 2) + Math.pow(dy + 0.32, 2));
      // Bottom wing circle
      const botWingDist = Math.sqrt(Math.pow(absDx - 0.30, 2) + Math.pow(dy - 0.25, 2));
      // Center heart shape
      const heartDist = Math.sqrt(Math.pow(absDx - 0.12, 2) + Math.pow(dy + 0.05, 2));
      // Central body
      const bodyDist = Math.sqrt(Math.pow(dx * 2.5, 2) + Math.pow(dy * 1.1, 2));

      const isTopWing = topWingDist1 < 0.36 || topWingDist2 < 0.28;
      const isBotWing = botWingDist < 0.26;
      const isHeart = heartDist < 0.24 && dy < 0.25 && dy > -0.35;
      const isBody = bodyDist < 0.38;

      if (isTopWing || isBotWing || isHeart || isBody) {
        // Gradient from rose pink (#f43f5e) at bottom-left/top to violet purple (#a855f7) to cyan glow
        const wingFactor = Math.max(0, Math.min(1, (dy + 0.5) * 0.8 + (1 - absDx) * 0.4));
        
        // Color 1: #ec4899 (236, 72, 153)
        // Color 2: #8b5cf6 (139, 92, 246)
        // Color 3: #38bdf8 (56, 189, 248) on upper edge
        r = Math.round(236 * wingFactor + 139 * (1 - wingFactor));
        g = Math.round(72 * wingFactor + 92 * (1 - wingFactor));
        b = Math.round(153 * wingFactor + 246 * (1 - wingFactor));

        if (dy < -0.2 && absDx < 0.4) {
          // Upper glow highlight
          r = Math.min(255, r + 40);
          g = Math.min(255, g + 40);
          b = Math.min(255, b + 60);
        }

        // Antennae / Sparkle points
        const ant1 = Math.sqrt(Math.pow(absDx - 0.18, 2) + Math.pow(dy + 0.46, 2));
        if (ant1 < 0.07) {
          r = 255; g = 255; b = 255;
        }
      }

      rawData[pos++] = Math.min(255, Math.max(0, r));
      rawData[pos++] = Math.min(255, Math.max(0, g));
      rawData[pos++] = Math.min(255, Math.max(0, b));
      rawData[pos++] = a;
    }
  }

  // PNG Header
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const png192 = generateIconPNG(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
console.log('Created public/icon-192.png (' + png192.length + ' bytes)');

// Generate 512x512
const png512 = generateIconPNG(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log('Created public/icon-512.png (' + png512.length + ' bytes)');

// Also create icons directory versions
const iconsDir = path.join(publicDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
fs.writeFileSync(path.join(iconsDir, 'icon-purple.png'), png192);
fs.writeFileSync(path.join(iconsDir, 'icon-purple-192.png'), png192);
fs.writeFileSync(path.join(iconsDir, 'icon-purple-512.png'), png512);
fs.writeFileSync(path.join(iconsDir, 'icon-purple-maskable-512.png'), png512);
console.log('Created all icons in public/icons/');
