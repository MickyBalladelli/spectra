#!/usr/bin/env python3
from PIL import Image
import sys
import os

IN_PATH = sys.argv[1] if len(sys.argv) > 1 else 'images/spectra.png'
OUT_PATH = sys.argv[2] if len(sys.argv) > 2 else IN_PATH

if not os.path.exists(IN_PATH):
    print(f'Input file not found: {IN_PATH}', file=sys.stderr)
    sys.exit(2)

# backup if overwriting
if OUT_PATH == IN_PATH:
    backup = IN_PATH + '.orig'
    if not os.path.exists(backup):
        os.rename(IN_PATH, backup)
        IN_PATH = backup

im = Image.open(IN_PATH).convert('RGBA')
px = im.load()
width, height = im.size

# threshold for "white-ish" detection
THRESH = 250

for y in range(height):
    for x in range(width):
        r, g, b, a = px[x, y]
        if r >= THRESH and g >= THRESH and b >= THRESH:
            px[x, y] = (255, 255, 255, 0)

im.save(OUT_PATH)
print(f'Wrote {OUT_PATH} (backup at {IN_PATH})')
