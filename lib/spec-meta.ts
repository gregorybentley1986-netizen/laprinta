import "server-only";
import { randomBytes } from "node:crypto";

const MOSCOW = "Europe/Moscow";

/** Human document number: LP-YYMMDD-XXXX. */
export function specNumber(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("ru-RU", { timeZone: MOSCOW, year: "2-digit", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const suffix = randomBytes(3).readUIntBE(0, 3).toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `LP-${parts.year}${parts.month}${parts.day}-${suffix}`;
}

export function specDate(now: Date) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: MOSCOW, day: "numeric", month: "long", year: "numeric" }).format(now);
}

/**
 * Отметка о согласии на обработку персональных данных: печатается в документе,
 * чтобы у оператора осталось доказательство его получения (ч. 3 ст. 9 152-ФЗ).
 */
export function consentLine(acceptedAt: string, version: string) {
  const at = new Date(acceptedAt);
  if (Number.isNaN(at.getTime())) return null;
  const when = new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
  return `Согласие на обработку персональных данных получено ${when} (редакция ${version})`;
}
