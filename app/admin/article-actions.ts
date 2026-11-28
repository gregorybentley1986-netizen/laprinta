"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { mutateDb } from "@/lib/db";
import { MEDIA_PREFIX } from "@/lib/paths";
import { sanitizeArticleHtml } from "@/lib/sanitize";
import { isValidSlug, slugify } from "@/lib/slug";
import { deleteArticleUploads } from "@/lib/storage";
import type { Article, ArticleStatus } from "@/lib/types";
import type { ActionResult } from "./actions";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const refresh = () => revalidatePath("/", "layout");

export type ArticleInput = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string | null;
  coverAlt: string;
  bodyHtml: string;
  status: ArticleStatus;
  publishedAt: string;
  relatedProductIds: string[];
  seo: { title: string; description: string };
};

const MAX_BODY = 500_000;

export async function saveArticle(input: ArticleInput): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();
  const title = input.title.trim().slice(0, 200);
  if (!title) return fail("Укажите заголовок статьи");
  if (!/^[a-z0-9-]{1,48}$/.test(input.id)) return fail("Некорректный идентификатор статьи");
  const slug = (input.slug.trim() || slugify(title)).toLowerCase();
  if (!isValidSlug(slug)) return fail("Адрес (slug) может содержать только латиницу, цифры и дефисы");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.publishedAt) || Number.isNaN(Date.parse(input.publishedAt))) return fail("Укажите дату публикации");
  if (input.status !== "published" && input.status !== "draft") return fail("Неизвестный статус");
  if (input.bodyHtml.length > MAX_BODY) return fail("Текст статьи слишком большой");
  const coverUrl = input.coverUrl && input.coverUrl.startsWith(MEDIA_PREFIX) && !input.coverUrl.includes("..") ? input.coverUrl : null;
  const bodyHtml = sanitizeArticleHtml(input.bodyHtml);

  return mutateDb((db) => {
    if (db.articles.some((a) => a.slug === slug && a.id !== input.id)) return fail(`Адрес «${slug}» уже занят другой статьёй`);
    const now = new Date().toISOString();
    const fields = {
      title,
      slug,
      excerpt: input.excerpt.trim().slice(0, 400),
      coverUrl,
      coverAlt: input.coverAlt.trim().slice(0, 200),
      bodyHtml,
      status: input.status,
      publishedAt: input.publishedAt,
      relatedProductIds: [...new Set(input.relatedProductIds)].filter((id) => db.products.some((p) => p.id === id)).slice(0, 8),
      seo: { title: input.seo.title.trim().slice(0, 120), description: input.seo.description.trim().slice(0, 300) },
      updatedAt: now,
    };
    const existing = db.articles.find((a) => a.id === input.id);
    if (existing) Object.assign(existing, fields);
    else {
      for (const a of db.articles) a.sortOrder += 1;
      db.articles.push({ id: input.id, ...fields, sortOrder: 0, createdAt: now } satisfies Article);
    }
    refresh();
    return { ok: true as const, id: input.id, slug };
  });
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  await requireAdmin();
  const res = await mutateDb((db) => {
    const idx = db.articles.findIndex((a) => a.id === id);
    if (idx < 0) return fail("Статья не найдена");
    db.articles.splice(idx, 1);
    db.articles.sort((a, b) => a.sortOrder - b.sortOrder).forEach((a, i) => (a.sortOrder = i));
    return { ok: true as const };
  });
  if (res.ok) {
    await deleteArticleUploads(id);
    refresh();
  }
  return res;
}

export async function reorderArticles(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    ids.forEach((id, i) => {
      const a = db.articles.find((x) => x.id === id);
      if (a) a.sortOrder = i;
    });
    refresh();
    return { ok: true as const };
  });
}

export async function setArticleStatus(id: string, status: ArticleStatus): Promise<ActionResult> {
  await requireAdmin();
  if (status !== "published" && status !== "draft") return fail("Неизвестный статус");
  return mutateDb((db) => {
    const a = db.articles.find((x) => x.id === id);
    if (!a) return fail("Статья не найдена");
    a.status = status;
    a.updatedAt = new Date().toISOString();
    refresh();
    return { ok: true as const };
  });
}
