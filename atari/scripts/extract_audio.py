"""
Extract Kaiser 2 audio to WAV.

MUSIK.DAT is loaded at $B400 (2032 bytes) by KAISERII.TUR. The BASIC player
reads 3-byte POKEY AUDF triples: tune 1 = triples 0..126 ($B400), tune 2 =
triples 127.. ($B57D). Each triple is (AUDF0, AUDF1, AUDF2); 0xFF means the
voice is off.

KAISER1.SND (15073 bytes at $7530) uses a custom 6502 player embedded in
TESTER.TUR - not decoded yet.
"""

import struct
import sys
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FILES = ROOT / "re" / "files"
OUT = ROOT / "re" / "assets" / "audio"

SAMPLE_RATE = 44100
AUDF_CLOCK = 1773447.0 / 28.0  # 64 kHz POKEY clock


def audf_to_hz(au):
    if au >= 0xFF:
        return 0.0
    return AUDF_CLOCK / (2.0 * (au + 1))


def render_triples(triples, note_seconds=0.06):
    frames = int(note_seconds * SAMPLE_RATE)
    out = []
    phase = [0.0, 0.0, 0.0]
    for a, b, c in triples:
        freqs = [audf_to_hz(a), audf_to_hz(b), audf_to_hz(c)]
        for _ in range(frames):
            s = 0.0
            for ch in range(3):
                f = freqs[ch]
                if f <= 0:
                    continue
                phase[ch] += f / SAMPLE_RATE
                s += 1.0 if (phase[ch] % 1.0) < 0.5 else -1.0
            out.append(int(max(-1.0, min(1.0, s / 3.0)) * 20000))
    return out


def write_wav(path, samples) -> None:
    with path.open("wb") as fh, wave.open(fh, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(b"".join(struct.pack("<h", s) for s in samples))


def parse_musik(data):
    n = (len(data) // 3) * 3
    triples = [tuple(data[i : i + 3]) for i in range(0, n, 3)]
    return triples[:127], triples[127:]


def main() -> None:
    disk = Path(sys.argv[1]).name if len(sys.argv) > 1 else "k320a"
    OUT.mkdir(parents=True, exist_ok=True)
    musik = FILES / disk / "MUSIK___DAT"
    if musik.exists():
        tune1, tune2 = parse_musik(musik.read_bytes())
        write_wav(OUT / "musik_tune1.wav", render_triples(tune1))
        write_wav(OUT / "musik_tune2.wav", render_triples(tune2))
        print(f"MUSIK.DAT: {len(tune1)} + {len(tune2)} triples -> 2 WAVs")
    snd = FILES / disk / "KAISER1_SND"
    if snd.exists():
        print(
            f"KAISER1.SND present ({snd.stat().st_size} bytes) - "
            f"see scripts/extract_snd.py"
        )


if __name__ == "__main__":
    main()
