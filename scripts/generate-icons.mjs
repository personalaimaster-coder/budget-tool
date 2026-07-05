import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Minimal pure-Node PNG encoder for solid icons with a centered circle accent.
// Avoids native image deps so the project stays lightweight.

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(size, draw) {
  const bytesPerPixel = 4;
  const rowLen = size * bytesPerPixel + 1; // +1 filter byte per row
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      const off = y * rowLen + 1 + x * bytesPerPixel;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BG = [79, 70, 229]; // indigo-600
const ACCENT = [165, 180, 252]; // indigo-300

function drawer(size, maskable) {
  const cx = size / 2;
  const cy = size / 2;
  // Smaller circle for maskable to stay within the safe zone.
  const radius = size * (maskable ? 0.26 : 0.32);
  const innerRadius = radius * 0.55;
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= radius && dist >= innerRadius) {
      return [...ACCENT, 255]; // ring
    }
    return [...BG, 255];
  };
}

const out = new URL("../public/icons/", import.meta.url);

function save(name, buf) {
  const path = new URL(name, out).pathname;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log("wrote", path, buf.length, "bytes");
}

save("icon-192.png", makePng(192, drawer(192, false)));
save("icon-512.png", makePng(512, drawer(512, false)));
save("icon-512-maskable.png", makePng(512, drawer(512, true)));
