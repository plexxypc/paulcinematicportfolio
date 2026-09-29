/**
 * Builds the 1200x630 social share card (public/og-image.jpg) from the
 * front-facing portrait frame, with name and title text on the left.
 *
 * Usage:
 *   node scripts/generate_og_image.mjs
 */
import path from 'node:path';
import sharp from 'sharp';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const BG_COLOR = '#160a0a';

const PORTRAIT_PATH = path.resolve('public/frames/center.webp');
const OUTPUT_PATH = path.resolve('public/og-image.jpg');

// Portrait column on the right side of the card.
const PORTRAIT_LEFT = 560;
const PORTRAIT_WIDTH = CARD_WIDTH - PORTRAIT_LEFT;
const FADE_WIDTH = 220;

const FONT_STACK = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/**
 * Resizes the portrait to the card height and crops a column centred on the face.
 *
 * @returns {Promise<Buffer>} PNG buffer of the cropped portrait column.
 */
async function build_portrait_column() {
  const { width: source_width, height: source_height } = await sharp(PORTRAIT_PATH).metadata();
  const resized_width = Math.round((source_width * CARD_HEIGHT) / source_height);
  const crop_left = Math.max(0, Math.round(resized_width / 2 - PORTRAIT_WIDTH / 2));

  return sharp(PORTRAIT_PATH)
    .resize({ width: resized_width, height: CARD_HEIGHT })
    .extract({ left: crop_left, top: 0, width: PORTRAIT_WIDTH, height: CARD_HEIGHT })
    .png()
    .toBuffer();
}

/**
 * Builds the SVG overlay: a fade from the background into the portrait, plus the text.
 *
 * @returns {Buffer} SVG markup as a buffer.
 */
function build_overlay_svg() {
  const svg = `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="${BG_COLOR}" stop-opacity="1" />
          <stop offset="1" stop-color="${BG_COLOR}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect x="${PORTRAIT_LEFT}" y="0" width="${FADE_WIDTH}" height="${CARD_HEIGHT}" fill="url(#fade)" />

      <text x="72" y="220" font-family="${FONT_STACK}" font-size="30" font-weight="500"
            fill="#ffffff" fill-opacity="0.8" letter-spacing="1">Hi, I'm</text>
      <text x="68" y="310" font-family="${FONT_STACK}" font-size="92" font-weight="700"
            fill="#ffffff">Paul Udor</text>

      <text x="72" y="380" font-family="${FONT_STACK}" font-size="30" font-weight="500" fill="#ffffff">
        <tspan x="72" dy="0">Marketing Specialist,</tspan>
        <tspan x="72" dy="42">Automation Engineer &amp; Web Developer</tspan>
      </text>

      <rect x="72" y="496" width="64" height="3" rx="1.5" fill="#ffffff" fill-opacity="0.6" />
      <text x="72" y="546" font-family="${FONT_STACK}" font-size="24" font-weight="500"
            fill="#ffffff" fill-opacity="0.7">paulcinematicportfolio.vercel.app</text>
    </svg>`;
  return Buffer.from(svg);
}

/**
 * Entry point: composes and writes the share card.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const portrait_column = await build_portrait_column();

  await sharp({
    create: { width: CARD_WIDTH, height: CARD_HEIGHT, channels: 3, background: BG_COLOR },
  })
    .composite([
      { input: portrait_column, left: PORTRAIT_LEFT, top: 0 },
      { input: build_overlay_svg(), left: 0, top: 0 },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(OUTPUT_PATH);

  console.log(`Share image written to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
