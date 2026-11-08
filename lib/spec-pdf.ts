import "server-only";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import type { CardProduct } from "./cards";
import { cartTotals, lineSum, totalsNote, type CartCustomer } from "./cart-math";
import { MEDIA_PREFIX, UPLOAD_DIR } from "./paths";
import { site } from "./site";

export type SpecLine = { qty: number; product: CardProduct };

const C = {
  bg: "#07090c",
  accent: "#00e8ef",
  inkAccent: "#067a80",
  ink: "#10151b",
  muted: "#5b6773",
  line: "#dfe3e8",
  head: "#eef1f4",
  white: "#ffffff",
  dim: "#9aa6b2",
};

const PAGE = { w: 595.28, h: 841.89 };
const M = 42;
const W = PAGE.w - M * 2;
const FOOTER_Y = PAGE.h - 54;
const BODY_BOTTOM = FOOTER_Y - 14;
const NUM: PDFKit.Mixins.TextOptions = { features: ["lnum", "tnum"] };

const COLS = [
  { key: "n", label: "№", w: 22, align: "left" },
  { key: "photo", label: "Фото", w: 46, align: "left" },
  { key: "name", label: "Наименование", w: 179, align: "left" },
  { key: "sku", label: "Артикул", w: 74, align: "left" },
  { key: "qty", label: "Кол-во", w: 46, align: "right" },
  { key: "price", label: "Цена", w: 70, align: "right" },
  { key: "sum", label: "Сумма", w: 74, align: "right" },
] as const;

const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const money = (n: number) => `${rub.format(n)} ₽`;

let fontCache: Record<string, Buffer> | null = null;
async function fonts() {
  if (fontCache) return fontCache;
  const root = process.cwd();
  const [regular, semibold, bold, arista] = await Promise.all([
    fs.readFile(path.join(root, "assets/fonts/Raleway-Regular.ttf")),
    fs.readFile(path.join(root, "assets/fonts/Raleway-SemiBold.ttf")),
    fs.readFile(path.join(root, "assets/fonts/Raleway-Bold.ttf")),
    fs.readFile(path.join(root, "app/fonts/AristaPro-SemiBold.ttf")),
  ]);
  fontCache = { regular, semibold, bold, arista };
  return fontCache;
}

async function thumbnail(url: string | undefined): Promise<Buffer | null> {
  if (!url?.startsWith(MEDIA_PREFIX)) return null;
  const file = path.resolve(UPLOAD_DIR, url.slice(MEDIA_PREFIX.length));
  if (!file.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return null;
  try {
    return await sharp(file).resize(144, 144, { fit: "cover" }).flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return null;
  }
}

export function specNumber(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", year: "2-digit", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const suffix = randomBytes(3).readUIntBE(0, 3).toString(36).toUpperCase().padStart(4, "0").slice(-4);
  return `LP-${parts.year}${parts.month}${parts.day}-${suffix}`;
}

function specDate(now: Date) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long", year: "numeric" }).format(now);
}

