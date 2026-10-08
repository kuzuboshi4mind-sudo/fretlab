"""Generate PWA / app icons (rosewood fretboard with a root-note dot)."""
import sys
from PIL import Image, ImageDraw

def icon(size, maskable=False):
    s = 1024
    im = Image.new("RGB", (s, s), (42, 28, 21))
    d = ImageDraw.Draw(im)
    pad = 230 if maskable else 150
    x0, x1 = pad, s - pad
    top, bot = pad + 40, s - pad - 40
    # frets
    for i, fx in enumerate([x0, x0 + (x1 - x0) * 0.36, x0 + (x1 - x0) * 0.70, x1]):
        w = 26 if i == 0 else 12
        d.rectangle([fx - w / 2, top - 30, fx + w / 2, bot + 30], fill=(243, 238, 226) if i == 0 else (190, 182, 166))
    # strings
    for i in range(6):
        y = top + (bot - top) * i / 5
        d.rectangle([x0, y - (3 + i * 0.9), x1 + 30, y + (3 + i * 0.9)], fill=(227, 220, 203))
    # root dot (amber) and two chord tones
    def dot(cx, cy, r, col):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    cx = x0 + (x1 - x0) * 0.53
    dot(cx, top + (bot - top) * 0.6, 92, (234, 165, 59))
    dot(x0 + (x1 - x0) * 0.18, top + (bot - top) * 0.2, 60, (125, 176, 227))
    dot(x0 + (x1 - x0) * 0.85, top + (bot - top) * 1.0, 60, (133, 187, 148))
    return im.resize((size, size), Image.LANCZOS)

out = sys.argv[1]
for n in (192, 512):
    icon(n).save(f"{out}/icon-{n}.png")
    icon(n, True).save(f"{out}/icon-maskable-{n}.png")
icon(180).save(f"{out}/apple-touch-icon.png")
icon(1024).save(f"{out}/icon-1024.png")
