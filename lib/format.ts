const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

export function formatPrice(price: number | null, from = false) {
  if (price == null) return "Цена по запросу";
  return `${from ? "от " : ""}${rub.format(price)} ₽`;
}

export function plural(n: number, forms: [string, string, string]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

export const modelsCount = (n: number) => `${n} ${plural(n, ["модель", "модели", "моделей"])}`;

export function formatGrams(g: number | null) {
  if (g == null) return "";
  return `${String(g).replace(".", ",")} г`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}
