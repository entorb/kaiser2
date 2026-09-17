#!/bin/sh
# Extract and convert all Kaiser 2 assets from the Atari disk images.
set -e
cd "$(dirname "$0")/.."

python3 scripts/atr.py
python3 scripts/render_gfx.py
python3 scripts/extract_audio.py
python3 scripts/extract_snd.py

echo "done: re/files/ (raw) and re/assets/ (png/wav)"
