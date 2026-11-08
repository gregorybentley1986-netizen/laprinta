#!/usr/bin/env node
// Seeds the demo catalog on first run so `npm run dev` works out of the box.
import { spawnSync } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(root, "storage"));
const hasDb = await stat(path.join(dataDir, "db.json")).catch(() => null);

if (!hasDb) {
  console.log("No catalog data found — seeding demo catalog…");
  const r = spawnSync(process.execPath, [path.join(root, "scripts/seed.mjs")], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}
