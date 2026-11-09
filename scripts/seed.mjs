#!/usr/bin/env node
// Builds storage/db.json and copies demo media into storage/uploads.
// Usage: node scripts/seed.mjs [--force]   (--force wipes existing data)
//        node scripts/seed.mjs --articles  (adds/refreshes demo articles in an existing db, keeps everything else)
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { articles } from "../seed/articles.mjs";
import { products, sections } from "../seed/catalog.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(root, "storage"));
const dbFile = path.join(dataDir, "db.json");
const uploadDir = path.join(dataDir, "uploads");
const force = process.argv.includes("--force");
const articlesOnly = process.argv.includes("--articles");

const exists = async (p) => !!(await stat(p).catch(() => null));

async function seedArticles(db) {
  const now = new Date().toISOString();
  const ids = new Set(articles.map((a) => a.id));
  const kept = (db.articles ?? []).filter((a) => !ids.has(a.id));
  const seeded = [];
  for (const [i, a] of articles.entries()) {
    const dir = path.join(uploadDir, "articles", a.id);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    for (const rel of a.files) await copyFile(path.join(root, "seed/media", rel), path.join(dir, path.basename(rel)));
    const m = (rel) => `/media/articles/${a.id}/${path.basename(rel)}`;
    seeded.push({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      coverUrl: m(a.cover.file),
      coverAlt: a.cover.alt,
      bodyHtml: a.body(m).trim().replace(/\n+/g, ""),
      status: "published",
      publishedAt: a.publishedAt,
      sortOrder: articles.length - 1 - i,
      relatedProductIds: a.related.filter((id) => db.products.some((p) => p.id === id)),
      seo: { title: "", description: "" },
      createdAt: now,
      updatedAt: now,
    });
  }
  // Newest demo article first, user-created articles after them.
  db.articles = [...seeded.sort((x, y) => x.sortOrder - y.sortOrder), ...kept.map((a, i) => ({ ...a, sortOrder: seeded.length + i }))];
  return seeded.length;
}

if (articlesOnly) {
  if (!(await exists(dbFile))) {
    console.log(`no db at ${dbFile}; run without --articles first`);
    process.exit(1);
  }
  const db = JSON.parse(await readFile(dbFile, "utf8"));
  const n = await seedArticles(db);
  await writeFile(dbFile, JSON.stringify(db, null, 2));
  console.log(`✓ seeded ${n} demo articles → ${dbFile}`);
  process.exit(0);
}

if ((await exists(dbFile)) && !force) {
  console.log(`db already exists at ${dbFile}; use --force to reseed`);
  process.exit(0);
}

const lock = JSON.parse(await readFile(path.join(root, "seed/photos.lock.json"), "utf8"));
const photoMeta = new Map(lock.map((p) => [p.id, p]));
const mimeByExt = { ".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4", ".glb": "model/gltf-binary" };

if (force) {
  await rm(path.join(uploadDir, "products"), { recursive: true, force: true });
  await rm(path.join(uploadDir, "articles"), { recursive: true, force: true });
}
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
  articles: [],
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

await seedArticles(db);
await mkdir(dataDir, { recursive: true });
await writeFile(dbFile, JSON.stringify(db, null, 2));
console.log(`✓ seeded ${db.sections.length} sections, ${db.products.length} products, ${db.articles.length} articles → ${dbFile}`);
