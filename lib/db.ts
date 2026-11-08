import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DB_FILE } from "./paths";
import type { Database } from "./types";

// Single-process JSON store. Writes are serialized through a promise queue and
// committed atomically (tmp file + rename), which is enough for one admin user.

let cache: { mtimeMs: number; data: Database } | null = null;
let queue: Promise<unknown> = Promise.resolve();

const EMPTY: Database = { version: 1, sections: [], products: [] };

export async function readDb(): Promise<Database> {
  try {
    const s = await stat(DB_FILE);
    if (cache && cache.mtimeMs === s.mtimeMs) return cache.data;
    const data = JSON.parse(await readFile(DB_FILE, "utf8")) as Database;
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
