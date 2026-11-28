"use client";

import { useCallback, useSyncExternalStore } from "react";
import { MAX_QTY, clampQty, type CartCustomer, type CartLine } from "./cart-math";

const KEY = "lp:cart";
const CUSTOMER_KEY = "lp:cart-customer";
const CONSENT_KEY = "lp:cart-consent";
const EVENT = "lp:cart-change";
const EMPTY: CartLine[] = [];
const EMPTY_CUSTOMER: CartCustomer = { name: "", phone: "", email: "", company: "", comment: "" };

let snapshot: CartLine[] | null = null;

function read(): CartLine[] {
  if (snapshot) return snapshot;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    snapshot = Array.isArray(parsed)
      ? parsed
          .filter((l) => l && typeof l.id === "string" && Number.isFinite(l.qty))
          .map((l) => ({ id: l.id as string, qty: clampQty(l.qty) }))
      : [];
  } catch {
    snapshot = [];
  }
  return snapshot!;
}

function write(lines: CartLine[]) {
  snapshot = lines;
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);

  const add = useCallback((id: string, qty = 1) => {
    const cur = read();
    const found = cur.find((l) => l.id === id);
    write(found ? cur.map((l) => (l.id === id ? { id, qty: clampQty(l.qty + qty) } : l)) : [...cur, { id, qty: clampQty(qty) }]);
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    write(read().map((l) => (l.id === id ? { id, qty: clampQty(qty) } : l)));
  }, []);
  const remove = useCallback((id: string) => write(read().filter((l) => l.id !== id)), []);
  const clear = useCallback(() => write([]), []);
  /** Drops lines whose products are no longer on the site. */
  const prune = useCallback((validIds: Set<string>) => {
    const cur = read();
    const next = cur.filter((l) => validIds.has(l.id));
    if (next.length !== cur.length) write(next);
  }, []);

  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    qtyOf: (id: string) => lines.find((l) => l.id === id)?.qty ?? 0,
    add,
    setQty,
    remove,
    clear,
    prune,
    maxQty: MAX_QTY,
  };
}

export function loadCustomer(): CartCustomer {
  try {
    return { ...EMPTY_CUSTOMER, ...JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}") };
  } catch {
    return EMPTY_CUSTOMER;
  }
}

export function saveCustomer(c: CartCustomer) {
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(c));
}

/** Отметка о согласии на обработку персональных данных (не является ПД сама по себе). */
export type ConsentRecord = { version: string; acceptedAt: string };

export function loadConsent(): ConsentRecord | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as Partial<ConsentRecord> | null;
    if (!raw || typeof raw.version !== "string" || typeof raw.acceptedAt !== "string") return null;
    return { version: raw.version, acceptedAt: raw.acceptedAt };
  } catch {
    return null;
  }
}

export function saveConsent(version: string): ConsentRecord {
  const record: ConsentRecord = { version, acceptedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
  return record;
}

/** Удаляет из браузера данные формы и отметку о согласии. */
export function clearPersonalData() {
  localStorage.removeItem(CUSTOMER_KEY);
  localStorage.removeItem(CONSENT_KEY);
}

export { EMPTY_CUSTOMER };
