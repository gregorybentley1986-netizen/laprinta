import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DB_FILE } from "./paths";
import { nameToHex, normalizeHex, parseHexList } from "./colors";
import type { Database, Product, ProductColor } from "./types";

// Single-process JSON store. Writes are serialized through a promise queue and
// committed atomically (tmp file + rename), which is enough for one admin user.

let cache: { mtimeMs: number; data: Database } | null = null;
let queue: Promise<unknown> = Promise.resolve();

const EMPTY: Database = { version: 1, sections: [], products: [], articles: [] };

/** Colour roots that read badly as standalone names when a legacy label is split. */
const NAME_FIX: Record<string, string> = { красно: "Красный", бело: "Белый", черно: "Чёрный", зелено: "Зелёный" };

/**
 * Brings rows written by older builds up to the current shape: `colors` used to
 * be plain names, then `{name, hex}` entries that could hold two hex values for a
 * two-tone item. Now an item holds up to `MAX_COLORS` entries, one hex each, so a
 * multi-hex entry is split into separate colours («Зелёный / салатовый» → две
 * записи). Runs on every read; the first admin save persists the new form.
 */
export function normalizeProduct(p: Product): Product {
  if (typeof p.series !== "string") p.series = "";
  const raw = (Array.isArray(p.colors) ? p.colors : []) as unknown[];
  const colors: ProductColor[] = [];
  for (const c of raw) {
    if (typeof c === "string") {
      const name = c.trim();
      if (name) colors.push({ name, hex: nameToHex(name) });
      continue;
    }
    if (!c || typeof c !== "object") continue;
    const obj = c as Partial<ProductColor>;
    const name = String(obj.name ?? "").trim();
    const hexes = parseHexList(String(obj.hex ?? ""));
    if (!hexes.length) {
      colors.push({ name: name || "Цвет", hex: nameToHex(name) });
      continue;
    }
    if (hexes.length === 1) {
      colors.push({ name: name || hexes[0].toUpperCase(), hex: hexes[0] });
      continue;
    }
    // Legacy two-tone entry: one colour per hex, names taken from the label.
    const parts = name
      .split(/[\/,+]|[-–—]/)
      .map((s) => s.trim())
      .filter(Boolean);
    hexes.forEach((hex, i) => {
      const part = (parts[i] ?? parts[0] ?? "").toLowerCase();
      const label = NAME_FIX[part] ?? (part ? part.replace(/^./, (ch) => ch.toUpperCase()) : hex.toUpperCase());
      colors.push({ name: i === 0 && parts.length === 1 && name ? name : label, hex });
    });
  }
  // No truncation here: the icon only shows the first MAX_COLORS sectors, but
  // dropping the rest silently would lose data written by an older build.
  p.colors = dedupeColors(colors);
  return p;
}

function dedupeColors(list: ProductColor[]): ProductColor[] {
  const out: ProductColor[] = [];
  for (const c of list) {
    const hex = normalizeHex(c.hex, nameToHex(c.name));
    if (out.some((x) => x.hex === hex && x.name.toLowerCase() === c.name.toLowerCase())) continue;
    out.push({ name: c.name, hex });
  }
  return out;
}

export async function readDb(): Promise<Database> {
  try {
    const s = await stat(DB_FILE);
    if (cache && cache.mtimeMs === s.mtimeMs) return cache.data;
    const data = JSON.parse(await readFile(DB_FILE, "utf8")) as Database;
    data.articles ??= [];
    data.products ??= [];
    data.products.forEach(normalizeProduct);
    cache = { mtimeMs: s.mtimeMs, data };
    return data;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw err;
  }
}

async function writeDb(data: Database) {
  await mkdir(path.dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, DB_FILE);
  cache = null;
}

/** Run a read-modify-write transaction. The draft is a deep copy; return value is passed through. */
export function mutateDb<T>(fn: (draft: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const draft = structuredClone(await readDb());
    const result = await fn(draft);
    await writeDb(draft);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export const newId = () => randomUUID().replace(/-/g, "").slice(0, 12);
