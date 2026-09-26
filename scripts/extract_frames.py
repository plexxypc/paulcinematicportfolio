"""
Maps the video's timeline to a 0-360 degree circular angle space using
anchor points identified by visually inspecting the frame sequence, then
extracts 64 evenly-angle-spaced frames (~5.625 deg apart) as WebP, plus a
separate center.webp for the cursor deadzone.

Angle convention: 0=UP, 90=RIGHT, 180=DOWN, 270=LEFT, clockwise.
This must match the atan2-based angle calculation used in the frontend.
"""
import subprocess
import os

SRC = "source/character.mp4"
OUT_DIR = "public/frames"
os.makedirs(OUT_DIR, exist_ok=True)

# (frame_number, angle_degrees) - identified from visual inspection of the
# contact sheet. frame 170 (315 deg) wraps to frame 15 (treated as 360) to
# close the loop for interpolation purposes.
ANCHORS = [
    (15, 0),
    (35, 45),
    (55, 90),
    (80, 135),
    (100, 180),
    (130, 225),
    (155, 270),
    (170, 315),
    (187, 360),  # continues forward in time toward the pre-center "up" pose, closing the loop
]

CENTER_FRAME = 210  # well within the stable neutral hold at the end (frames 190-235)

def angle_to_frame(target_angle):
    """Piecewise-linear interpolation across the anchor list."""
    for i in range(len(ANCHORS) - 1):
        f0, a0 = ANCHORS[i]
        f1, a1 = ANCHORS[i + 1]
        if a0 <= target_angle <= a1:
            if a1 == a0:
                return f0
            t = (target_angle - a0) / (a1 - a0)
            return round(f0 + t * (f1 - f0))
    return ANCHORS[0][0]

def extract_frame(frame_number, out_path):
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", SRC,
            "-vf", f"select='eq(n\\,{frame_number})'",
            "-vframes", "1",
            "-quality", "90",
            out_path,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

def main():
    mapping = {}
    for i in range(64):
        angle = i * (360 / 64)
        frame_num = angle_to_frame(angle)
        out_path = os.path.join(OUT_DIR, f"frame_{i:02d}.webp")
        extract_frame(frame_num, out_path)
        mapping[i] = {"angle": round(angle, 2), "sourceFrame": frame_num}
        print(f"frame_{i:02d}.webp  angle={angle:6.2f}  source_video_frame={frame_num}")

    extract_frame(CENTER_FRAME, os.path.join(OUT_DIR, "center.webp"))
    print(f"center.webp  source_video_frame={CENTER_FRAME}")

    import json
    with open(os.path.join(OUT_DIR, "mapping.json"), "w") as f:
        json.dump(mapping, f, indent=2)

if __name__ == "__main__":
    main()
