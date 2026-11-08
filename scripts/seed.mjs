#!/usr/bin/env node
// Builds storage/db.json and copies demo media into storage/uploads.
// Usage: node scripts/seed.mjs [--force]   (--force wipes existing data)
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { products, sections } from "../seed/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(root, "storage"));
const dbFile = path.join(dataDir, "db.json");
const uploadDir = path.join(dataDir, "uploads");
const force = process.argv.includes("--force");

const exists = async (p) => !!(await stat(p).catch(() => null));

if ((await exists(dbFile)) && !force) {
  console.log(`db already exists at ${dbFile}; use --force to reseed`);
  process.exit(0);
}

const lock = JSON.parse(await readFile(path.join(root, "seed/photos.lock.json"), "utf8"));
const photoMeta = new Map(lock.map((p) => [p.id, p]));
const mimeByExt = { ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".glb": "model/gltf-binary" };

if (force) await rm(path.join(uploadDir, "products"), { recursive: true, force: true });
const now = new Date().toISOString();

async function placeFile(productId, rel) {
  const src = path.join(root, "seed/media", rel);
  const name = path.basename(rel);
  const destDir = path.join(uploadDir, "products", productId);
  await mkdir(destDir, { recursive: true });
  await copyFile(src, path.join(destDir, name));
  const { size } = await stat(src);
  return { url: `/media/products/${productId}/${name}`, bytes: size, mime: mimeByExt[path.extname(name)] };
}

const db = {
  version: 1,
  sections: sections.map((s, i) => ({
    status: "published",
    ...s,
    sortOrder: sections.filter((x, j) => j < i && x.parentId === s.parentId).length,
  })),
  products: [],
};

const perSection = new Map();
for (const p of products) {
  const order = perSection.get(p.sectionId) ?? 0;
  perSection.set(p.sectionId, order + 1);
  const media = [];
  for (const [i, m] of p.media.entries()) {
    const placed = await placeFile(p.id, m.file);
    const item = { id: `${p.id}-m${i}`, type: m.type, ...placed, sortOrder: i, createdAt: now };
    if (m.photo) {
      const meta = photoMeta.get(m.photo);
      Object.assign(item, { alt: meta.alt, width: meta.width, height: meta.height });
    }
    if (m.poster) item.posterUrl = (await placeFile(p.id, m.poster)).url;
    if (m.type === "glb") item.alt = `3D-модель: ${p.name}`;
    media.push(item);
  }
  const firstImage = media.find((m) => m.type === "image");
  if (firstImage) firstImage.isCover = true;
  const glb = media.find((m) => m.type === "glb");
  if (glb && firstImage) glb.posterUrl = firstImage.url;

  db.products.push({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    sectionId: p.sectionId,
    sortOrder: order,
    priceRub: p.priceRub,
    priceFrom: p.priceFrom ?? false,
    inStock: p.inStock ?? true,
    loadGrams: p.loadGrams,
    material: p.material,
    colors: p.colors,
    specs: p.specs.map(([label, value]) => ({ label, value })),
    media,
    marketplace: {},
    seo: { title: "", description: "" },
    status: p.status ?? "published",
    createdAt: now,
    updatedAt: now,
  });
}

await mkdir(dataDir, { recursive: true });
await writeFile(dbFile, JSON.stringify(db, null, 2));
console.log(`✓ seeded ${db.sections.length} sections, ${db.products.length} products → ${dbFile}`);
