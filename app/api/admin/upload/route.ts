import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { mutateDb, readDb } from "@/lib/db";
import { UploadError, saveUpload } from "@/lib/storage";
import type { ProductMedia } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const productId = String(form?.get("productId") ?? "");
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!productId || !files.length) return NextResponse.json({ error: "Нет файлов для загрузки" }, { status: 400 });

  const db = await readDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });

  const saved: ProductMedia[] = [];
  const errors: string[] = [];
  let order = product.media.length ? Math.max(...product.media.map((m) => m.sortOrder)) + 1 : 0;
  for (const file of files) {
    try {
      saved.push(await saveUpload(productId, file, order++));
    } catch (err) {
      errors.push(err instanceof UploadError ? err.message : `${file.name}: не удалось сохранить файл`);
    }
  }

  if (saved.length) {
    await mutateDb((draft) => {
      const p = draft.products.find((x) => x.id === productId);
      if (!p) return;
      const hadCover = p.media.some((m) => m.isCover);
      const firstImage = p.media.find((m) => m.type === "image")?.url ?? saved.find((m) => m.type === "image")?.url;
      for (const m of saved) {
        if (m.type === "image" && !hadCover && !p.media.some((x) => x.isCover)) m.isCover = true;
        if ((m.type === "glb" || m.type === "video") && firstImage) m.posterUrl = firstImage;
        p.media.push(m);
      }
      p.updatedAt = new Date().toISOString();
    });
    revalidatePath("/", "layout");
  }

  return NextResponse.json({ saved, errors }, { status: saved.length ? 200 : 400 });
}
