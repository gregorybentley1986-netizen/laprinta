import "server-only";
import zlib from "node:zlib";

/**
 * Minimal .xlsx writer: an xlsx is a zip of XML parts, and Node already ships
 * deflate + crc32, so this keeps the build free of a spreadsheet dependency
 * (the deploy host cannot reach the npm registry for large payloads).
 *
 * Supported on purpose — nothing more: inline strings, numbers, bold/fill/
 * border/wrap/number-format per cell, column widths, row heights, merges,
 * frozen header rows.
 */

export type CellStyle = {
  bold?: boolean;
  size?: number;
  color?: string; // #rrggbb
  fill?: string; // #rrggbb
  border?: boolean;
  wrap?: boolean;
  align?: "left" | "right" | "center";
  vAlign?: "top" | "middle";
  numFmt?: string;
};

export type Cell = { value: string | number | null; style?: CellStyle };
export type SheetSpec = {
  name: string;
  cols: number[];
  rows: (Cell | null)[][];
  heights?: Record<number, number>; // 1-based row index → points
  merges?: string[];
  freezeRows?: number;
};

/* ------------------------------------------------------------------ zip --- */

let table: Int32Array | null = null;
function crc32(buf: Buffer): number {
  const native = (zlib as unknown as { crc32?: (b: Buffer) => number }).crc32;
  if (typeof native === "function") return native(buf) >>> 0;
  if (!table) {
    table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function zip(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const deflated = zlib.deflateRawSync(file.data, { level: 9 });
    const useDeflate = deflated.length < file.data.length;
    const body = useDeflate ? deflated : file.data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(file.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 file names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, body);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(file.data.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);

    offset += local.length + name.length + body.length;
  }

  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

/* ------------------------------------------------------------------ xml --- */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] as string);

const rgb = (hex: string) => `FF${hex.replace("#", "").toUpperCase().padEnd(6, "0")}`;

export const columnName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

type Font = { bold?: boolean; size?: number; color?: string };
type StyleKey = Required<Pick<CellStyle, "bold" | "size" | "color" | "fill" | "border" | "wrap" | "align" | "vAlign">> & {
  numFmt: string;
};

function keyOf(s: CellStyle): string {
  const k: StyleKey = {
    bold: !!s.bold,
    size: s.size ?? 10,
    color: s.color ?? "#10151b",
    fill: s.fill ?? "",
    border: !!s.border,
    wrap: !!s.wrap,
    align: s.align ?? "left",
    vAlign: s.vAlign ?? "middle",
    numFmt: s.numFmt ?? "",
  };
  return JSON.stringify(k);
}

class Styles {
  fonts: Font[] = [{ size: 10, color: "#10151b" }];
  fills: string[] = []; // custom solid fills, 2-based ids
  numFmts: string[] = [];
  xf: StyleKey[] = [];
  private seen = new Map<string, number>();

  index(style: CellStyle | undefined): number {
    const key = keyOf(style ?? {});
    const hit = this.seen.get(key);
    if (hit != null) return hit;
    const k = JSON.parse(key) as StyleKey;
    this.xf.push(k);
    const id = this.xf.length; // 1-based; 0 is the default style
    this.seen.set(key, id);
    return id;
  }

  private fontId(k: StyleKey) {
    const i = this.fonts.findIndex((f) => !!f.bold === k.bold && (f.size ?? 10) === k.size && (f.color ?? "#10151b") === k.color);
    if (i >= 0) return i;
    this.fonts.push({ bold: k.bold, size: k.size, color: k.color });
    return this.fonts.length - 1;
  }

  private fillId(k: StyleKey) {
    if (!k.fill) return 0;
    const i = this.fills.indexOf(k.fill);
    if (i >= 0) return i + 2;
    this.fills.push(k.fill);
    return this.fills.length + 1;
  }

  private numFmtId(k: StyleKey) {
    if (!k.numFmt) return 0;
    const i = this.numFmts.indexOf(k.numFmt);
    if (i >= 0) return 164 + i;
    this.numFmts.push(k.numFmt);
    return 164 + this.numFmts.length - 1;
  }

  xml() {
    // cellXfs first: mapping it lazily registers the fonts, fills and number
    // formats they reference. Building the lists before that produced
    // count="7" with a single <font>, which Excel flags as unreadable content.
    const cellXfs = this.xf
      .map((k) => {
        const vAlign = k.vAlign === "middle" ? "center" : k.vAlign; // "middle" is not valid ST_VerticalAlignment
        const align = `horizontal="${k.align}" vertical="${vAlign}"${k.wrap ? ' wrapText="1"' : ""}`;
        return `<xf numFmtId="${this.numFmtId(k)}" fontId="${this.fontId(k)}" fillId="${this.fillId(k)}" borderId="${k.border ? 1 : 0}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment ${align}/></xf>`;
      })
      .join("");

    const fonts = this.fonts
      .map(
        (f) =>
          `<font>${f.bold ? "<b/>" : ""}<sz val="${f.size ?? 10}"/><color rgb="${rgb(f.color ?? "#10151b")}"/><name val="Calibri"/></font>`,
      )
      .join("");
    const fills =
      `<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
      this.fills.map((c) => `<fill><patternFill patternType="solid"><fgColor rgb="${rgb(c)}"/><bgColor indexed="64"/></patternFill></fill>`).join("");
    const border = `<border><left style="thin"><color rgb="${rgb("#d5dae0")}"/></left><right style="thin"><color rgb="${rgb("#d5dae0")}"/></right><top style="thin"><color rgb="${rgb("#d5dae0")}"/></top><bottom style="thin"><color rgb="${rgb("#d5dae0")}"/></bottom><diagonal/></border>`;
    const numFmts = this.numFmts.length
      ? `<numFmts count="${this.numFmts.length}">${this.numFmts
          .map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`)
          .join("")}</numFmts>`
      : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts}<fonts count="${this.fonts.length}">${fonts}</fonts><fills count="${this.fills.length + 2}">${fills}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xf.length + 1}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${cellXfs}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
}

function sheetXml(sheet: SheetSpec, styles: Styles) {
  const widths = sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");

  const rows: string[] = [];
  sheet.rows.forEach((cells, r) => {
    const n = r + 1;
    const height = sheet.heights?.[n];
    const body = cells
      .map((cell, c) => {
        if (!cell || cell.value == null || cell.value === "") return "";
        const ref = `${columnName(c)}${n}`;
        const s = styles.index(cell.style);
        if (typeof cell.value === "number") return `<c r="${ref}" s="${s}"><v>${cell.value}</v></c>`;
        return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(cell.value)}</t></is></c>`;
      })
      .join("");
    rows.push(`<row r="${n}"${height ? ` ht="${height}" customHeight="1"` : ""}>${body}</row>`);
  });

  const freeze = sheet.freezeRows
    ? `<pane ySplit="${sheet.freezeRows}" topLeftCell="A${sheet.freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sheet.freezeRows + 1}" sqref="A${sheet.freezeRows + 1}"/>`
    : "";
  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${freeze}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths}</cols><sheetData>${rows.join("")}</sheetData>${merges}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>`;
}

export function buildWorkbook(sheets: SheetSpec[]): Buffer {
  const styles = new Styles();
  const sheetParts = sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(sheetXml(s, styles), "utf8") }));

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
    .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("")}</sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  return zip([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rootRels, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(workbookRels, "utf8") },
    { name: "xl/styles.xml", data: Buffer.from(styles.xml(), "utf8") },
    ...sheetParts,
  ]);
}
