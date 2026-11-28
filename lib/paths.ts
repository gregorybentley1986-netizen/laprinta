import path from "node:path";

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? path.join(process.cwd(), "storage"));
export const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/** Public URL prefix for files in UPLOAD_DIR (served by app/media/[...path]/route.ts). */
export const MEDIA_PREFIX = "/media/";
