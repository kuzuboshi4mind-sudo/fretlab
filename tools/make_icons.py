"""PWA 用アイコンを assets/icon-master*.png（tools/icon.html から書き出した原画）から作る。"""
import sys
from PIL import Image

out = sys.argv[1]
src = Image.open("assets/icon-master.png").convert("RGB")
mask = Image.open("assets/icon-master-maskable.png").convert("RGB")
for n in (192, 512):
    src.resize((n, n), Image.LANCZOS).save(f"{out}/icon-{n}.png")
    mask.resize((n, n), Image.LANCZOS).save(f"{out}/icon-maskable-{n}.png")
src.resize((180, 180), Image.LANCZOS).save(f"{out}/apple-touch-icon.png")
src.save(f"{out}/icon-1024.png")
