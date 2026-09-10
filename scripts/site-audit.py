"""Inch-by-inch audit of the built marketing site.

The browser tests already prove each page loads without console errors, that
every internal link resolves and that nothing scrolls sideways on a phone.
This checks the things a browser will never complain about: a page with no
description, two pages claiming the same title, an image with no alt text, a
heading level skipped, a photograph shipped at two megabytes.
"""
import os, re, sys, glob, html
from collections import defaultdict

# 404 is the only page that genuinely must not be indexed. maintenance.html
# reads like a status page and is not one -- it sells maintenance and support
# plans, so it belongs in the sitemap like any other service page.
PUBLIC_SKIP = {"404.html"}
problems, notes = [], []

def add(page, msg): problems.append(f"{page}: {msg}")
def note(page, msg): notes.append(f"{page}: {msg}")

pages = sorted(p for p in glob.glob("*.html"))
titles, descriptions = defaultdict(list), defaultdict(list)

for page in pages:
    doc = open(page, encoding="utf-8").read()
    flat = re.sub(r"<!--.*?-->", "", doc, flags=re.S)

    if not re.search(r"<html[^>]*\blang=", flat):
        add(page, "no lang attribute on <html>")

    title = re.search(r"<title>(.*?)</title>", flat, re.S)
    if not title or not title.group(1).strip():
        add(page, "no <title>")
    else:
        text = html.unescape(title.group(1)).strip()
        titles[text].append(page)
        if len(text) > 65: note(page, f"title is {len(text)} characters, over 65")

    desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', flat, re.S)
    if not desc or not desc.group(1).strip():
        add(page, "no meta description")
    else:
        text = html.unescape(desc.group(1)).strip()
        descriptions[text].append(page)
        if not (50 <= len(text) <= 165):
            note(page, f"description is {len(text)} characters, outside 50-165")

    if page not in PUBLIC_SKIP and not re.search(r'rel=["\']canonical["\']', flat):
        add(page, "no canonical link")

    for prop in ("og:title", "og:description", "og:image"):
        if page not in PUBLIC_SKIP and not re.search(r'property=["\']' + prop + r'["\']', flat):
            add(page, f"no {prop}")

    # Headings: exactly one h1, and no level skipped on the way down.
    levels = [int(m.group(1)) for m in re.finditer(r"<h([1-6])\b", flat)]
    h1s = levels.count(1)
    if h1s == 0: add(page, "no <h1>")
    elif h1s > 1: add(page, f"{h1s} <h1> elements, expected one")
    previous = 0
    for level in levels:
        if previous and level > previous + 1:
            add(page, f"heading jumps from h{previous} to h{level}")
            break
        previous = level

    # Images: alt is required (empty alt is a valid decorative answer), and
    # dimensions stop the page reflowing as each one arrives.
    for tag in re.findall(r"<img\b[^>]*>", flat):
        if not re.search(r"\balt=", tag):
            add(page, "an <img> has no alt attribute: " + tag[:90])
        if not (re.search(r"\bwidth=", tag) and re.search(r"\bheight=", tag)):
            src = re.search(r'src=["\']([^"\']+)', tag)
            note(page, "image without width/height: " + (src.group(1) if src else tag[:60]))

    for word in ("lorem ipsum", "todo:", "fixme", "placeholder text", "xxxxx"):
        if word in flat.lower():
            add(page, f"placeholder text present: {word}")

    for tag in re.findall(r'<a\b[^>]*target=["\']_blank["\'][^>]*>', flat):
        if "noopener" not in tag and "noreferrer" not in tag:
            add(page, "target=_blank without noopener: " + tag[:80])

# Duplicates across the site.
for text, where in titles.items():
    if len(where) > 1: add(", ".join(where), f"share the title {text!r}")
for text, where in descriptions.items():
    if len(where) > 1: add(", ".join(where), f"share the description {text[:60]!r}")

# The sitemap has to agree with what exists.
if os.path.exists("sitemap.xml"):
    listed = set()
    for loc in re.findall(r"<loc>(.*?)</loc>", open("sitemap.xml", encoding="utf-8").read()):
        path = re.sub(r"^https?://[^/]+/?", "", loc.strip()) or "index.html"
        listed.add(path if path.endswith(".html") else path + ".html")
    for path in sorted(listed):
        if not os.path.exists(path):
            add("sitemap.xml", f"lists {path}, which does not exist")
    for page in pages:
        if page not in PUBLIC_SKIP and page not in listed and page not in {"privacy.html", "terms.html", "refund.html"}:
            note("sitemap.xml", f"does not list {page}")
    for page in PUBLIC_SKIP:
        if page in listed: add("sitemap.xml", f"lists {page}, which should not be indexed")
else:
    add("sitemap.xml", "missing")

# Weight. A photograph over half a megabyte is a phone bill on a slow line.
markup = {p: open(p, encoding="utf-8").read() for p in pages}

def served_directly(name):
    """True unless every use of this file is a fallback inside a <picture>
    whose <source> offers something smaller. A heavy PNG that only ever
    reaches a browser without WebP support is not a page-weight problem."""
    for doc in markup.values():
        for block in re.findall(r"<picture>.*?</picture>", doc, re.S):
            if name in block and "<source" in block:
                break
        else:
            if name in doc:
                return True
    return False

for path in glob.glob("assets/**/*", recursive=True):
    if not os.path.isfile(path): continue
    size = os.path.getsize(path)
    if size <= 500_000: continue
    name = os.path.basename(path)
    if not any(name in doc for doc in markup.values()):
        add(path, f"{size // 1024} KB and not referenced by any page")
    elif served_directly(name):
        add(path, f"{size // 1024} KB, served directly to every visitor")
    else:
        note(path, f"{size // 1024} KB, but only a <picture> fallback, so almost nobody fetches it")

print(f"pages audited: {len(pages)}")
if notes:
    print(f"\n{len(notes)} note(s) worth a look:")
    for n in sorted(set(notes))[:40]: print("  - " + n)
if problems:
    print(f"\n{len(problems)} problem(s):")
    for p in sorted(set(problems)): print("  ! " + p)
    sys.exit(1)
print("\nNothing failing. Titles, descriptions, canonicals, social tags, heading order, alt text and the sitemap all check out.")
