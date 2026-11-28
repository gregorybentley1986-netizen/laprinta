import { listProducts } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { MAX_LINES, clampQty, sanitizeCustomer } from "@/lib/cart-math";
import { readDb } from "@/lib/db";
import { renderSpecPdf, specNumber, type SpecLine } from "@/lib/spec-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;
const json = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json("Слишком большой запрос", 413);
  let body: { items?: unknown; customer?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json("Некорректный запрос");
  }

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
  if (!lines.length) return json("Корзина пуста — добавьте товары из каталога");

  const number = specNumber();
  try {
    const pdf = await renderSpecPdf({ lines, customer: sanitizeCustomer(body.customer), number });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laprinta-specification-${number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[spec] PDF generation failed", e);
    return json("Не удалось сформировать PDF, попробуйте ещё раз", 500);
  }
}
