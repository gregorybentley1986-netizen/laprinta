"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { SESSION_COOKIE, SESSION_TTL_S, checkPassword, createSessionToken } from "@/lib/auth-token";
import { mutateDb, newId, readDb } from "@/lib/db";
import { isValidSlug, slugify } from "@/lib/slug";
import { deleteProductUploads, deleteUpload, copyProductUploads } from "@/lib/storage";
import { MAX_COLORS, nameToHex, parseHexList } from "@/lib/colors";
import type { CatalogSection, Database, Product, ProductColor, ProductMedia, ProductStatus, SectionStatus } from "@/lib/types";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function refresh() {
  revalidatePath("/", "layout");
}

// --- Auth ------------------------------------------------------------------

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  if (!(await checkPassword(password))) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Неверный пароль" };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  redirect(next.startsWith("/admin") ? next : "/admin/products");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// --- Products --------------------------------------------------------------

export type ProductInput = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  tagline: string;
  description: string;
  sectionId: string;
  priceRub: number | null;
  priceFrom: boolean;
  inStock: boolean;
  status: ProductStatus;
  loadGrams: number | null;
  material: string;
  series: string;
  colors: ProductColor[];
  specs: { label: string; value: string; variant?: boolean }[];
  marketplace: { ozonUrl?: string; wildberriesUrl?: string };
  seo: { title: string; description: string };
};

const STATUSES: ProductStatus[] = ["published", "draft", "coming_soon"];

function cleanUrl(v?: string) {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function nextSortOrder(db: Database, sectionId: string) {
  const inSection = db.products.filter((p) => p.sectionId === sectionId);
  return inSection.length ? Math.max(...inSection.map((p) => p.sortOrder)) + 1 : 0;
}

/** Keeps colour variants tidy: at most three colours, one hex each, no duplicates. */
function cleanColors(input: ProductColor[] | undefined): ProductColor[] {
  const out: ProductColor[] = [];
  for (const c of Array.isArray(input) ? input : []) {
    const name = String(c?.name ?? "").trim().slice(0, 40);
    const hex = parseHexList(String(c?.hex ?? ""))[0] ?? nameToHex(name);
    if (!name && !hex) continue;
    const item = { name: name || hex.toUpperCase(), hex };
    if (out.some((x) => x.name.toLowerCase() === item.name.toLowerCase() && x.hex === item.hex)) continue;
    out.push(item);
    if (out.length >= MAX_COLORS) break;
  }
  return out;
}

export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return fail("Укажите название товара");
  const slug = (input.slug.trim() || slugify(name)).toLowerCase();
  if (!isValidSlug(slug)) return fail("Адрес (slug) может содержать только латиницу, цифры и дефисы");
  if (input.priceRub != null && (!Number.isFinite(input.priceRub) || input.priceRub < 0)) return fail("Цена должна быть неотрицательным числом");
  if (!STATUSES.includes(input.status)) return fail("Неизвестный статус");

  return mutateDb((db) => {
    if (!db.sections.some((s) => s.id === input.sectionId)) return fail("Выберите раздел");
    if (db.products.some((p) => p.slug === slug && p.id !== input.id)) return fail(`Адрес «${slug}» уже занят другим товаром`);
    const now = new Date().toISOString();
    const fields = {
      name,
      slug,
      sku: input.sku.trim(),
      tagline: input.tagline.trim(),
      description: input.description.trim(),
      priceRub: input.priceRub == null ? null : Math.round(input.priceRub),
      priceFrom: !!input.priceFrom,
      inStock: !!input.inStock,
      status: input.status,
      loadGrams: input.loadGrams == null || !Number.isFinite(input.loadGrams) ? null : input.loadGrams,
      material: input.material.trim(),
      series: (input.series ?? "").trim().replace(/\s+/g, " ").slice(0, 120),
      colors: cleanColors(input.colors),
      specs: input.specs
        .map((s) => ({ label: s.label.trim(), value: s.value.trim(), variant: s.variant ? true : undefined }))
        .filter((s) => s.label && s.value),
      marketplace: { ozonUrl: cleanUrl(input.marketplace.ozonUrl), wildberriesUrl: cleanUrl(input.marketplace.wildberriesUrl) },
      seo: { title: input.seo.title.trim(), description: input.seo.description.trim() },
      updatedAt: now,
    };

    if (input.id) {
      const p = db.products.find((x) => x.id === input.id);
      if (!p) return fail("Товар не найден");
      if (p.sectionId !== input.sectionId) {
        p.sortOrder = nextSortOrder(db, input.sectionId);
        p.sectionId = input.sectionId;
      }
      Object.assign(p, fields);
      refresh();
      return { ok: true as const, id: p.id };
    }

    const product: Product = {
      id: newId(),
      ...fields,
      sectionId: input.sectionId,
      sortOrder: nextSortOrder(db, input.sectionId),
      media: [],
      createdAt: now,
    };
    db.products.push(product);
    refresh();
    return { ok: true as const, id: product.id };
  });
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  const res = await mutateDb((db) => {
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx < 0) return fail("Товар не найден");
    db.products.splice(idx, 1);
    return { ok: true as const };
  });
  if (res.ok) {
    await deleteProductUploads(id);
    refresh();
  }
  return res;
}

