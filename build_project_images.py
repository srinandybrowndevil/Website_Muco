"""Optimize generated portfolio illustrations, keeping screenshot evidence separate."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "project-images"
OUTPUT = ROOT / "assets" / "projects"

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    index = {}
    for path in sorted(SOURCE.glob("*.png")):
        with Image.open(path) as original:
            image = original.convert("RGB")
            widths = [w for w in (480, 800, 1200) if w <= image.width]
            for width in widths:
                resized = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
                resized.save(OUTPUT / f"{path.stem}-{width}.webp", quality=79, method=6)
                resized.save(OUTPUT / f"{path.stem}-{width}.jpg", quality=81, optimize=True, progressive=True)
            index[path.stem] = {"widths": widths, "width": widths[-1], "height": round(image.height * widths[-1] / image.width)}
    (OUTPUT / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"Optimized {len(index)} illustrations in assets/projects")

if __name__ == "__main__":
    main()
