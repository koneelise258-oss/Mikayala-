const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createCrcTable() {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
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

function generateScreenshot(width, height, type) {
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let pos = 0;

  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter 0
    const ny = y / height;
    
    for (let x = 0; x < width; x++) {
      const nx = x / width;

      // Base dark background: #0f172a
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      // Header bar (y: 0 to 0.08)
      if (ny < 0.08) {
        r = 27; g = 20; b = 53;
        // Accent bottom line on header
        if (ny > 0.078) {
          r = 108; g = 92; b = 231;
        }
      }
      // Footer bar (y: 0.92 to 1.0)
      else if (ny > 0.92) {
        r = 27; g = 20; b = 53;
        if (ny < 0.922) {
          r = 45; g = 34; b = 84;
        }
      } 
      // Main Content
      else {
        if (type === 'chat') {
          // Ambient purple nebula
          const distToNebula = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.4, 2));
          const glow = Math.max(0, 1 - distToNebula * 2);
          r += Math.round(35 * glow);
          g += Math.round(15 * glow);
          b += Math.round(60 * glow);

          // Simulated message bubble 1 (Partner, left) ny: 0.15 - 0.22, nx: 0.08 - 0.65
          if (ny > 0.15 && ny < 0.22 && nx > 0.08 && nx < 0.65) {
            r = 30; g = 24; b = 56;
          }
          // Simulated message bubble 2 (User, right) ny: 0.26 - 0.35, nx: 0.35 - 0.92
          else if (ny > 0.26 && ny < 0.35 && nx > 0.35 && nx < 0.92) {
            r = 108; g = 92; b = 231; // #6c5ce7
          }
          // Simulated message bubble 3 (Photo card, left) ny: 0.39 - 0.58, nx: 0.08 - 0.70
          else if (ny > 0.39 && ny < 0.58 && nx > 0.08 && nx < 0.70) {
            r = 24; g = 18; b = 45;
            // inner photo placeholder
            if (ny > 0.41 && ny < 0.53 && nx > 0.11 && nx < 0.67) {
              r = 236; g = 72; b = 153; // pink gradient
            }
          }
          // Simulated message bubble 4 (User, right) ny: 0.62 - 0.70, nx: 0.40 - 0.92
          else if (ny > 0.62 && ny < 0.70 && nx > 0.40 && nx < 0.92) {
            r = 0; g = 184; b = 148; // #00b894
          }
        } else if (type === 'jeux') {
          // Ambient rose nebula
          const distToNebula = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.45, 2));
          const glow = Math.max(0, 1 - distToNebula * 1.8);
          r += Math.round(55 * glow);
          g += Math.round(15 * glow);
          b += Math.round(45 * glow);

          // Center Game Wheel Circle
          const wheelDx = (nx - 0.5);
          const wheelDy = (ny - 0.42);
          const wheelDist = Math.sqrt(wheelDx * wheelDx + wheelDy * wheelDy);

          if (wheelDist < 0.28 && wheelDist > 0.04) {
            const angle = Math.atan2(wheelDy, wheelDx);
            const slice = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8);
            if (slice % 2 === 0) {
              r = 224; g = 86; b = 253; // #e056fd
            } else {
              r = 253; g = 121; b = 168; // #fd79a8
            }
          } else if (wheelDist <= 0.04) {
            r = 253; g = 203; b = 110; // #fdcb6e Center pin
          }

          // Game card 1 ny: 0.74 - 0.86, nx: 0.08 - 0.46
          if (ny > 0.74 && ny < 0.86 && nx > 0.08 && nx < 0.46) {
            r = 30; g = 24; b = 56;
          }
          // Game card 2 ny: 0.74 - 0.86, nx: 0.54 - 0.92
          else if (ny > 0.74 && ny < 0.86 && nx > 0.54 && nx < 0.92) {
            r = 30; g = 24; b = 56;
          }
        }
      }

      rawData[pos++] = Math.min(255, Math.max(0, r));
      rawData[pos++] = Math.min(255, Math.max(0, g));
      rawData[pos++] = Math.min(255, Math.max(0, b));
      rawData[pos++] = a;
    }
  }

  // PNG structure
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const compressed = zlib.deflateSync(rawData, { level: 6 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.join(process.cwd(), 'public');

// Generate 1080x1920 screenshots
console.log('Generating screenshot-chat.png...');
const chatPng = generateScreenshot(1080, 1920, 'chat');
fs.writeFileSync(path.join(publicDir, 'screenshot-chat.png'), chatPng);
console.log('Created public/screenshot-chat.png (' + chatPng.length + ' bytes)');

console.log('Generating screenshot-jeux.png...');
const jeuxPng = generateScreenshot(1080, 1920, 'jeux');
fs.writeFileSync(path.join(publicDir, 'screenshot-jeux.png'), jeuxPng);
console.log('Created public/screenshot-jeux.png (' + jeuxPng.length + ' bytes)');
