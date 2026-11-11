"""Cuts the 4x3 passenger sheet (Gemini, Nov 2026) into 12 transparent, square sprites.

Usage: python cut_passengers.py sheet.jpg out_dir   (then save as WebP into public/passengers/)

Background = near-white pixels connected to the cell edges (the dark outlines stop the
flood, so white bellies and faces stay). A thin band along the cut gets alpha from how
far it is from white, and its colour is un-blended from the white so edges have no halo.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
IDS = ["balloon-dog", "goldfish", "teddy", "alien", "duck", "frog", "unicorn-pal", "monkey", "dino", "penguin", "robot", "bee-pal"]
XS = [0, 300, 600, 900, 1200]
YS = [0, 298, 598, 896]
SIZE, PAD = 256, 0.06

sheet = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
for i, pid in enumerate(IDS):
    r, c = divmod(i, 4)
    cell = sheet[YS[r] + 4:YS[r + 1] - 3, XS[c] + 4:XS[c + 1] - 3]
    lo = cell.min(2)
    whiteish = lo > 222                                   # background candidates (JPEG noise allowed)
    lab, n = ndimage.label(whiteish)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # soft edge: pixels near the background get alpha from their distance to white
    near = ndimage.binary_dilation(bg, iterations=2) & ~bg
    alpha = np.where(bg, 0.0, 1.0)
    whiteness = np.clip((lo - 150) / (255 - 150), 0, 1)  # 1 = white, 0 = solid
    alpha[near] = np.clip(1 - whiteness[near], 0, 1) ** 0.8
    alpha[near & (lo < 150)] = 1.0
    # un-blend the white from semi-transparent edge pixels
    a = alpha[..., None]
    rgb = np.where(a > 0.02, (cell - (1 - a) * 255) / np.maximum(a, 0.02), 0)
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    box = img.getbbox()
    img = img.crop(box)
    side = int(max(img.size) * (1 + 2 * PAD))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, side - img.height - int(side * PAD)), img)  # sit on the bottom edge
    canvas = canvas.resize((SIZE, SIZE), Image.LANCZOS)
    canvas.save(f"{out}/{pid}.png", optimize=True)
    print(pid, box, img.size)
