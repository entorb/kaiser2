"""
Decompress Kaiser 2 .PIC screens with the original loader.

KAISERL.DAT (275 bytes of 6502, signature `P.B. '86`) is called by
KAISER0.TUR as `X=USR(ADR(MIL$))` with IOCB #1 open on a .PIC file. It reads a
27-byte header, then an RLE-ish token stream, and writes 7680 bytes (320x192,
1 bpp) into screen memory (SAVMSC = $58/$59). CIO GET ($E456) is intercepted.

The routine disassembles cleanly once the per-sector trailer is stripped
(see scripts/atr.py). Its exact token semantics are still being reverse
engineered; `Loader` below is a faithful Python model of the disassembly and
is the scratch pad for that work.

Reference values (from KAISER0.TUR / KAISER1.TUR): the decoded screen must
satisfy sum(screen[0::33]) == 13314 (KAISER2.PIC) / 1413 (KAISER1.PIC) / ...
"""

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FILES = ROOT / "re" / "files"

SCREEN = 7680


class Loader:
    """Faithful model of the KAISERL.DAT routine (see plan-atari-extract.md)."""

    def __init__(self, data, mode=1, end_on_bit7=True) -> None:
        self.data = data
        self.pos = 0
        self.mode = mode
        self.end_on_bit7 = end_on_bit7
        self.out = bytearray(SCREEN)
        self.ptr = 0
        self.dc = 0
        self.db = 0
        self.base = 0
        self.done = False

    def get(self):
        if self.pos >= len(self.data):
            self.done = True
            return None
        b = self.data[self.pos]
        self.pos += 1
        return b

    def advance(self) -> None:
        if self.mode == 2:
            self.ptr += 1
        else:
            self.dc += 1
            self.ptr += 0x50
            if self.dc == 0x60:
                self.dc = 0
                if self.db == 0:
                    self.db = 1
                    self.ptr = self.base + 0x28
                else:
                    self.db = 0
                    self.base += 1
                    self.ptr = self.base

    def run(self):
        for _ in range(27):  # header
            if self.get() is None:
                return self.out
        while not self.done:
            run = self.read_run()
            if run is None:
                break
            self.emit(*run)
        return self.out

    def read_run(self):
        """Read one token: `(count, delta-encoded, first value)`, or None."""
        token = self.get()
        if token is None:
            return None
        de = token & 0x80
        t = token & 0x7F
        if self.end_on_bit7 and de:
            return None
        if t == 0:
            hi, lo = self.get(), self.get()
            if hi is None or lo is None:
                return None
            count = (hi << 8) | lo
        else:
            count = t
        val = self.get()
        if val is None:
            return None
        return count, de, val

    def emit(self, count, de, val) -> None:
        while True:
            if 0 <= self.ptr < SCREEN:
                self.out[self.ptr] = val
            count = (count - 1) & 0xFFFF
            if count == 0xFFFF:
                return
            self.advance()
            if de:
                nv = self.get()
                if nv is None:
                    self.done = True
                    return
                val = nv


def kaiser0_checksum(screen) -> int:
    return sum(screen[0::33])


def repo_path(path) -> Path:
    """Resolve `path` and refuse anything outside the repo (path traversal)."""
    full = Path(path).resolve()
    if not full.is_relative_to(ROOT.resolve()):
        msg = f"refusing path outside repository: {path}"
        raise SystemExit(msg)
    return full


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: decompress_pic.py <pic-file> [out.raw] [mode]")
        sys.exit(1)
    src = repo_path(sys.argv[1])
    mode = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    # src is constrained to the repo by repo_path() above.
    scr = Loader(src.read_bytes(), mode=mode, end_on_bit7=False).run()
    print(f"{src}: nonzero={sum(1 for b in scr if b)} checksum={kaiser0_checksum(scr)}")
    if len(sys.argv) > 2:
        repo_path(sys.argv[2]).write_bytes(scr)  # NOSONAR


if __name__ == "__main__":
    main()