/**
 * Copies a product with all its media into a new draft. The copy gets a free
 * slug (`-copy`, `-copy-2`), an empty SKU and `draft` status so it never goes
 * live before someone edits it. Files are duplicated before the row is inserted
 * in one mutation — a restart mid-way otherwise leaves a product without photos.
 */
export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const snapshot = await readDb();
  const src = snapshot.products.find((p) => p.id === id);
  if (!src) return fail("Товар не найден");

  const copyId = newId();
  let media: ProductMedia[] = [];
  try {
    media = await copyProductUploads(src.id, copyId, src.media);
  } catch {
    media = [];
  }

  const res = await mutateDb((db) => {
    const live = db.products.find((p) => p.id === id);
    if (!live) return fail("Товар не найден");
    const now = new Date().toISOString();
    let slug = `${live.slug}-copy`;
    for (let n = 2; db.products.some((p) => p.slug === slug); n += 1) slug = `${live.slug}-copy-${n}`;

    const copy: Product = {
      ...structuredClone(live),
      id: copyId,
      slug,
      name: `${live.name} (копия)`,
      sku: "",
      status: "draft",
      sortOrder: nextSortOrder(db, live.sectionId),
      media,
      createdAt: now,
      updatedAt: now,
    };
    db.products.push(copy);
    return { ok: true as const, id: copyId };
  });

  if (!res.ok) {
    await deleteProductUploads(copyId);
    return res;
  }
  refresh();
  return res;
}

export async function updatePrice(id: string, priceRub: number | null): Promise<ActionResult> {
  await requireAdmin();
  if (priceRub != null && (!Number.isFinite(priceRub) || priceRub < 0)) return fail("Некорректная цена");
  return mutateDb((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p) return fail("Товар не найден");
    p.priceRub = priceRub == null ? null : Math.round(priceRub);
    p.updatedAt = new Date().toISOString();
    refresh();
    return { ok: true as const };
  });
}

export async function updateProductStatus(id: string, status: ProductStatus): Promise<ActionResult> {
  await requireAdmin();
  if (!STATUSES.includes(status)) return fail("Неизвестный статус");
  return mutateDb((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p) return fail("Товар не найден");
    p.status = status;
    p.updatedAt = new Date().toISOString();
    refresh();
    return { ok: true as const };
  });
}

/**
 * Persist drag-and-drop results. `layout` maps a section id to its full ordered
 * list of product ids; products listed under a new section are moved there.
 */
export async function saveProductLayout(layout: Record<string, string[]>): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    for (const [sectionId, ids] of Object.entries(layout)) {
      if (!db.sections.some((s) => s.id === sectionId)) return fail("Раздел не найден");
      ids.forEach((id, index) => {
        const p = db.products.find((x) => x.id === id);
        if (p) {
          p.sectionId = sectionId;
          p.sortOrder = index;
        }
      });
    }
    refresh();
    return { ok: true as const };
  });
}

export async function moveProduct(id: string, sectionId: string): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p) return fail("Товар не найден");
    if (!db.sections.some((s) => s.id === sectionId)) return fail("Раздел не найден");
    if (p.sectionId !== sectionId) {
      p.sortOrder = nextSortOrder(db, sectionId);
      p.sectionId = sectionId;
      p.updatedAt = new Date().toISOString();
    }
    refresh();
    return { ok: true as const };
  });
}

// --- Media -----------------------------------------------------------------

export async function updateMedia(
  productId: string,
  mediaId: string,
  patch: { alt?: string; isCover?: boolean; posterUrl?: string | null },
): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    const p = db.products.find((x) => x.id === productId);
    const m = p?.media.find((x) => x.id === mediaId);
    if (!p || !m) return fail("Файл не найден");
    if (patch.alt !== undefined) m.alt = patch.alt.trim().slice(0, 200);
    if (patch.isCover && m.type === "image") p.media.forEach((x) => (x.isCover = x.id === m.id));
    if (patch.posterUrl !== undefined) {
      if (patch.posterUrl && !p.media.some((x) => x.type === "image" && x.url === patch.posterUrl)) return fail("Постер должен быть изображением этого товара");
      m.posterUrl = patch.posterUrl || undefined;
    }
    p.updatedAt = new Date().toISOString();
    refresh();
    return { ok: true as const };
  });
}

