import "server-only";
import { toCard } from "./cards";
import { MAX_LINES, clampQty, sanitizeCustomer } from "./cart-math";
import { listProducts } from "./catalog";
import { readDb } from "./db";
import type { SpecLine } from "./spec-types";

const MAX_BODY = 64 * 1024;

export type SpecRequest = { lines: SpecLine[]; customer: ReturnType<typeof sanitizeCustomer>; consentAt: string };

/**
 * Shared by /api/spec (PDF) and /api/spec/xlsx: the browser sends ids + qty,
 * everything else is read from the database so old carts stay valid.
 * Consent is required: without it personal data must not be processed at all.
 */
export async function readSpecRequest(req: Request): Promise<SpecRequest | { error: string; status: number }> {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return { error: "Слишком большой запрос", status: 413 };

  let body: { items?: unknown; customer?: unknown; consent?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return { error: "Некорректный запрос", status: 400 };
  }

  const consent = (body.consent && typeof body.consent === "object" ? body.consent : {}) as { acceptedAt?: unknown };
  const acceptedAt = typeof consent.acceptedAt === "string" ? new Date(consent.acceptedAt) : null;
  if (!acceptedAt || Number.isNaN(acceptedAt.getTime())) {
    return { error: "Отметьте согласие на обработку персональных данных", status: 400 };
  }
  // Future timestamps would be a forged acceptance — clamp to now.
  const consentAt = (acceptedAt.getTime() > Date.now() + 60_000 ? new Date() : acceptedAt).toISOString();

  const qtyById = new Map<string, number>();
  for (const item of Array.isArray(body.items) ? body.items.slice(0, MAX_LINES) : []) {
    const { id, qty } = (item ?? {}) as { id?: unknown; qty?: unknown };
    if (typeof id !== "string" || !id) continue;
    qtyById.set(id, clampQty((qtyById.get(id) ?? 0) + Number(qty)));
  }

  const db = await readDb();
  const products = new Map(listProducts(db, null).map((p) => [p.id, p]));
  const lines: SpecLine[] = [];
  for (const [id, qty] of qtyById) {
    const p = products.get(id);
    if (p) lines.push({ qty, product: toCard(db, p) });
  }
  if (!lines.length) return { error: "Корзина пуста — добавьте товары из каталога", status: 400 };

  return { lines, customer: sanitizeCustomer(body.customer), consentAt };
}
