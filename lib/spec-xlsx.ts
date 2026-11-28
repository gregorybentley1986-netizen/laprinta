import "server-only";
import { cartTotals, lineSum, totalsNote, type CartCustomer } from "./cart-math";
import { site } from "./site";
import { specDate, consentLine } from "./spec-meta";
import { legal } from "./legal";
import type { SpecLine } from "./spec-types";
import { buildWorkbook, columnName, type Cell, type CellStyle } from "./xlsx";

const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const money = (n: number) => `${rub.format(n)} ₽`;
const MONEY_FMT = '#,##0" ₽"';

const S: Record<string, CellStyle> = {
  title: { bold: true, size: 15 },
  sub: { size: 9, color: "#5b6773" },
  label: { bold: true, size: 9, color: "#067a80" },
  head: { bold: true, size: 9, fill: "#eef1f4", border: true, wrap: true, align: "center", vAlign: "middle" },
  cell: { size: 9, border: true, wrap: true, vAlign: "top" },
  center: { size: 9, border: true, align: "center", vAlign: "top" },
  num: { size: 9, border: true, align: "right", vAlign: "top", numFmt: MONEY_FMT },
  muted: { size: 9, border: true, align: "right", vAlign: "top", color: "#5b6773" },
  totalLabel: { bold: true, size: 10, align: "right" },
  totalNum: { bold: true, size: 10, align: "right", numFmt: MONEY_FMT },
  totalText: { bold: true, size: 10, align: "right" },
  note: { size: 8, color: "#5b6773", wrap: true },
};

/** Plain list-style sheet: header, one row per position, totals. No images, no branding tricks. */
export function renderSpecXlsx({
  lines,
  customer,
  number,
  consentAt,
  now = new Date(),
}: {
  lines: SpecLine[];
  customer: CartCustomer;
  number: string;
  consentAt?: string | null;
  now?: Date;
}): Buffer {
  const variantLabels: string[] = [];
  for (const l of lines) for (const v of l.product.variants) if (!variantLabels.includes(v.label)) variantLabels.push(v.label);

  const cols = [5, 42, 14, 24, ...variantLabels.map(() => 16), 9, 13, 14];
  const last = cols.length - 1;
  const cQty = 4 + variantLabels.length;
  const cPrice = cQty + 1;
  const cSum = cQty + 2;

  const rows: (Cell | null)[][] = [];
  const merges: string[] = [];
  const heights: Record<number, number> = {};
  const push = (cells: (Cell | null)[], height?: number) => {
    rows.push(cells);
    if (height) heights[rows.length] = height;
    return rows.length;
  };
  const wide = (text: string, style: CellStyle, height?: number) => {
    const row = push([{ value: text, style }, ...Array.from({ length: last }, () => null)], height);
    merges.push(`A${row}:${columnName(last)}${row}`);
    return row;
  };

  wide(`Спецификация № ${number} от ${specDate(now)}`, S.title, 22);
  wide(`${site.domain} · ${site.email}`, S.sub);

  const who = [customer.name, customer.company, customer.phone, customer.email].filter(Boolean).join(" · ");
  if (who) wide(`Заказчик: ${who}`, S.cell, 16);
  if (customer.comment) wide(`Комментарий: ${customer.comment}`, S.cell, 16);

  const consent = consentAt ? consentLine(consentAt, legal.consentVersion) : null;
  if (consent) wide(consent, S.sub, 14);

  push([]); // spacer

  push(
    [
      { value: "№", style: S.head },
      { value: "Наименование", style: S.head },
      { value: "Артикул", style: S.head },
      { value: "Цвет", style: S.head },
      ...variantLabels.map((label) => ({ value: label, style: S.head })),
      { value: "Кол-во", style: S.head },
      { value: "Цена", style: S.head },
      { value: "Сумма", style: S.head },
    ],
    26,
  );
  const freezeRows = rows.length;

  lines.forEach((line, i) => {
    const p = line.product;
    const sum = lineSum({ qty: line.qty, priceRub: p.priceRub, priceFrom: p.priceFrom });
    const price: Cell = p.priceRub == null
      ? { value: "по запросу", style: S.muted }
      : p.priceFrom
        ? { value: `от ${money(p.priceRub)}`, style: S.muted }
        : { value: p.priceRub, style: S.num };
    const sumCell: Cell = sum == null
      ? { value: "—", style: S.muted }
      : p.priceFrom
        ? { value: `от ${money(sum)}`, style: S.muted }
        : { value: sum, style: S.num };

    const name = p.meta ? `${p.name}\n${p.meta}` : p.name;
    const linesEstimate = Math.max(
      Math.ceil(name.length / 46),
      Math.ceil((p.colors.map((c) => c.name).join(", ") || "не указан").length / 26),
      ...p.variants.map((v) => Math.ceil(v.value.length / 17)),
    );

    push(
      [
        { value: i + 1, style: S.center },
        { value: name, style: S.cell },
        { value: p.sku || p.slug, style: S.cell },
        { value: p.colors.length ? p.colors.map((c) => c.name).join(", ") : "не указан", style: S.cell },
        ...variantLabels.map((label) => ({
          value: p.variants.find((v) => v.label === label)?.value ?? "—",
          style: S.cell,
        })),
        { value: line.qty, style: S.center },
        price,
        sumCell,
      ],
      15 + 13 * Math.max(0, linesEstimate - 1),
    );
  });

  const totals = cartTotals(lines.map((l) => ({ qty: l.qty, priceRub: l.product.priceRub, priceFrom: l.product.priceFrom })));
  const totalRow = push(
    [
      { value: totals.approximate ? "Итого (предварительно)" : "Итого", style: S.totalLabel },
      ...Array.from({ length: cQty - 1 }, () => null),
      { value: totals.units, style: { ...S.totalText, align: "center" } },
      null,
      totals.hasFrom
        ? { value: `от ${money(totals.total)}`, style: S.totalText }
        : { value: totals.total, style: S.totalNum },
    ],
    20,
  );
  merges.push(`A${totalRow}:${columnName(cQty - 1)}${totalRow}`);

  const note = totalsNote(totals);
  if (note) wide(note, S.note, 14);
  wide("Цены носят информационный характер и не являются публичной офертой.", S.note, 14);

  return buildWorkbook([
    { name: "Спецификация", cols, rows, heights, merges, freezeRows },
  ]);
}
