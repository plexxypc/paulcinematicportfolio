# Paul Udor — Interactive Portfolio Hero

The landing page for [paulcinematicportfolio.vercel.app](https://paulcinematicportfolio.vercel.app/): a full-screen portrait that turns to follow the visitor's cursor (or finger on touch screens), with links to my work, blog, resume and contact channels.

Main portfolio: [paul-udor.vercel.app](https://paul-udor.vercel.app/)

## Run it

```bash
npm install
npm run dev
```

## Features

- **Cursor-tracking portrait** — 64 angle-mapped frames plus a centre frame, drawn to a canvas.
- **Contact options** — a floating chat button (bottom-right) and a "Let's Talk" modal (desktop only) linking to WhatsApp, Instagram, Facebook and LinkedIn.
- **Share previews** — Open Graph and Twitter meta tags in `index.html`, using `public/og-image.jpg`.

## Files

- `src/components/CursorHero.jsx` — the canvas renderer: preloads all 65 frames, tracks cursor/touch position, computes the angle with `atan2`, applies shortest-path circular smoothing, and draws exactly one frame per tick (no cross-fading, which avoids double-face ghosting).
- `src/components/ContactOptions.jsx` — the contact links, icons, floating chat button and "Let's Talk" modal. Edit `CONTACT_LINKS` to change a link.
- `public/frames/` — the 64 angle-mapped frames + `center.webp` for the deadzone.
- `public/og-image.jpg` — the 1200×630 share card.
- `frames_original/` — the frames with the original red background, used as the source by `recolor_frames.mjs`.
- `scripts/recolor_frames.mjs` — replaces the frame background colour (`TARGET_COLOR`). Run with `node scripts/recolor_frames.mjs`.
- `scripts/generate_og_image.mjs` — rebuilds the share card from `public/frames/center.webp`. Run with `node scripts/generate_og_image.mjs`.
- `scripts/extract_frames.py` + `scripts/frame-mapping.json` — the frame extraction script and the mapping of source video frames to angles.
- `source-assets/` — the original portrait image and video.

## How the frames were picked

The head rotation in the source video isn't constant speed — it lingers on some directions and moves quickly through others. Extracting frames evenly by *time* would make the tracking feel wrong (the portrait would appear stuck looking one way across a wide range of cursor positions).

Instead, the video was inspected frame-by-frame to find the real timestamp of each of the 8 compass directions. Those became anchor points, and the 64 output frames were picked by interpolating frame number against *angle* across the anchors, so they're evenly spaced by visual direction. The mapping is in `scripts/frame-mapping.json`.

## Tuning

**Face reference point** — at the top of `CursorHero.jsx`:

```js
const FACE_X_FRACTION = 0.5;
const FACE_Y_FRACTION = 0.36;
```

This is where the face sits once the canvas covers the viewport. If the tracking feels offset from the eyes, adjust these.

**Deadzone size** — `DEADZONE_ENTER` / `DEADZONE_EXIT` (12%/15% of the smaller viewport dimension). Smaller means the portrait breaks eye contact sooner as the cursor moves away from the centre.

**Response speed** — `LERP_FACTOR` (0.26). Higher is snappier, lower is smoother.

**Background colour** — change `TARGET_COLOR` in `scripts/recolor_frames.mjs` and re-run it, then update `BG_COLOR` in `CursorHero.jsx`, `--bg-color` in `src/index.css`, `.hero-root` in `CursorHero.css`, and `theme-color` in `index.html`. Re-run `generate_og_image.mjs` to refresh the share card.

## Regenerating the frames from a new video

1. Replace `source-assets/character.mp4`.
2. Sample it to find the new compass-direction timestamps: `ffmpeg -i character.mp4 -vf "select='not(mod(n\,5))'" -vsync vfr frame_%03d.png`
3. Update the `ANCHORS` list in `scripts/extract_frames.py` with the new frame numbers.
4. Run `python3 scripts/extract_frames.py` (needs `ffmpeg` on PATH) to regenerate the frames, copy them into `frames_original/`, then run `node scripts/recolor_frames.mjs`.

Step 2 needs a person to look at the frames and decide which one is "up-right", "down", and so on.
