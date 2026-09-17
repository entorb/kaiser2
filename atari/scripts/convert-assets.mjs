// Convert extracted Atari assets (re/assets) into web assets (public/assets).
// The game no longer uses the Atari graphics or sounds, so this is only kept as
// an archival conversion step.
//
//   png -> public/assets/gfx/<name>.png   (lossless, 1-bpp pixel art)
//   wav -> public/assets/audio/<name>.ogg (Vorbis via ffmpeg-static)
//
// Rerunnable; skips an OGG that is newer than its WAV.
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gfxIn = join(root, "re", "assets", "gfx");
const audioIn = join(root, "re", "assets", "audio");
const gfxOut = join(root, "public", "assets", "gfx");
const audioOut = join(root, "public", "assets", "audio");

const list = (dir, ext) =>
  readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(ext))
    .sort();

const isNewer = (dst, src) => {
  try {
    return statSync(dst).mtimeMs >= statSync(src).mtimeMs;
  } catch {
    return false;
  }
};

mkdirSync(gfxOut, { recursive: true });
mkdirSync(audioOut, { recursive: true });

let images = 0;
for (const name of list(gfxIn, ".png")) {
  writeFileSync(join(gfxOut, name), readFileSync(join(gfxIn, name)));
  images++;
}

let audio = 0;
for (const name of list(audioIn, ".wav")) {
  const src = join(audioIn, name);
  const ogg = `${name.slice(0, -4)}.ogg`;
  const dst = join(audioOut, ogg);
  if (!isNewer(dst, src)) {
    execFileSync(
      ffmpegPath,
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        src,
        "-c:a",
        "libvorbis",
        "-q:a",
        "5",
        dst,
      ],
      { stdio: "inherit" },
    );
  }
  audio++;
}

console.log(`assets: ${images} images, ${audio} audio`);