export async function renderSpecPdf({ lines, customer, number, now = new Date() }: { lines: SpecLine[]; customer: CartCustomer; number: string; now?: Date }) {
  const f = await fonts();
  const thumbs = await Promise.all(lines.map((l) => thumbnail(l.product.cover?.url)));

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    bufferPages: true,
    lang: "ru-RU",
    info: { Title: `Спецификация ${number}`, Author: site.name, Subject: "Спецификация к заказу", Creator: site.domain },
  });
  doc.registerFont("R", f.regular);
  doc.registerFont("S", f.semibold);
  doc.registerFont("B", f.bold);
  doc.registerFont("A", f.arista);

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Header band
  doc.rect(0, 0, PAGE.w, 96).fill(C.bg);
  doc.rect(0, 96, PAGE.w, 2).fill(C.accent);
  doc.font("A").fontSize(32).fillColor(C.white).text("la", M, 26, { continued: true, lineBreak: false }).fillColor(C.accent).text("printa");
  doc.font("R").fontSize(7.5).fillColor(C.dim).text("Изделия из пластика и термополиуретана · аддитивное производство", M, 68, { width: 260 });

  const rightX = M + W - 240;
  doc.font("S").fontSize(7.5).fillColor(C.accent).text("СПЕЦИФИКАЦИЯ К ЗАКАЗУ", rightX, 28, { width: 240, align: "right", characterSpacing: 1.2 });
  doc.font("B").fontSize(15).fillColor(C.white).text(`№ ${number}`, rightX, 42, { width: 240, align: "right", ...NUM });
  doc.font("R").fontSize(9).fillColor(C.dim).text(`от ${specDate(now)}`, rightX, 64, { width: 240, align: "right", ...NUM });

  let y = 122;

  // Customer
  const overline = (label: string, at: number) => {
    doc.font("S").fontSize(7.5).fillColor(C.inkAccent).text(label.toUpperCase(), M, at, { characterSpacing: 1.2 });
    return at + 14;
  };
  y = overline("Заказчик", y);
  const fields = (
    [
      ["Имя", customer.name],
      ["Компания", customer.company],
      ["Телефон", customer.phone],
      ["E-mail", customer.email],
    ] as const
  ).filter(([, v]) => v);
  if (!fields.length && !customer.comment) {
    doc.font("R").fontSize(9).fillColor(C.muted).text("Контактные данные не указаны.", M, y, { width: W });
    y += 16;
  } else {
    const colW = (W - 24) / 2;
    for (let i = 0; i < fields.length; i += 2) {
      let rowH = 0;
      fields.slice(i, i + 2).forEach(([label, value], j) => {
        const x = M + j * (colW + 24);
        doc.font("R").fontSize(7.5).fillColor(C.muted).text(label, x, y, { width: colW });
        doc.font("S").fontSize(10).fillColor(C.ink);
        const h = doc.heightOfString(value, { width: colW });
        doc.text(value, x, y + 11, { width: colW, ...NUM });
        rowH = Math.max(rowH, 11 + h);
      });
      y += rowH + 8;
    }
    if (customer.comment) {
      doc.font("R").fontSize(7.5).fillColor(C.muted).text("Комментарий", M, y, { width: W });
      doc.font("R").fontSize(9.5).fillColor(C.ink);
      const h = doc.heightOfString(customer.comment, { width: W });
      doc.text(customer.comment, M, y + 11, { width: W, ...NUM });
      y += 11 + h + 8;
    }
  }
  y += 10;

  // Table
  const colX: number[] = [];
  COLS.reduce((x, c) => (colX.push(x), x + c.w), M);
  const PAD = 6;

  const tableHead = (at: number) => {
    doc.rect(M, at, W, 22).fill(C.head);
    COLS.forEach((c, i) => {
      doc.font("S").fontSize(7.5).fillColor(C.muted).text(c.label, colX[i] + PAD, at + 7.5, { width: c.w - PAD * 2, align: c.align, lineBreak: false });
    });
    return at + 22;
  };

  const newPage = () => {
    doc.addPage({ size: "A4", margin: 0 });
    return M;
  };

  y = overline("Позиции", y);
  y = tableHead(y);

  lines.forEach((line, idx) => {
    const p = line.product;
    const nameW = COLS[2].w - PAD * 2;
    doc.font("S").fontSize(9.5);
    const nameH = doc.heightOfString(p.name, { width: nameW });
    doc.font("R").fontSize(7.5);
    const metaH = p.meta ? doc.heightOfString(p.meta, { width: nameW }) : 0;
    const textH = nameH + (metaH ? metaH + 3 : 0);
    const rowH = Math.max(48, textH + PAD * 2 + 4);

    if (y + rowH > BODY_BOTTOM) y = tableHead(newPage());

    const mid = (h: number) => y + (rowH - h) / 2;
    const sum = lineSum({ qty: line.qty, priceRub: p.priceRub, priceFrom: p.priceFrom });

    doc.font("R").fontSize(9).fillColor(C.muted).text(String(idx + 1), colX[0] + PAD, mid(11), { width: COLS[0].w - PAD, ...NUM });

    const thumb = thumbs[idx];
    const tx = colX[1] + 4;
    const ty = mid(36);
    if (thumb) {
      doc.save();
      doc.roundedRect(tx, ty, 36, 36, 3).clip();
      doc.image(thumb, tx, ty, { width: 36, height: 36 });
      doc.restore();
    } else {
      doc.roundedRect(tx, ty, 36, 36, 3).fill(C.head);
    }

    let ny = mid(textH);
    doc.font("S").fontSize(9.5).fillColor(C.ink).text(p.name, colX[2] + PAD, ny, { width: nameW, ...NUM });
    ny += nameH + 3;
    if (p.meta) doc.font("R").fontSize(7.5).fillColor(C.muted).text(p.meta, colX[2] + PAD, ny, { width: nameW, ...NUM });

    const cell = (i: number, text: string, font = "R", color = C.ink, size = 9) => {
      doc.font(font).fontSize(size).fillColor(color).text(text, colX[i] + PAD, mid(size + 2), { width: COLS[i].w - PAD * 2, align: COLS[i].align, lineBreak: false, ...NUM });
    };
    cell(3, p.sku || p.slug, "R", C.ink, 8.5);
    cell(4, `${line.qty} шт.`);
    cell(5, p.priceRub == null ? "по запросу" : `${p.priceFrom ? "от " : ""}${money(p.priceRub)}`, "R", p.priceRub == null ? C.muted : C.ink);
    cell(6, sum == null ? "—" : `${p.priceFrom ? "от " : ""}${money(sum)}`, "S", sum == null ? C.muted : C.ink);

    y += rowH;
    doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor(C.line).stroke();
  });

  // Totals
  const totals = cartTotals(lines.map((l) => ({ qty: l.qty, priceRub: l.product.priceRub, priceFrom: l.product.priceFrom })));
  const note = totalsNote(totals);
  doc.font("R").fontSize(8);
  const noteH = note ? doc.heightOfString(note, { width: W }) + 10 : 0;
  const contact = `Для оформления заказа отправьте спецификацию на ${site.email} — мы подтвердим цены, наличие и сроки изготовления.`;
  const blockH = 86 + noteH + 40;
  if (y + 16 + blockH > BODY_BOTTOM) y = newPage();
  y += 16;

  const boxW = 250;
  const boxX = M + W - boxW;
  const totalRow = (label: string, value: string, at: number) => {
    doc.font("R").fontSize(9).fillColor(C.muted).text(label, boxX, at, { width: boxW / 2 });
    doc.font("S").fontSize(9).fillColor(C.ink).text(value, boxX + boxW / 2, at, { width: boxW / 2, align: "right", ...NUM });
  };
  totalRow("Позиций", String(lines.length), y);
  totalRow("Количество", `${totals.units} шт.`, y + 16);
  y += 36;
  doc.rect(boxX, y, boxW, 34).fill(C.bg);
  doc.font("S").fontSize(9).fillColor(C.dim).text(totals.approximate ? "Итого (предварительно)" : "Итого", boxX + 12, y + 12.5, { width: boxW / 2 });
  doc.font("B").fontSize(15).fillColor(C.accent).text(`${totals.hasFrom ? "от " : ""}${money(totals.total)}`, boxX + boxW / 2 - 12, y + 9, { width: boxW / 2, align: "right", ...NUM });
  y += 34 + 12;

  if (note) {
    doc.font("R").fontSize(8).fillColor(C.muted).text(note, M, y, { width: W, align: "right" });
    y += noteH;
  }
  y += 8;
  doc.font("R").fontSize(9).fillColor(C.ink).text(contact, M, y, { width: W });

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.moveTo(M, FOOTER_Y).lineTo(M + W, FOOTER_Y).lineWidth(0.5).strokeColor(C.line).stroke();
    doc.font("S").fontSize(8).fillColor(C.ink).text(`${site.domain}  ·  ${site.email}`, M, FOOTER_Y + 9, { width: W / 2, lineBreak: false });
    doc
      .font("R")
      .fontSize(8)
      .fillColor(C.muted)
      .text(`Спецификация № ${number}  ·  стр. ${i - range.start + 1} из ${range.count}`, M + W / 2, FOOTER_Y + 9, { width: W / 2, align: "right", lineBreak: false, ...NUM });
    doc.font("R").fontSize(7).fillColor(C.dim).text("Цены носят информационный характер и не являются публичной офертой.", M, FOOTER_Y + 23, { width: W, lineBreak: false });
  }

  doc.end();
  return done;
}
