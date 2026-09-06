#!/usr/bin/env python3
"""
Turn raw product screenshots into the responsive set the site serves.

    python3 build_shots.py                # process everything in shots/
    python3 build_shots.py shots/meyra.png

Drop a screenshot into shots/ named after the project id in content.py --
meyra.png, ooruva.png, inknexis.png, muco-platform.png -- and run this. It
writes assets/shots/<id>-<width>.{webp,jpg} at three widths and records the
real pixel dimensions in assets/shots/index.json, which build.py reads so every
<img> ships with correct width and height attributes and reserves its space
before the file arrives. A missing entry is not an error: a project with no
screenshot keeps its drawn concept preview.

Phone screenshots (taller than they are wide) are detected and written at
narrower widths, because upscaling a 390px-wide capture to 1200 helps nobody.

Requires Pillow, which is already a dependency of build_fonts.py.
"""

import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "shots")
OUT = os.path.join(ROOT, "assets", "shots")
INDEX = os.path.join(OUT, "index.json")

WIDE_WIDTHS = (640, 960, 1280)
TALL_WIDTHS = (320, 480, 640)

# A screenshot is documentation, not photography: text must stay readable, so
# these are higher than you would use for a photo.
WEBP_QUALITY = 82
JPEG_QUALITY = 86


def variants_for(im):
    """Phone captures are portrait; rendering them at 1280 wide is pure waste."""
    portrait = im.height > im.width
    widths = TALL_WIDTHS if portrait else WIDE_WIDTHS
    # Never upscale. A 900px capture rendered at 1280 is blurrier, not sharper.
    return [w for w in widths if w <= im.width] or [im.width]


def process(path, index):
    name = os.path.splitext(os.path.basename(path))[0]
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        # Flatten onto the page background rather than white, so a transparent
        # corner does not flash light against a dark card.
        flat = Image.new("RGB", im.size, (10, 10, 12))
        im = im.convert("RGBA")
        flat.paste(im, mask=im.split()[-1])
        im = flat
    else:
        im = im.convert("RGB")

    widths = variants_for(im)
    made = []
    for w in widths:
        h = round(im.height * w / im.width)
        resized = im.resize((w, h), Image.LANCZOS)
        for ext, kwargs in (("webp", {"quality": WEBP_QUALITY, "method": 6}),
                            ("jpg", {"quality": JPEG_QUALITY, "optimize": True,
                                     "progressive": True})):
            out = os.path.join(OUT, "%s-%d.%s" % (name, w, ext))
            resized.save(out, **kwargs)
            made.append((os.path.basename(out), os.path.getsize(out)))

    largest = max(widths)
    index[name] = {
        "widths": widths,
        # The intrinsic size of the largest variant, so the markup can carry
        # width and height and the layout never jumps when the image lands.
        "width": largest,
        "height": round(im.height * largest / im.width),
        "portrait": im.height > im.width,
    }
    return name, made


def main(argv):
    if not os.path.isdir(SRC):
        os.makedirs(SRC, exist_ok=True)
        print("Created %s. Put screenshots there named after the project id" % SRC)
        print("(meyra.png, ooruva.png, inknexis.png ...) and run this again.")
        return 0

    os.makedirs(OUT, exist_ok=True)
    index = {}
    if os.path.exists(INDEX):
        with open(INDEX, encoding="utf-8") as f:
            index = json.load(f)

    paths = argv[1:] or sorted(
        os.path.join(SRC, f) for f in os.listdir(SRC)
        if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    )
    if not paths:
        print("No screenshots in %s" % SRC)
        return 0

    for path in paths:
        name, made = process(path, index)
        total = sum(size for _, size in made)
        print("  %-18s %d files  %6.1f KB" % (name, len(made), total / 1024.0))

    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, sort_keys=True)
        f.write("\n")
    print("  %-18s %s" % ("index.json", ", ".join(sorted(index))))
    print("\nNow run: python3 build.py")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
