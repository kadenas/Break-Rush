#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../../dist');
const ICON_DIR = path.join(DIST_DIR, 'icons');
const ICON_SIZES = [192, 512];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBytes, data]));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

function encodePNG(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(6, 9); // color type RGBA
  header.writeUInt8(0, 10); // compression
  header.writeUInt8(0, 11); // filter
  header.writeUInt8(0, 12); // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type 0
    pixels.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const chunks = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    writeChunk('IHDR', header),
    writeChunk('IDAT', compressed),
    writeChunk('IEND', Buffer.alloc(0))
  ];
  return Buffer.concat(chunks);
}

function createPixels(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(2) * center;
      const t = dist / maxDist;
      const base = 0.08 + 0.92 * (1 - t);
      const glow = Math.max(0, 1 - t * 2.4);
      const offset = (y * size + x) * 4;
      pixels[offset] = Math.floor(15 + 70 * base + glow * 120); // R
      pixels[offset + 1] = Math.floor(30 + 100 * base + glow * 100); // G
      pixels[offset + 2] = Math.floor(50 + 160 * base + glow * 180); // B
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

async function generateIcons() {
  await fs.mkdir(ICON_DIR, { recursive: true });
  const outputs = [];
  for (const size of ICON_SIZES) {
    const pixels = createPixels(size);
    const png = encodePNG(size, size, pixels);
    const filename = `app-${size}.png`;
    const target = path.join(ICON_DIR, filename);
    await fs.writeFile(target, png);
    outputs.push({ size, filename });
  }
  return outputs;
}

async function rewriteManifest(icons) {
  const manifestPath = path.join(DIST_DIR, 'manifest.webmanifest');
  try {
    const raw = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    manifest.icons = icons.map((icon) => ({
      src: `icons/${icon.filename}`,
      sizes: `${icon.size}x${icon.size}`,
      type: 'image/png',
      purpose: 'any maskable'
    }));
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Manifest actualizado con íconos PNG.');
  } catch (error) {
    console.warn('No se pudo reescribir el manifest:', error);
  }
}

async function main() {
  try {
    const icons = await generateIcons();
    await rewriteManifest(icons);
    console.log(`Íconos generados en ${ICON_DIR}`);
  } catch (error) {
    console.error('Fallo el postbuild:', error);
    process.exitCode = 1;
  }
}

main();
