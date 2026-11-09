// Shared by the cart page (client) and the PDF route (server).

export const MAX_QTY = 999;
export const MAX_LINES = 100;

export type CartLine = { id: string; qty: number };

export type CartCustomer = {
  name: string;
  phone: string;
  email: string;
  company: string;
  comment: string;
};

export const CUSTOMER_LIMITS: Record<keyof CartCustomer, number> = {
  name: 120,
  phone: 40,
  email: 120,
  company: 160,
  comment: 1000,
};

export type PricedLine = { qty: number; priceRub: number | null; priceFrom: boolean };

export function clampQty(n: number) {
  return Math.min(MAX_QTY, Math.max(1, Math.round(Number(n)) || 1));
}

/** Line sum is only exact for fixed prices; «от» lines contribute their minimum. */
export function lineSum(l: PricedLine): number | null {
  return l.priceRub == null ? null : l.priceRub * l.qty;
}

export function cartTotals(lines: PricedLine[]) {
  let total = 0;
  let hasFrom = false;
  let hasOnRequest = false;
  for (const l of lines) {
    if (l.priceRub == null) hasOnRequest = true;
    else {
      total += l.priceRub * l.qty;
      if (l.priceFrom) hasFrom = true;
    }
  }
  return { total, hasFrom, hasOnRequest, approximate: hasFrom || hasOnRequest, units: lines.reduce((n, l) => n + l.qty, 0) };
}

export function totalsNote({ hasFrom, hasOnRequest }: { hasFrom: boolean; hasOnRequest: boolean }) {
  if (hasFrom && hasOnRequest) return "Сумма предварительная: для позиций «от …» учтена минимальная цена, позиции «по запросу» не учтены.";
  if (hasFrom) return "Сумма предварительная: для позиций «от …» учтена минимальная цена.";
  if (hasOnRequest) return "Сумма неполная: позиции «по запросу» не учтены — стоимость уточнит менеджер.";
  return null;
}

export function sanitizeCustomer(input: unknown): CartCustomer {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = {} as CartCustomer;
  for (const key of Object.keys(CUSTOMER_LIMITS) as (keyof CartCustomer)[]) {
    const v = typeof src[key] === "string" ? (src[key] as string) : "";
    out[key] = v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, CUSTOMER_LIMITS[key]);
  }
  return out;
}
