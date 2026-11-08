import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { newId } from "./db";
import { MEDIA_PREFIX, UPLOAD_DIR } from "./paths";
import type { MediaType, ProductMedia } from "./types";

type Rule = { type: MediaType; mime: string; maxBytes: number; magic: (b: Buffer) => boolean };

const MB = 1024 * 1024;

const RULES: Record<string, Rule> = {
  jpg: { type: "image", mime: "image/jpeg", maxBytes: 8 * MB, magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  jpeg: { type: "image", mime: "image/jpeg", maxBytes: 8 * MB, magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  png: { type: "image", mime: "image/png", maxBytes: 8 * MB, magic: (b) => b.subarray(0, 4).toString("hex") === "89504e47" },
  webp: { type: "image", mime: "image/webp", maxBytes: 8 * MB, magic: (b) => b.subarray(8, 12).toString() === "WEBP" },
  mp4: { type: "video", mime: "video/mp4", maxBytes: 100 * MB, magic: (b) => b.subarray(4, 8).toString() === "ftyp" },
  webm: { type: "video", mime: "video/webm", maxBytes: 100 * MB, magic: (b) => b.subarray(0, 4).toString("hex") === "1a45dfa3" },
  glb: { type: "glb", mime: "model/gltf-binary", maxBytes: 20 * MB, magic: (b) => b.subarray(0, 4).toString() === "glTF" },
};

export const ACCEPT = ".jpg,.jpeg,.png,.webp,.mp4,.webm,.glb";

export class UploadError extends Error {}

export async function saveUpload(productId: string, file: File, sortOrder: number): Promise<ProductMedia> {
  const ext = path.extname(file.name).slice(1).toLowerCase();
  if (ext === "stl") throw new UploadError(`${file.name}: STL не поддерживается — загрузите модель в формате GLB (glTF 2.0).`);
  const rule = RULES[ext];
  if (!rule) throw new UploadError(`${file.name}: формат не поддерживается. Допустимы JPG, PNG, WebP, MP4, WebM, GLB.`);
  if (file.size > rule.maxBytes) throw new UploadError(`${file.name}: файл больше ${rule.maxBytes / MB} МБ.`);

  const buf = Buffer.from(await file.arrayBuffer());
  if (!rule.magic(buf)) throw new UploadError(`${file.name}: содержимое файла не соответствует расширению.`);

  const id = newId();
  const name = `${id}.${ext === "jpeg" ? "jpg" : ext}`;
  const dir = path.join(UPLOAD_DIR, "products", productId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);

  const media: ProductMedia = {
    id,
    type: rule.type,
    url: `${MEDIA_PREFIX}products/${productId}/${name}`,
    mime: rule.mime,
    bytes: file.size,
    sortOrder,
    alt: "",
    createdAt: new Date().toISOString(),
  };
  if (rule.type === "image") {
    const meta = await sharp(buf).metadata().catch(() => null);
    const rotated = meta?.orientation && meta.orientation >= 5;
    if (meta?.width && meta?.height) {
      media.width = rotated ? meta.height : meta.width;
      media.height = rotated ? meta.width : meta.height;
    }
  }
  return media;
}

export async function deleteUpload(url: string) {
  if (!url.startsWith(MEDIA_PREFIX)) return;
  const file = path.resolve(UPLOAD_DIR, url.slice(MEDIA_PREFIX.length));
  if (!file.startsWith(UPLOAD_DIR + path.sep)) return;
  await rm(file, { force: true });
}

export async function deleteProductUploads(productId: string) {
  await rm(path.join(UPLOAD_DIR, "products", productId), { recursive: true, force: true });
}
