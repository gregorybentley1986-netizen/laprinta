"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "lp:favorites";
const EVENT = "lp:favorites-change";
const EMPTY: string[] = [];

let snapshot: string[] | null = null;

function read(): string[] {
  if (snapshot) return snapshot;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    snapshot = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    snapshot = [];
  }
  return snapshot!;
}

function write(ids: string[]) {
  snapshot = ids;
  localStorage.setItem(KEY, JSON.stringify(ids));
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

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((slug: string) => {
    const cur = read();
    write(cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]);
  }, []);
  return { ids, toggle, has: (slug: string) => ids.includes(slug) };
}
