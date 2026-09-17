# Plan — Extract Graphics & Audio from Kaiser 2 Atari Binaries

Strategy: pure-Python static extraction + checksum validation against the game's
own `PICCHECK` values. Raw PNG + WAV output. (Emulator route dropped — the
headless monitor could not be driven reliably enough to be useful.)
Scope: everything (screens, fonts, maps, music, sound FX, embedded COM assets).
Disks: `atari/bin/k320a.atr` + `atari/bin/k320b.atr`.

## Required packages / tools

```sh
pip install py65 pillow     # 6502 model (loader study); PNG rendering
```

## Findings (verified)

### Disk image format (solved)

- Custom 'KAISER.SER' DOS, 128-byte sectors, 16-byte ATR header.
- Directory at sector 361 (8 sectors), 16-byte entries:
  `[status][sector-count LE16][first-sector LE16][name 11]`. Active iff
  `status & 0x03` (`0x40`/`0x60` = banner/filler, `0x80` = deleted).
- Files are contiguous. Length = declared sector count when > 0 and not
  overlapping the next file, else the gap to the next active file.
- **Every file-data sector has a 3-byte trailer at offsets 125..127; the last
  byte is the number of valid data bytes in that sector (`0x7d` = 125 = full).**
  The boot sector and directory do *not* have it. Stripping the trailer is what
  makes the data correct — with it left in, every picture looked scrambled and
  `KAISERL.DAT` disassembled as "corrupt". With it stripped, extracted lengths
  match the game's own `BGET` sizes exactly and `PICCHECK` checksums match.

### Assets

- Screens: 7680 B = **320x192, 1 bpp** (2 colors), 40 B/scanline, row-major.
  `KARTE1-3.MAP`, `KAISER5.PIC`, `KAISER4.PIC`, `KRON.PIC`, `KAISERII.PIC` are raw.
- Fonts: `KAISER.FNT`, `KRIEG.FNT` = 1024 B (128 glyphs x 8, 8x8 1 bpp).
- Music: `MUSIK.DAT` = 3-byte POKEY AUDF triples at `$B400`; tune 1 = triples
  0..126, tune 2 = 127.. (`KAISERII.TUR:930`). `KAISER1.SND` (15853 B at
  `$7530`) is played by a 317-byte custom player stored in `TESTER.TUR`'s `O$`
  string (`MUSICINIT`/`MUSIC`): it is VCOUNT-synced and writes AUDF1, reading a
  stream of 2-bit indices into a 4-entry pitch table (`$D7..$DA`). Decoded to
  `kaiser1_snd.wav` via `scripts/extract_snd.py`.
- Compressed: `KAISER0.PIC`, `KAISER2.PIC` (and others) start
  `ff 80 c9 c7 1a 00 01 01 0e 00 28 00 c0 34 c8 7c 46 ...`; loader is
  `KAISERL.DAT` (275 B ML, `KAISER0.TUR` `BILDLAD`, signature `P.B. '86`).
  Header bytes 13..17 are the 5 color registers; byte 7 is a mode flag.
  `KAISER0.TUR` validates the result with `sum(screen[0::33]) == 13314`.
- Some screens drawn procedurally (PLOT/DRAWTO) — no asset file.

### Checksum validation (from `KAISER1.TUR` DATA lines)

`sum(screen[0::33])` must equal the DATA value. Confirmed with stripped sectors:

| file | sum | expected |
| --- | --- | --- |
| KARTE1.MAP | 12174 | 12174 |
| KARTE2.MAP | 14168 | 14168 |
| KARTE3.MAP | 11769 | 11769 |
| KAISER1.PIC | 1413 | 1413 |
| CHRONIK.PIC | 1843 | 1843 |

## Deliverables

```plain
scripts/                 # all extraction/conversion, rerunnable
  atr.py                 # ATR reader/extractor (strips sector trailers)
  render_gfx.py          # raw PIC/MAP/FNT -> PNG (320x192 1bpp)
  extract_audio.py       # MUSIK.DAT -> WAV
  extract_snd.py         # KAISER1.SND custom player -> WAV
  decompress_pic.py      # py65 model of the KAISERL.DAT loader
  run_all.sh
re/
  files/k320a,k320b/     # raw extracted files
  assets/gfx/*.png
  assets/audio/*.wav
```

## Status

- [x] Phase 1 — ATR extractor (incl. sector-trailer fix), all files extracted.
- [x] Phase 2a — Raw screens + fonts rendered to PNG, checksums validated.
- [~] Phase 2b — Compressed `.PIC` (`KAISERL.DAT`) loader: deprioritized, the
  compressed screens are title/menu art that will be reimplemented. Model and
  findings kept in `scripts/decompress_pic.py` / below.
- [x] Phase 2c — `TITEL.COM`/`EHRE.COM` are COM binaries (load `$6D00`), not raw
  screens; the screens they draw are procedural.
- [x] Phase 3a — `MUSIK.DAT` -> WAV.
- [x] Phase 3b — `KAISER1.SND` -> WAV (`scripts/extract_snd.py`, 3.42s).
- [x] Phase 5 — `scripts/README.md`, `AGENTS.md` updated.

## Open problem — `KAISERL.DAT` picture loader

After stripping the sector trailer the routine disassembles cleanly (no more
branch targets landing mid-instruction — that was the trailer bytes). The
routine:

1. reads a 27-byte header (byte 7 -> mode `$D4`, bytes 13..17 -> color regs);
2. decodes an RLE-ish stream: token < 0x80 = run length, token 0 = read a
   16-bit length, then a data byte; bit 7 of the token selects "literal run"
   (new byte each output) vs "repeat" (same byte);
3. writes to the screen in a field-interleaved order (stride `$50`, 0x60 steps,
   then base `+$28`/`+1`) when mode 1, or stride 1 when mode 2;
4. `RTS`es when a token with bit 7 set is read.

The routine's own end condition (`RTS` on any byte >= 0x80) fires after a few
bytes because the data contains many high bytes, so either the trailer was also
part of the stream format or the end test means something else. A Python model
of the routine reproduces the disassembly's behavior but not the expected
checksum (`13314`), so the exact token semantics are still being pinned down.

Next attempts:

1. Decode `KAISER0.PIC` too and look for shared structure / self-consistency.
2. Treat bit 7 as a literal-run flag (no early end) and validate against 13314.
3. Check `KAISER.DAT` / `KAISER0.DAT` (small, possibly the same packer) for a
   second sample of the format.

## Risks

- `KAISERL.DAT` token semantics unresolved (blocks the compressed title/menu
  screens only; the game maps and all raw screens are already extracted).
- `KAISER1.SND` rendering assumes PAL VCOUNT timing (114 cycles/scanline) and
  the `O$` argument mapping `1,0,0,0,4,8,12,START,START+13420`; the pitch table
  comes out as `$10,$14,$18,$1C` (4 pitches).
