#!/usr/bin/env python3
"""
Re-download the self-hosted webfonts.

The site serves its typefaces from assets/fonts/ rather than Google Fonts, so a
page load makes no third-party request and the files cache with the rest of the
site. Run this only when you want to change or update the typefaces:

    python3 build_fonts.py

It downloads the latin and latin-ext subsets as woff2 and prints the @font-face
rules to paste at the top of style.css. It does NOT edit style.css for you —
the weight ranges there are hand-corrected (see the note below) and should not
be clobbered by a regeneration.

Note on weight ranges: Google's CSS emits one @font-face per requested weight,
all pointing at the same variable font file. Collapsing those into a single rule
means declaring the real variable axis range ('font-weight: 200 800'), otherwise
the browser synthesises the heavier weights instead of using the actual axis.
"""

import glob
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "assets", "fonts")

# The two families style.css actually declares. Both are variable, so each
# subset resolves to one file regardless of how many weights are listed --
# request the whole axis rather than a list of stops.
CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Inter+Tight:wght@100..900"
    "&family=JetBrains+Mono:wght@100..800"
    "&display=swap"
)

# A modern browser UA is required, or Google serves legacy ttf instead of woff2.
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

KEEP_SUBSETS = {"latin", "latin-ext"}

# The variable weight axis each family actually supports.
AXIS = {
    "Plus Jakarta Sans": "200 800",
    "JetBrains Mono": "100 800",
}


def fetch(url):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30
    ).read()


SERIF_URL = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap"
SERIF_FILE = "instrument-serif-italic-latin.woff2"


def subset_serif():
    """Re-download the serif accent face and cut it down to the glyphs the site
    actually renders with it — currently about five words, so 22 KB of font
    becomes roughly 2 KB.

    Needs fonttools and brotli, which are not site dependencies. If they are
    missing the full face is kept: a larger file is a cost, a missing glyph is
    a visible defect.

        python3 -m venv /tmp/fontenv
        /tmp/fontenv/bin/pip install fonttools brotli
    """
    os.makedirs(OUT, exist_ok=True)
    css = fetch(SERIF_URL).decode("utf-8")
    block = next(
        b for n, b in re.findall(r"/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)
        if n == "latin"
    )
    url = re.search(r"url\((https://[^)]+)\)", block).group(1)
    full = os.path.join(OUT, "_serif-full.woff2")
    open(full, "wb").write(fetch(url))

    # Every character the site sets in the serif accent.
    chars = set()
    for path in glob.glob(os.path.join(ROOT, "*.html")):
        html = open(path, encoding="utf-8").read()
        for word in re.findall(r"<span class=[\"']accent-serif[\"']>(.*?)</span>", html):
            chars |= set(word)
    if not chars:
        print("No .accent-serif spans found — build the site first.")
        return
    subset = "".join(sorted(chars))

    out = os.path.join(OUT, SERIF_FILE)
    try:
        subprocess.run(
            # Invoke fontTools as a module rather than hunting for the
            # pyftsubset script, so this works under whichever interpreter
            # actually has fonttools installed.
            [sys.executable, "-m", "fontTools.subset", full,
             "--output-file=" + out, "--flavor=woff2", "--text=" + subset,
             "--layout-features=", "--no-hinting", "--desubroutinize"],
            check=True, capture_output=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        os.replace(full, out)
        print("fonttools not available — kept the full face (%.1f KB)."
              % (os.path.getsize(out) / 1024.0))
        print("A bigger file is a cost; a missing glyph is a defect.")
        return

    before, after = os.path.getsize(full), os.path.getsize(out)
    os.remove(full)
    print("  %s  %.1f KB -> %.1f KB  (%d glyphs: %s)"
          % (SERIF_FILE, before / 1024.0, after / 1024.0, len(subset), subset))
    print("\n  Now set SERIF_SUBSET in content.py to exactly:\n    %r" % subset)


def main():
    os.makedirs(OUT, exist_ok=True)
    css = fetch(CSS_URL).decode("utf-8")

    blocks = re.findall(r"/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S)
    print("Found %d @font-face blocks across %d subsets."
          % (len(blocks), len({n for n, _ in blocks})))

    seen, faces, total = set(), [], 0
    for subset, block in blocks:
        if subset not in KEEP_SUBSETS:
            continue
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        url = re.search(r"url\((https://[^)]+)\)", block).group(1)
        urange = re.search(r"unicode-range:\s*([^;]+);", block).group(1).strip()

        slug = "%s-%s.woff2" % (family.lower().replace(" ", "-"), subset)
        path = os.path.join(OUT, slug)
        if slug not in seen:
            open(path, "wb").write(fetch(url))
            size = os.path.getsize(path)
            total += size
            print("  %-40s %6.1f KB" % (slug, size / 1024.0))
            seen.add(slug)
            faces.append(
                "@font-face {\n"
                "  font-family: '%s';\n"
                "  font-style: normal;\n"
                "  font-weight: %s;\n"
                "  font-display: swap;\n"
                "  src: url('assets/fonts/%s') format('woff2');\n"
                "  unicode-range: %s;\n"
                "}" % (family, AXIS.get(family, "400"), slug, urange)
            )

    print("\nTotal: %.1f KB across %d files.\n" % (total / 1024.0, len(seen)))
    print("Paste these at the top of style.css, replacing the existing block:\n")
    print("\n\n".join(faces))
    print("\nAlso check the preload tags in build.py point at the latin files.")


if __name__ == "__main__":
    if "--serif" in sys.argv:
        subset_serif()
    else:
        main()
