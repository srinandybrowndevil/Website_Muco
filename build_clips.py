#!/usr/bin/env python3
"""
Turn raw screen recordings into the looping clips the portfolio serves.

    python3 build_clips.py                # process everything in clips/
    python3 build_clips.py clips/meyra.mov

Drop a recording into clips/ named after the project id in content.py --
meyra.mp4, ooruva.mov, inknexis.webm, muco-platform.mp4 -- and run this. It
writes assets/clips/<id>.mp4 and .webm plus a poster frame, and records the
real pixel dimensions and duration in assets/clips/index.json, which build.py
reads so every <video> ships with width, height and a poster and reserves its
space before a single byte of video arrives.

A clip outranks a screenshot, which outranks a drawn concept. A project with no
recording loses nothing: it keeps whatever it had.

Phone recordings (taller than they are wide) are detected and written narrower,
because a 390px-wide capture stretched to 1280 helps nobody.

The audio track is always discarded. These play muted, on loop, as evidence
that the product runs -- a soundtrack would be bytes nobody hears.

Requires ffmpeg and ffprobe on PATH.
"""

import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "clips")
OUT = os.path.join(ROOT, "assets", "clips")
INDEX = os.path.join(OUT, "index.json")

SOURCES = (".mp4", ".mov", ".webm", ".mkv", ".m4v", ".gif")

WIDE_WIDTH = 1280
TALL_WIDTH = 480

# A portfolio loop is a proof, not a tutorial. Past about twenty seconds people
# have stopped watching and the file is just weight on the page.
MAX_SECONDS = 20

# Screen recordings arrive at 60fps and look identical at 30 for half the size.
FPS = 30

# These render at roughly 560 CSS pixels inside a card, so the encode is
# already being downscaled by half on a 1x screen. That buys a lot of headroom:
# at CRF 26/34 the WebM came out heavier than the MP4, which would have handed
# every modern browser the bigger of the two files.
H264_CRF = 28
VP9_CRF = 42

# A poster is placeholder furniture, replaced the moment playback starts, but
# unlike a lazy image it is fetched as soon as the element renders -- six of
# them is the page's real cost. Half width and a notch more compression.
POSTER_WIDTH = 960
# ffmpeg's JPEG scale runs 2 (best) to 31.
POSTER_QSCALE = 5


def run(args):
    """Fail loudly. A silently broken clip is worse than no clip."""
    proc = subprocess.run(args, capture_output=True, text=True)
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-6:])
        raise RuntimeError("%s failed:\n%s" % (args[0], tail))
    return proc.stdout


def probe(path):
    out = run([
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height:format=duration",
        "-of", "json", path,
    ])
    data = json.loads(out)
    stream = data["streams"][0]
    # A GIF or a stream copy can report no duration at the format level.
    try:
        duration = float(data["format"]["duration"])
    except (KeyError, TypeError, ValueError):
        duration = 0.0
    return int(stream["width"]), int(stream["height"]), duration


def target_width(width, height):
    """Never upscale. A 900px capture rendered at 1280 is blurrier, not sharper."""
    portrait = height > width
    want = TALL_WIDTH if portrait else WIDE_WIDTH
    return min(want, width), portrait


def encode(path, name, out_width, duration):
    # Built explicitly rather than by list surgery, so the two encoders stay
    # readable side by side. scale=-2 keeps the height even, which H.264 and
    # VP9 both require.
    trim = ["-t", "%.2f" % MAX_SECONDS] if duration > MAX_SECONDS else []
    scale = ["-vf", "scale=%d:-2:flags=lanczos,fps=%d" % (out_width, FPS)]

    mp4 = os.path.join(OUT, "%s.mp4" % name)
    run(["ffmpeg", "-y", "-i", path] + trim + scale + [
        "-an",
        "-c:v", "libx264",
        "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-crf", str(H264_CRF), "-preset", "slow",
        # Lets the browser start playing before the whole file has arrived.
        "-movflags", "+faststart",
        mp4,
    ])

    webm = os.path.join(OUT, "%s.webm" % name)
    run(["ffmpeg", "-y", "-i", path] + trim + scale + [
        "-an",
        "-c:v", "libvpx-vp9",
        "-crf", str(VP9_CRF), "-b:v", "0",
        "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
        webm,
    ])

    # One second in, so the poster shows the product rather than whatever the
    # first frame caught mid-paint.
    poster = os.path.join(OUT, "%s-poster.jpg" % name)
    seek = "1" if duration > 1.5 else "0"
    run(["ffmpeg", "-y", "-ss", seek, "-i", path,
         "-frames:v", "1",
         "-vf", "scale=%d:-2:flags=lanczos" % min(out_width, POSTER_WIDTH),
         "-q:v", str(POSTER_QSCALE),
         poster])

    return [mp4, webm, poster]


def process(path, index):
    name = os.path.splitext(os.path.basename(path))[0]
    width, height, duration = probe(path)
    out_width, portrait = target_width(width, height)
    made = encode(path, name, out_width, duration)
    out_height = round(height * out_width / width)
    # Even heights only, matching what the encoder actually wrote.
    out_height -= out_height % 2

    index[name] = {
        "width": out_width,
        "height": out_height,
        "duration": round(min(duration, MAX_SECONDS), 2),
        "portrait": portrait,
    }
    return name, made


def main(argv):
    for tool in ("ffmpeg", "ffprobe"):
        if not shutil.which(tool):
            print("%s is not on PATH. Install ffmpeg and run this again." % tool)
            return 1

    if not os.path.isdir(SRC):
        os.makedirs(SRC, exist_ok=True)
        print("Created %s. Put screen recordings there named after the project" % SRC)
        print("id (meyra.mp4, ooruva.mov, inknexis.webm ...) and run this again.")
        return 0

    os.makedirs(OUT, exist_ok=True)
    index = {}
    if os.path.exists(INDEX):
        with open(INDEX, encoding="utf-8") as f:
            index = json.load(f)

    paths = argv[1:] or sorted(
        os.path.join(SRC, f) for f in os.listdir(SRC)
        if f.lower().endswith(SOURCES)
    )
    if not paths:
        print("No recordings in %s" % SRC)
        return 0

    for path in paths:
        name, made = process(path, index)
        total = sum(os.path.getsize(f) for f in made)
        print("  %-18s %ds  %d files  %6.1f KB"
              % (name, round(index[name]["duration"]), len(made), total / 1024.0))

    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, sort_keys=True)
        f.write("\n")
    print("  %-18s %s" % ("index.json", ", ".join(sorted(index))))
    print("\nNow run: python3 build.py")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
