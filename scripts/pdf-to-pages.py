"""
Converts an exam PDF into page images the app can bundle.

Usage:
  python scripts/pdf-to-pages.py <pdf> <output folder> <exam key>

Example:
  python scripts/pdf-to-pages.py pdfs/booklet-2026/shary/sc/6.pdf assets/exams/sc/fiqh-hanafi 2026

Writes <output folder>/<exam key>_page-01.webp, _page-02.webp, ... (the naming
scripts/generate-exams.js expects). Run `npm run generate:exams` afterwards.

Requires: pip install pymupdf pillow
"""

import io
import os
import sys

import pymupdf
from PIL import Image

PAGE_WIDTH_PX = 1240  # A4 at ~150 dpi — sharp on phones, matches PAGE_ASPECT_RATIO in the app
WEBP_QUALITY = 70


def convert(pdf_path: str, out_dir: str, exam_key: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    doc = pymupdf.open(pdf_path)
    total = 0
    for number, page in enumerate(doc, start=1):
        zoom = PAGE_WIDTH_PX / page.rect.width
        pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        image = Image.open(io.BytesIO(pixmap.tobytes("png")))
        out_path = os.path.join(out_dir, f"{exam_key}_page-{number:02d}.webp")
        image.save(out_path, "WEBP", quality=WEBP_QUALITY, method=6)
        total += os.path.getsize(out_path)
    print(f"{pdf_path} -> {out_dir}: {doc.page_count} pages, {total / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # Arabic file names on Windows consoles
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    convert(*sys.argv[1:])