export async function reorderMedia(productId: string, ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    const p = db.products.find((x) => x.id === productId);
    if (!p) return fail("Товар не найден");
    ids.forEach((id, i) => {
      const m = p.media.find((x) => x.id === id);
      if (m) m.sortOrder = i;
    });
    refresh();
    return { ok: true as const };
  });
}

export async function deleteMedia(productId: string, mediaId: string): Promise<ActionResult> {
  await requireAdmin();
  const res = await mutateDb((db) => {
    const p = db.products.find((x) => x.id === productId);
    const m = p?.media.find((x) => x.id === mediaId);
    if (!p || !m) return fail("Файл не найден");
    p.media = p.media.filter((x) => x.id !== mediaId);
    p.media.forEach((x) => {
      if (x.posterUrl === m.url) x.posterUrl = undefined;
    });
    if (m.isCover) {
      const next = p.media.filter((x) => x.type === "image").sort((a, b) => a.sortOrder - b.sortOrder)[0];
      if (next) next.isCover = true;
    }
    const stillUsed = db.products.some((x) => x.media.some((y) => y.url === m.url || y.posterUrl === m.url));
    return { ok: true as const, url: stillUsed ? null : m.url };
  });
  if (res.ok) {
    if (res.url) await deleteUpload(res.url);
    refresh();
  }
  return res.ok ? { ok: true } : res;
}

// --- Sections --------------------------------------------------------------

export type SectionInput = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  parentId: string | null;
  status: SectionStatus;
};

function depthOf(db: Database, id: string | null): number {
  let d = 0;
  let cur = id ? db.sections.find((s) => s.id === id) : undefined;
  while (cur) {
    d++;
    cur = cur.parentId ? db.sections.find((s) => s.id === cur!.parentId) : undefined;
  }
  return d;
}

export async function saveSection(input: SectionInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const title = input.title.trim();
  if (!title) return fail("Укажите название раздела");
  const slug = (input.slug.trim() || slugify(title)).toLowerCase();
  if (!isValidSlug(slug)) return fail("Адрес (slug) может содержать только латиницу, цифры и дефисы");

  return mutateDb((db) => {
    const parentId = input.parentId || null;
    if (parentId) {
      if (!db.sections.some((s) => s.id === parentId)) return fail("Родительский раздел не найден");
      if (parentId === input.id) return fail("Раздел не может быть вложен сам в себя");
      if (depthOf(db, parentId) >= 2) return fail("Допустимы два уровня: раздел и подраздел");
      if (input.id && db.sections.some((s) => s.parentId === input.id)) return fail("У раздела есть подразделы — его нельзя сделать подразделом");
    }
    if (db.sections.some((s) => s.parentId === parentId && s.slug === slug && s.id !== input.id)) return fail(`Адрес «${slug}» уже используется на этом уровне`);
    const status: SectionStatus = input.status === "hidden" ? "hidden" : "published";

    if (input.id) {
      const s = db.sections.find((x) => x.id === input.id);
      if (!s) return fail("Раздел не найден");
      if (s.parentId !== parentId) s.sortOrder = db.sections.filter((x) => x.parentId === parentId).length;
      Object.assign(s, { title, slug, description: input.description.trim(), parentId, status });
      refresh();
      return { ok: true as const, id: s.id };
    }
    const section: CatalogSection = {
      id: newId(),
      parentId,
      slug,
      title,
      description: input.description.trim(),
      status,
      sortOrder: db.sections.filter((x) => x.parentId === parentId).length,
    };
    db.sections.push(section);
    refresh();
    return { ok: true as const, id: section.id };
  });
}

export async function setSectionStatus(id: string, status: SectionStatus): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    const s = db.sections.find((x) => x.id === id);
    if (!s) return fail("Раздел не найден");
    s.status = status;
    refresh();
    return { ok: true as const };
  });
}

export async function reorderSections(parentId: string | null, ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    ids.forEach((id, i) => {
      const s = db.sections.find((x) => x.id === id && x.parentId === parentId);
      if (s) s.sortOrder = i;
    });
    refresh();
    return { ok: true as const };
  });
}

export async function deleteSection(id: string): Promise<ActionResult> {
  await requireAdmin();
  return mutateDb((db) => {
    const s = db.sections.find((x) => x.id === id);
    if (!s) return fail("Раздел не найден");
    if (db.sections.some((x) => x.parentId === id)) return fail("Сначала удалите или перенесите подразделы");
    if (db.products.some((p) => p.sectionId === id)) return fail("В разделе есть товары — перенесите их в другой раздел");
    db.sections = db.sections.filter((x) => x.id !== id);
    db.sections
      .filter((x) => x.parentId === s.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((x, i) => (x.sortOrder = i));
    refresh();
    return { ok: true as const };
  });
}
