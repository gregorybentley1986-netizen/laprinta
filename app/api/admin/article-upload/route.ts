import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { UploadError, saveScopedUpload } from "@/lib/storage";

export const runtime = "nodejs";

/** Uploads media for the article editor. Files live under uploads/articles/<articleId>/. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const articleId = String(form?.get("articleId") ?? "");
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!articleId || !files.length) return NextResponse.json({ error: "Нет файлов для загрузки" }, { status: 400 });

  const saved = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      const m = await saveScopedUpload("articles", articleId, file);
      saved.push({ type: m.type, url: m.url, width: m.width, height: m.height, name: file.name });
    } catch (err) {
      errors.push(err instanceof UploadError ? err.message : `${file.name}: не удалось сохранить файл`);
    }
  }
  return NextResponse.json({ saved, errors }, { status: saved.length ? 200 : 400 });
}
