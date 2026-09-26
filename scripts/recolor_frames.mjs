/**
 * Replaces the red studio background baked into the portrait frames with a
 * new solid colour, using a soft matte so hair and shoulder edges blend.
 *
 * Always reads from `frames_original/` so it can be re-run safely.
 *
 * Usage:
 *   node scripts/recolor_frames.mjs                 # writes every frame to public/frames
 *   node scripts/recolor_frames.mjs --preview out.png  # writes only center.webp's result to out.png
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = path.resolve('frames_original');
const OUTPUT_DIR = path.resolve('public/frames');

/** @type {[number, number, number]} */
const TARGET_COLOR = [0x16, 0x0a, 0x0a];

// Matte thresholds on "redness" (R minus the larger of G and B). Below
// REDNESS_LOW a pixel is foreground; above REDNESS_HIGH it is background.
// Skin and lips sit well under REDNESS_LOW, the backdrop sits near 210.
const REDNESS_LOW = 105;
const REDNESS_HIGH = 165;

// Dark pixels (low green and blue) can't be skin, so the matte starts much
// earlier for them. This catches the red fringe around hair and shoulders.
const REDNESS_LOW_DARK = 35;
const DARK_CHANNEL_MIN = 45;
const DARK_CHANNEL_MAX = 95;

const WEBP_QUALITY = 90;

/**
 * Hermite smoothstep between two edges.
 *
 * @param {number} edge_low - Value mapped to 0.
 * @param {number} edge_high - Value mapped to 1.
 * @param {number} value - Input value.
 * @returns {number} Smoothed value in [0, 1].
 */
function smoothstep(edge_low, edge_high, value) {
  const t = Math.min(1, Math.max(0, (value - edge_low) / (edge_high - edge_low)));
  return t * t * (3 - 2 * t);
}

/**
 * Averages the four corner patches of an image to estimate the backdrop colour.
 *
 * @param {Buffer} pixels - Raw RGB pixel buffer.
 * @param {number} width - Image width in pixels.
 * @param {number} height - Image height in pixels.
 * @param {number} channels - Channels per pixel.
 * @returns {[number, number, number]} Average backdrop RGB.
 */
function sample_backdrop_color(pixels, width, height, channels) {
  const patch_size = 20;
  const origins = [
    [0, 0],
    [width - patch_size, 0],
    [0, Math.floor(height / 3)],
    [width - patch_size, Math.floor(height / 3)],
  ];
  const sums = [0, 0, 0];
  let count = 0;

  for (const [origin_x, origin_y] of origins) {
    for (let y = origin_y; y < origin_y + patch_size; y++) {
      for (let x = origin_x; x < origin_x + patch_size; x++) {
        const offset = (y * width + x) * channels;
        sums[0] += pixels[offset];
        sums[1] += pixels[offset + 1];
        sums[2] += pixels[offset + 2];
        count += 1;
      }
    }
  }
  return [sums[0] / count, sums[1] / count, sums[2] / count];
}

/**
 * Recolours one frame's backdrop and writes it to disk.
 *
 * @param {string} source_path - Path of the original frame.
 * @param {string} output_path - Destination path; the extension selects the format.
 * @returns {Promise<void>}
 */
async function recolor_frame(source_path, output_path) {
  const { data, info } = await sharp(source_path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const backdrop_color = sample_backdrop_color(data, width, height, channels);
  const shift = TARGET_COLOR.map((value, index) => value - backdrop_color[index]);

  for (let offset = 0; offset < data.length; offset += channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const max_green_blue = Math.max(green, blue);
    const darkness = 1 - smoothstep(DARK_CHANNEL_MIN, DARK_CHANNEL_MAX, max_green_blue);
    const redness_low = REDNESS_LOW + (REDNESS_LOW_DARK - REDNESS_LOW) * darkness;
    const matte = smoothstep(redness_low, REDNESS_HIGH, red - max_green_blue);
    if (matte === 0) continue;

    if (matte === 1) {
      data[offset] = TARGET_COLOR[0];
      data[offset + 1] = TARGET_COLOR[1];
      data[offset + 2] = TARGET_COLOR[2];
      continue;
    }
    data[offset] = Math.max(0, Math.min(255, red + matte * shift[0]));
    data[offset + 1] = Math.max(0, Math.min(255, green + matte * shift[1]));
    data[offset + 2] = Math.max(0, Math.min(255, blue + matte * shift[2]));
  }

  const image = sharp(data, { raw: { width, height, channels } });
  if (output_path.endsWith('.webp')) {
    await image.webp({ quality: WEBP_QUALITY }).toFile(output_path);
  } else {
    await image.toFile(output_path);
  }
}

/**
 * Entry point: recolours a single preview frame or every frame.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const preview_index = process.argv.indexOf('--preview');
  if (preview_index !== -1) {
    const preview_path = path.resolve(process.argv[preview_index + 1] ?? 'preview.png');
    await recolor_frame(path.join(SOURCE_DIR, 'center.webp'), preview_path);
    console.log(`Preview written to ${preview_path}`);
    return;
  }

  const file_names = (await readdir(SOURCE_DIR)).filter((name) => name.endsWith('.webp'));
  for (const file_name of file_names) {
    await recolor_frame(path.join(SOURCE_DIR, file_name), path.join(OUTPUT_DIR, file_name));
  }
  console.log(`Recoloured ${file_names.length} frames into ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
