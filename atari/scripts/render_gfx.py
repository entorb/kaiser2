"""
Render extracted Kaiser 2 graphics to PNG.

Screens (.PIC/.MAP) are 1 bit per pixel (2 colors), 40 bytes per scanline,
row-major. Full screens are 7680 bytes = 320x192; several files are *partial*
screens (a slice loaded into screen memory at a fixed row), so the height is
derived from the byte length. Fonts (.FNT) are 1024 bytes = 128 glyphs of 8x8.

`CHRONIK.PIC` is special: 1600 bytes land at the top of the screen and the
following 1200 bytes at offset 6480 (row 162), so the two chunks are composed
into one 320x192 frame.
"""

import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FILES = ROOT / "re" / "files"
OUT = ROOT / "re" / "assets" / "gfx"

WIDTH = 320
ROW = 40
FULL = 7680
FONT_LEN = 1024


def render(data, height) -> Image.Image:
    im = Image.new("1", (WIDTH, height))
    px = im.load()
    for y in range(height):
        row = data[y * ROW : y * ROW + ROW]
        for xb, b in enumerate(row):
            for k in range(8):
                px[xb * 8 + k, y] = (b >> (7 - k)) & 1
    return im


def render_font(data) -> Image.Image:
    im = Image.new("RGB", (128 * 8, 8), (0, 0, 0))
    px = im.load()
    for g in range(128):
        for y in range(8):
            b = data[g * 8 + y] if g * 8 + y < len(data) else 0
            for x in range(8):
                if b & (0x80 >> x):
                    px[g * 8 + x, y] = (255, 255, 255)
    return im


def render_chronik(data) -> Image.Image:
    screen = bytearray(FULL)
    screen[0:1600] = data[0:1600]
    screen[6480 : 6480 + 1200] = data[1600:2800]
    return render(screen, 192)


def render_file(disk, name, data) -> str | None:
    """Render one extracted file to PNG; return the kind, or None to skip."""
    base = name.replace("_", "")
    out = OUT / f"{disk}_{base}.png"

    if name == "CHRONIK_PIC":
        render_chronik(data).convert("L").save(out)
        return "compose"
    if name.endswith(("PIC", "MAP")):
        # Full screens, or partial slices (multiple of one scanline).
        # Anything else is compressed title art (KAISERL.DAT) or junk.
        if len(data) >= FULL:
            n = FULL
        elif len(data) >= 800 and len(data) % ROW == 0:
            n = len(data)
        else:
            return None
        render(data[:n], n // ROW).convert("L").save(out)
        return "screen"
    if name.endswith("FNT") and len(data) >= FONT_LEN:
        render_font(data).save(out)
        return "font"
    return None


def main() -> None:
    disks = [Path(d).name for d in sys.argv[1:]] or ["k320a", "k320b"]
    OUT.mkdir(parents=True, exist_ok=True)
    for disk in disks:
        d = FILES / disk
        if not d.is_dir():
            continue
        for f in sorted(d.iterdir()):
            kind = render_file(disk, f.name, f.read_bytes())
            if kind:
                base = f.name.replace("_", "")
                print(f"{kind:<7} {disk}/{f.name} -> {disk}_{base}.png")


if __name__ == "__main__":
    main()
