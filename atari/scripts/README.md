# Kaiser 2 extraction scripts

Rerun from the repository root:

```sh
python3 scripts/atr.py                 # extract all files from k320a.atr/k320b.atr
python3 scripts/render_gfx.py          # raw .PIC/.MAP/.FNT -> re/assets/gfx/*.png
python3 scripts/extract_audio.py       # MUSIK.DAT -> re/assets/audio/*.wav
python3 scripts/extract_snd.py         # KAISER1.SND custom player -> WAV
python3 scripts/decompress_pic.py re/files/k320a/KAISER2_PIC out.raw
```

Requirements: `python3`, `Pillow` (rendering), `py65` (loader study).

Outputs land in `re/files/` (raw files) and `re/assets/` (PNG/WAV).

## Disk image format (custom 'KAISER.SER' DOS)

* 128-byte sectors, 16-byte ATR header.
* Directory at sector 361, 8 sectors, 16-byte entries:
  `[status][sector-count LE16][first-sector LE16][name 11]`.
* Active file iff `status & 0x03`; `0x40`/`0x60` are banner/filler entries,
  `0x80` is deleted/stale.
* Files are contiguous. Length = declared sector count when > 0 and it does
  not overlap the next file, else the gap to the next active file.
* **File-data sectors end with a 3-byte trailer at offsets 125..127. The last
  byte is the number of valid data bytes (`0x7d` = 125 = full sector).** The
  boot sector and directory have no trailer. This must be stripped, otherwise
  every picture is scrambled and the loader disassembles as "corrupt".

## Screen format

* `.PIC` / `KARTE*.MAP`: 7680 bytes = 320x192, 1 bpp (2 colors), 40 bytes per
  scanline, row-major.
* `.FNT`: 1024 bytes = 128 glyphs x 8 bytes (8x8, 1 bpp).

Validate a raw screen against the game's own checksum:
`sum(screen[0::33])` must equal the value in the `KAISER1.TUR` DATA lines
(KARTE1.MAP = 12174, KARTE2.MAP = 14168, KARTE3.MAP = 11769, KAISER1.PIC = 1413,
CHRONIK.PIC = 1843).

## Compressed pictures (KAISERL.DAT)

`KAISER0.TUR` opens a `.PIC` on IOCB #1 and calls `X=USR(ADR(MIL$))`, where
`MIL$` holds the 275 bytes of `KAISERL.DAT`. It reads a 27-byte header (byte 7 =
mode, bytes 13..17 = the five color registers), then an RLE-ish token stream,
writing 7680 bytes to screen memory (`SAVMSC` = `$58/$59`). Compressed files
start `ff 80 c9 c7 1a 00 01 01 0e 00 28 00 c0 34 c8 7c 46 ...`
(e.g. `KAISER0.PIC`, `KAISER2.PIC`).

**Open problem:** the exact token semantics are not fully recovered, so the
decoded output does not yet match the expected checksum (`13314` for
`KAISER2.PIC`). `scripts/decompress_pic.py` contains the faithful Python model
of the disassembly used to work on this.

## Sound effects (KAISER1.SND)

`TESTER.TUR` stores a 317-byte 6502 player in the string `O$` and calls it as
`X=USR(ADR(O$),1,0,0,0,4,8,12,START,START+13420)` with `START=$7530`. The player
is VCOUNT-synced and writes the pitch to POKEY AUDF1 (`$D201`); it reads the
15073-byte `KAISER1.SND` as a stream of 2-bit indices into a 4-entry pitch table
(`$D7..$DA` = `$10,$14,$18,$1C`). `scripts/extract_snd.py` pulls the player out
of the ATR (it sits in the file-data sectors past the truncated `TESTER.TUR`,
split across four BASIC string assignments), emulates it with py65, records the
AUDF1 timeline and synthesises `re/assets/audio/kaiser1_snd.wav` (3.42 s).
