"""
Kaiser 2 ATR disk-image reader (custom 'KAISER.SER' DOS).

Layout discovered from k320a/k320b.atr:
  - 128-byte sectors, ATR header is 16 bytes.
  - Directory at sector 361, 8 sectors.
  - 16-byte entry: [status][sector-count LE16][first-sector LE16][name 11]
  - A file is active iff (status & 0x03) != 0. 0x40/0x60 are banner/filler
    entries, 0x80 marks deleted/stale entries (excluded automatically).
  - Files are stored contiguously. Length = declared sector-count when it is
    > 0 and does not overlap the next file, otherwise the gap to the next
    active file's first sector.
  - Every file-data sector carries a 3-byte trailer at offsets 125..127, the
    last byte being the number of valid data bytes in that sector. It must be
    stripped, otherwise every 128th..126th byte is garbage (this is what made
    the pictures look scrambled and the loader disassemble "corrupt").
"""

import struct
from pathlib import Path

SECTOR = 128
DIR_FIRST = 361
DIR_SECTORS = 8
# File-data sectors carry a 3-byte trailer at offsets 125..127:
#   [..][..][valid]  where `valid` is the number of data bytes (<= 125).
# The boot sector and directory are stored without it.
FOOTER = 3

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BIN_DIR = ROOT / "bin"
OUT_DIR = ROOT / "re" / "files"


def read_atr(path) -> list[bytes]:
    raw = Path(path).read_bytes()
    magic, _paras, secsize, _hi = struct.unpack("<HHHH", raw[:8])
    if magic != 0x0296:
        msg = f"{path}: not an ATR (magic {magic:#06x})"
        raise ValueError(msg)
    body = raw[16:]
    nsec = len(body) // secsize
    return [body[i * secsize : (i + 1) * secsize] for i in range(nsec)]


def read_sector(sectors, n):
    return sectors[n - 1]


def strip_footer(sec):
    """Drop the 3-byte sector trailer, keeping the declared valid bytes."""
    valid = sec[SECTOR - 1]
    if not 0 < valid <= SECTOR - FOOTER:
        valid = SECTOR - FOOTER
    return sec[:valid]


def _dir_entries(sec):
    """Active directory entries: `{name, start, count, status}` per file."""
    entries = []
    for s in range(DIR_FIRST, DIR_FIRST + DIR_SECTORS):
        blk = sec(s)
        for off in range(0, SECTOR, 16):
            e = blk[off : off + 16]
            if e[0] & 0x03 == 0:
                continue
            count = int.from_bytes(e[1:3], "little")
            start = int.from_bytes(e[3:5], "little")
            name = "".join(chr(b) if 32 <= b < 127 else "." for b in e[5:16]).rstrip()
            if not name or start == 0:
                continue
            entries.append(
                {"name": name, "start": start, "count": count, "status": e[0]}
            )
    return entries


def _resolve_length(entries, i) -> None:
    """Decide the sector count and anomaly flag for entry `i` in place."""
    en = entries[i]
    nxt = entries[i + 1]["start"] if i + 1 < len(entries) else None
    gap = (nxt - en["start"]) if nxt else None
    if en["count"] > 0 and (gap is None or en["count"] <= gap):
        secs, rule = en["count"], "count"
    elif gap is not None:
        secs, rule = gap, "gap"
    else:
        secs, rule = en["count"], "count-last"
    en["gap"] = gap
    en["secs"] = secs
    en["rule"] = rule
    en["anomaly"] = en["count"] > 0 and gap is not None and en["count"] > gap


def parse_atr(path):
    sectors = read_atr(path)

    def sec(n):
        return sectors[n - 1]

    entries = _dir_entries(sec)
    entries.sort(key=lambda x: x["start"])
    for i, en in enumerate(entries):
        _resolve_length(entries, i)
        en["data"] = b"".join(
            strip_footer(sec(n)) for n in range(en["start"], en["start"] + en["secs"])
        )
    return entries


def disk_path(disk) -> Path:
    p = Path(disk)
    return p if p.is_absolute() else BIN_DIR / p


def extract(disk, outdir=None):
    entries = parse_atr(disk_path(disk))
    stem = Path(disk).stem
    outdir = Path(outdir) if outdir else OUT_DIR / stem
    outdir.mkdir(parents=True, exist_ok=True)
    for en in entries:
        fname = en["name"].replace(" ", "_")
        (outdir / fname).write_bytes(en["data"])
    return entries, outdir


if __name__ == "__main__":
    import sys

    for disk in sys.argv[1:] or ["k320a.atr", "k320b.atr"]:
        entries, outdir = extract(disk)
        print(f"== {disk} ({len(entries)} active files) -> {outdir}")
        for en in entries:
            flag = " ANOMALY" if en["anomaly"] else ""
            print(
                f"  {en['name']:<12} start={en['start']:>4} cnt={en['count']:>3} "
                f"gap={en['gap']!s:>4} secs={en['secs']:>3} "
                f"bytes={len(en['data']):>6} rule={en['rule']}{flag}"
            )
