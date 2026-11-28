#!/usr/bin/env node
// Seeds the demo catalog on first run so `npm run dev` works out of the box.
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(root, "storage"));
const dbFile = path.join(dataDir, "db.json");
const hasDb = await stat(dbFile).catch(() => null);
const seed = (...args) => spawnSync(process.execPath, [path.join(root, "scripts/seed.mjs"), ...args], { stdio: "inherit" }).status ?? 1;

if (!hasDb) {
  console.log("No catalog data found — seeding demo catalog…");
  process.exit(seed());
}

// Databases created before articles existed get the demo articles once.
const db = JSON.parse(await readFile(dbFile, "utf8"));
if (!Array.isArray(db.articles)) {
  console.log("No articles found — adding demo articles…");
  process.exit(seed("--articles"));
}
