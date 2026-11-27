/**
 * Product colour helpers shared by the site, the admin and the JSON store.
 *
 * A colour is `{ name, hex }` where `hex` is `#rrggbb` or two hex values
 * separated by a comma (`#d42b2b,#ffffff`) for two-tone products such as
 * «красно-белый». Everything here is pure, so client components can use it.
 */

export type HexPair = string;

const HEX_RE = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

/** Accepts `#abc`, `abc`, `#AABBCC`; returns lowercase `#rrggbb` or null. */
export function toHex(value: string): string | null {
  const m = HEX_RE.exec((value ?? "").trim());
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  return `#${full}`;
}

/** Splits `"#aabbcc,#ffffff"` into at most two validated hex values. */
export function parseHexList(value: string): string[] {
  if (!value) return [];
  return (value.split(",").map(toHex).filter(Boolean) as string[]).slice(0, 2);
}

/** Canonical storage form: `#rrggbb` or `#rrggbb,#rrggbb`; falls back when unparsable. */
export function normalizeHex(value: string, fallback = "#8b959f"): string {
  const list = parseHexList(value);
  return list.length ? list.join(",") : fallback;
}

export function swatchBackground(hex: string): string {
  const list = parseHexList(hex);
  if (!list.length) return "var(--c-ink-line)";
  if (list.length === 1) return list[0];
  return `linear-gradient(135deg, ${list[0]} 0 50%, ${list[1]} 50% 100%)`;
}

export function rgbOf(hex: string): [number, number, number] | null {
  const one = parseHexList(hex)[0];
  if (!one) return null;
  return [parseInt(one.slice(1, 3), 16), parseInt(one.slice(3, 5), 16), parseInt(one.slice(5, 7), 16)];
}

export function rgbLabel(hex: string): string {
  const rgb = rgbOf(hex);
  return rgb ? `RGB ${rgb.join(" · ")}` : "";
}

/** Perceived lightness 0..1 — used to pick the contrast ring/check colour. */
export function luminance(hex: string): number {
  const rgb = rgbOf(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const isLight = (hex: string) => luminance(hex) > 0.55;

/** Frequent colour names in Russian → hex. Keys are lowercased with «ё» → «е». */
const NAMED: Record<string, string> = {
  белый: "#ffffff",
  белая: "#ffffff",
  белое: "#ffffff",
  черный: "#14181c",
  черная: "#14181c",
  красный: "#d42b2b",
  красная: "#d42b2b",
  красно: "#d42b2b",
  оранжевый: "#ff7a18",
  оранжевая: "#ff7a18",
  оранж: "#ff7a18",
  желтый: "#f2c11c",
  желтая: "#f2c11c",
  зеленый: "#2f9e44",
  зеленая: "#2f9e44",
  салатовый: "#9ede4a",
  салатово: "#9ede4a",
  бирюзовый: "#12b1b8",
  бирюзовая: "#12b1b8",
  бирюза: "#12b1b8",
  голубой: "#38bdf8",
  синий: "#2b59d4",
  синяя: "#2b59d4",
  фиолетовый: "#7c3aed",
  сиреневый: "#a78bfa",
  розовый: "#f472b6",
  коричневый: "#7a4a25",
  бежевый: "#e8d5b7",
  серый: "#8b959f",
  серая: "#8b959f",
  графит: "#3b4450",
  графитовый: "#3b4450",
  серебристый: "#c9d1d9",
  серебро: "#c9d1d9",
  золотой: "#d4af37",
  золото: "#d4af37",
  прозрачный: "#e9eef2",
  хаки: "#7a7a4a",
  мятный: "#7ee0c0",
  бордовый: "#7b1e2b",
  "темно-серый": "#4a5560",
  "светло-серый": "#c3cad2",
  "темно-синий": "#1e3a8a",
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");

/** Best-effort hex for a free-form Russian colour name («Зелёный / салатовый» → gradient). */
export function nameToHex(name: string, fallback = "#8b959f"): string {
  const n = norm(name);
  if (!n) return fallback;
  if (NAMED[n]) return NAMED[n];
  const parts = n
    .split(/[\/,+]|[-–—]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const found = parts.map((p) => NAMED[p]).filter(Boolean) as string[];
  if (found.length) return found.slice(0, 2).join(",");
  const words = n.match(/[a-zа-я]+/g) ?? [];
  const byWord = words.map((w) => NAMED[w]).filter(Boolean) as string[];
  return byWord.length ? byWord.slice(0, 2).join(",") : fallback;
}

/** Palette offered in the admin — a quick way to pick a typical filament colour. */
export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Белый", hex: "#ffffff" },
  { name: "Чёрный", hex: "#14181c" },
  { name: "Графит", hex: "#3b4450" },
  { name: "Серый", hex: "#8b959f" },
  { name: "Серебристый", hex: "#c9d1d9" },
  { name: "Красный", hex: "#d42b2b" },
  { name: "Бордовый", hex: "#7b1e2b" },
  { name: "Оранжевый", hex: "#ff7a18" },
  { name: "Жёлтый", hex: "#f2c11c" },
  { name: "Салатовый", hex: "#9ede4a" },
  { name: "Зелёный", hex: "#2f9e44" },
  { name: "Бирюзовый", hex: "#12b1b8" },
  { name: "Голубой", hex: "#38bdf8" },
  { name: "Синий", hex: "#2b59d4" },
  { name: "Фиолетовый", hex: "#7c3aed" },
  { name: "Розовый", hex: "#f472b6" },
  { name: "Бежевый", hex: "#e8d5b7" },
  { name: "Коричневый", hex: "#7a4a25" },
];
