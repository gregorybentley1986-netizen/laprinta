#!/usr/bin/env node
// Downloads seed photos from Wikimedia Commons, normalizes them to JPEG,
// renders the demo video and rewrites CREDITS.md. Outputs are committed,
// so `npm run seed` works offline; run this only to refresh the assets.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "seed/photos.json"), "utf8"));
const outDir = path.join(root, "seed/media/photos");
const videoDir = path.join(root, "seed/media/video");
await mkdir(outDir, { recursive: true });
await mkdir(videoDir, { recursive: true });

const UA = "laprinta-seed/1.0 (https://laprinta.ru; catalog seed script)";
const MAX_EDGE = 1600;

async function commonsInfo(title) {
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      titles: `File:${title}`,
      prop: "imageinfo",
      iiprop: "url|size",
      iiurlwidth: String(MAX_EDGE),
      format: "json",
    });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status} for ${title}`);
  const data = await res.json();
  const page = Object.values(data.query.pages)[0];
  const info = page.imageinfo[0];
  return { downloadUrl: info.thumburl ?? info.url, originalUrl: info.url, pageUrl: info.descriptionurl };
}

const lock = [];
for (const item of manifest) {
  const info = await commonsInfo(item.commonsTitle);
  const res = await fetch(info.downloadUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download ${res.status} for ${item.commonsTitle}`);
  const input = Buffer.from(await res.arrayBuffer());
  const file = path.join(outDir, `${item.id}.jpg`);
  const meta = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .flatten({ background: item.background ?? "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(file);
  lock.push({ ...item, ...info, width: meta.width, height: meta.height, file: `seed/media/photos/${item.id}.jpg` });
  console.log(`✓ ${item.id} ${meta.width}×${meta.height}`);
}
await writeFile(path.join(root, "seed/photos.lock.json"), JSON.stringify(lock, null, 2) + "\n");

// Slow pan over the two "float on water" photos (CC BY-SA 4.0 → derivative, same licence).
const video = path.join(videoDir, "float-on-water.mp4");
try {
  const a = path.join(outDir, "float-on-water.jpg");
  const b = path.join(outDir, "float-on-water-2.jpg");
  const pan = (dir) =>
    `scale=1600:-2,crop=1280:720:(iw-1280)/2:(ih-720)*${dir},zoompan=z='min(zoom+0.0009,1.12)':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=30`;
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y",
    "-i", a,
    "-i", b,
    "-filter_complex",
    `[0]${pan("0.55")},setsar=1[v0];[1]${pan("0.45")},setsar=1[v1];[v0][v1]xfade=transition=fade:duration=1:offset=4,format=yuv420p[v]`,
    "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-movflags", "+faststart", video,
  ]);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", "1", "-i", video, "-frames:v", "1", "-q:v", "3", path.join(videoDir, "float-on-water-poster.jpg")]);
  console.log("✓ video float-on-water.mp4");
} catch (err) {
  console.warn("! ffmpeg unavailable or failed, video skipped:", err.message);
}

const lines = [
  "# Источники изображений",
  "",
  "Фотографии в демо-каталоге (`seed/media/photos`) взяты с Wikimedia Commons под свободными лицензиями.",
  "Файлы уменьшены до 1600 px по длинной стороне и пережаты в JPEG; иных изменений нет.",
  "Перед публикацией собственных товаров замените их фотографиями изделий laprinta.",
  "",
  "| Файл | Оригинал | Автор | Лицензия |",
  "|---|---|---|---|",
  ...lock.map(
    (p) => `| \`${p.id}.jpg\` | [${p.commonsTitle}](${p.pageUrl}) | ${p.author} | [${p.license}](${p.licenseUrl}) |`,
  ),
  "",
  "## Видео",
  "",
  "`seed/media/video/float-on-water.mp4` — производная работа (плавная панорама) из двух фотографий",
  "«Lac-des-Hopitaux reflection» (автор Classiccardinal, CC BY-SA 4.0); распространяется под CC BY-SA 4.0.",
  "",
  "## 3D-модели",
  "",
  "`seed/media/models/*.glb` сгенерированы скриптом `scripts/generate-glb.mjs` (собственная работа, без сторонних ассетов).",
  "",
  "## Шрифты",
  "",
  "- Raleway — SIL Open Font License 1.1 (статические начертания для PDF в `assets/fonts/` получены из вариативного шрифта).",
  "- IBM Plex Sans — SIL Open Font License 1.1 (через Google Fonts).",
  "- Arista Pro SemiBold — файл предоставлен заказчиком; используется только для словесного знака `laprinta`.",
  "",
];
await writeFile(path.join(root, "CREDITS.md"), lines.join("\n"));
console.log("✓ CREDITS.md");
