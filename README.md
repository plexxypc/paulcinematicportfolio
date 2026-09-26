# Cursor-Tracking Hero

A standalone demo — the "fancy" side of a homepage comparison post. Not linked from or hosted on the same domain as the real portfolio, on purpose (see the reasoning in chat if you want it again).

## Run it

```bash
npm install
npm run dev
```

## How it actually works (not how the original guide describes it)

The guide's master prompt says to "identify the 8 compass frame numbers by inspecting the timeline" and extract 64 evenly-angle-spaced frames. In practice, the video's head rotation speed wasn't constant — it lingers on some directions (down, in this source video) and moves quickly through others. A naive even-by-*time* extraction would have made the tracking feel wrong (e.g. the character would appear stuck looking down across a wide range of cursor positions).

What was actually done: the video was visually inspected frame-by-frame to find the real timestamp of each of the 8 compass directions, those became anchor points, and the 64 output frames were picked by interpolating frame number against *angle* (not time) across those anchors — so the 64 frames are evenly spaced by visual direction, not by video timestamp. That mapping is in `scripts/frame-mapping.json` if you want to see exactly which source video frame became which angle.

## Files

- `src/components/CursorHero.jsx` — the canvas renderer: preloads all 65 frames, tracks cursor/touch position, computes angle via `atan2`, does shortest-path circular smoothing, and draws exactly one frame per tick (no cross-fading — that's what avoids the double-face ghosting the original guide warns about)
- `public/frames/` — the 64 angle-mapped frames + `center.webp` for the deadzone
- `scripts/extract_frames.py` — the extraction script, re-runnable if you regenerate the source video
- `source-assets/` — the original generated image and video, kept for reference

## Things you'll likely want to tune

**The face reference point** — at the top of `CursorHero.jsx`:
```js
const FACE_X_FRACTION = 0.5;
const FACE_Y_FRACTION = 0.36;
```
This assumes the face sits roughly in the upper-middle of the frame once the canvas covers the full viewport. If the tracking feels offset from where the actual eyes are on your screen, adjust these — 0.5/0.36 was estimated from the source portrait's framing, not measured precisely.

**Deadzone size** — `DEADZONE_ENTER` / `DEADZONE_EXIT` (12%/15% of the smaller viewport dimension). Smaller = the character breaks eye contact sooner as the cursor moves away from center.

**Response speed** — `LERP_FACTOR` (0.26). Higher = snappier/more immediate tracking, lower = smoother/more delayed.

## If you regenerate the video (new character, new take, etc.)

1. Replace `source-assets/character.mp4`
2. Re-inspect it — `ffmpeg -i character.mp4 -vf "select='not(mod(n\,5))'" -vsync vfr frame_%03d.png` gives you a sampled contact sheet to find the new compass-direction timestamps
3. Update the `ANCHORS` list in `scripts/extract_frames.py` with the new frame numbers
4. Re-run `python3 scripts/extract_frames.py` (needs `ffmpeg` on PATH) to regenerate `public/frames/`

This step doesn't fully automate — it needs a human to look at the frames and say "that one's UP-RIGHT," the same way it did this time.
