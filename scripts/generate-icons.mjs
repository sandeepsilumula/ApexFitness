/**
 * Generates the PWA icon set into public/ as real PNGs.
 *
 * Written as a script rather than checked-in binaries so the icons can be
 * regenerated when the brand colour changes, and so the repo does not carry
 * opaque files nobody can edit. Run with: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/** Matches the navy-950 body background and the gold accent used across the UI. */
const NAVY = [5, 10, 20]
const GOLD = [212, 175, 55]

/** PNG wants 8-bit RGB, so each pixel is three bytes with no alpha. */
function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, pixelAt) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  // One filter byte (0 = None) per scanline, then the RGB triples.
  const raw = Buffer.alloc(height * (1 + width * 3))
  let offset = 0
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelAt(x, y)
      raw[offset++] = r
      raw[offset++] = g
      raw[offset++] = b
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * A gold "A" for Apex, drawn as two strokes plus a crossbar on a navy field.
 * Cheaper than a font dependency and it scales to any size without hinting.
 */
function makePixel(size, { padding }) {
  const inset = size * padding
  const box = size - inset * 2
  const stroke = Math.max(2, Math.round(box * 0.13))

  // Left and right diagonals of the A, measured as distance from each edge.
  const apexX = inset + box / 2
  const apexY = inset
  const baseY = inset + box
  const halfBase = box * 0.38
  const slope = (baseY - apexY) / halfBase

  const crossbarY = apexY + box * 0.68

  return (x, y) => {
    if (x < inset || y < inset || x >= size - inset || y >= size - inset) return NAVY

    const onLeftLeg = Math.abs(x - (apexX - (y - apexY) / slope)) <= stroke
    const onRightLeg = Math.abs(x - (apexX + (y - apexY) / slope)) <= stroke
    const onCrossbar =
      y >= crossbarY - stroke / 2 && y <= crossbarY + stroke / 2 && x >= apexX - box * 0.2 && x <= apexX + box * 0.2

    return onLeftLeg || onRightLeg || onCrossbar ? GOLD : NAVY
  }
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, padding: 0.18 },
  { file: 'icon-512.png', size: 512, padding: 0.18 },
  // Maskable icons get cropped to a circle by Android, so the artwork is
  // inset further to stay inside the safe zone.
  { file: 'icon-maskable-512.png', size: 512, padding: 0.3 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.14 },
  { file: 'favicon.png', size: 64, padding: 0.1 },
]

mkdirSync(OUT_DIR, { recursive: true })
for (const { file, size, padding } of TARGETS) {
  const png = encodePng(size, size, makePixel(size, { padding }))
  writeFileSync(join(OUT_DIR, file), png)
  console.log(`wrote public/${file} (${size}x${size}, ${png.length} bytes)`)
}
