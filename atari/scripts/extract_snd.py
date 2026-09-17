"""
Decode KAISER1.SND to WAV by emulating its custom player.

`TESTER.TUR` holds a 317-byte 6502 player in the string `O$` and calls it as
`X=USR(ADR(O$),1,0,0,0,4,8,12,START,START+13420)` with START=$7530. The player
is synced to VCOUNT ($D40B) and writes the note pitch to POKEY AUDF1 ($D201).

We extract the player from the ATR (it lives in the file-data sectors past the
truncated `TESTER.TUR`, split across four BASIC string assignments), emulate it
with py65, record every AUDF1 write with its cycle stamp, and synthesise the
POKEY square wave.
"""

import struct
import sys
import wave
from pathlib import Path

from py65.devices.mpu6502 import MPU
from py65.memory import ObservableMemory

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from atari.scripts.atr import disk_path, read_atr, strip_footer

PLAYER = 0x6000
SND = 0x7530
CPU_HZ = 1790000.0
CYCLES_PER_SCANLINE = 114  # PAL
SR = 44100
SND_LEN = 13420  # START..START+13420


def extract_player(disk="k320a.atr") -> bytes:
    sectors = read_atr(disk_path(disk))
    blob = b"".join(strip_footer(s) for s in sectors[360:400])
    start = blob.find(bytes([0x68, 0x68, 0x68, 0x85, 0xD4]))
    if start < 0:
        msg = "player O$ not found"
        raise ValueError(msg)
    parts, pos = [], start
    for _ in range(4):
        ln = blob[pos - 1]
        parts.append(blob[pos : pos + ln])
        pos += ln
        pos = blob.find(bytes([0x2C, 0x2E, 0x0F]), pos) + 4
    return b"".join(parts)


def capture(player, snd):
    mem = ObservableMemory()
    mem[PLAYER : PLAYER + len(player)] = player
    mem[SND : SND + len(snd)] = snd
    cpu = MPU(memory=mem)
    cpu.pc = PLAYER + 0x57
    cpu.sp = 0xFB
    cpu.p = 0x24
    mem[0x1FC] = 0
    mem[0x1FD] = 0xFF
    mem[0x1FE] = 0x3F
    mem[0xD4] = 1
    mem[0xD5] = 0
    mem[0xD6] = 0
    mem[0xD7] = 0x10
    mem[0xD8] = 0x14
    mem[0xD9] = 0x18
    mem[0xDA] = 0x1C
    mem[0xDB] = SND & 0xFF
    mem[0xDC] = SND >> 8
    mem[0xDD] = (SND + SND_LEN) & 0xFF
    mem[0xDE] = (SND + SND_LEN) >> 8

    events = []

    def rd(addr):
        if addr == 0xD40B:
            return (cpu.processorCycles // CYCLES_PER_SCANLINE) & 0xFF
        return mem._subject[addr]

    def wr(addr, val) -> None:
        if addr == 0xD201:
            events.append((cpu.processorCycles, val))
        mem._subject[addr] = val

    mem.subscribe_to_read([0xD40B], rd)
    mem.subscribe_to_write([0xD201], wr)
    for _ in range(8_000_000):
        if cpu.pc == 0x3FFF or len(events) >= SND_LEN * 4:
            break
        cpu.step()
    return events


def render(events, path):
    end = events[-1][0]
    n = int(end / CPU_HZ * SR)
    out = bytearray()
    phase = 0.0
    ei, cur = 0, 0
    for i in range(n):
        cyc = i * CPU_HZ / SR
        while ei < len(events) and events[ei][0] <= cyc:
            cur = events[ei][1]
            ei += 1
        f = 31960.0 / (cur + 1) if cur else 0.0
        phase += f / SR
        out += struct.pack("<h", 15000 if (phase % 1.0) < 0.5 else -15000)
    with path.open("wb") as fh, wave.open(fh, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(out))
    return end / CPU_HZ


def main() -> None:
    disk = Path(sys.argv[1]).name if len(sys.argv) > 1 else "k320a.atr"
    stem = Path(disk).stem
    snd_path = ROOT / "re" / "files" / stem / "KAISER1_SND"
    if not snd_path.exists():
        print(f"{snd_path} missing; run scripts/atr.py first")
        return
    player = extract_player(disk)
    snd = snd_path.read_bytes()
    events = capture(player, snd)
    out_dir = ROOT / "re" / "assets" / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "kaiser1_snd.wav"
    dur = render(events, out)
    print(
        f"KAISER1.SND: player={len(player)}B notes={len(events)} -> {out} ({dur:.2f}s)"
    )


if __name__ == "__main__":
    main()
