import { readSpecRequest } from "@/lib/spec-request";
import { specNumber } from "@/lib/spec-meta";
import { renderSpecXlsx } from "@/lib/spec-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readSpecRequest(req);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: parsed.status });

  const number = specNumber();
  try {
    const book = renderSpecXlsx({ lines: parsed.lines, customer: parsed.customer, number });
    return new Response(new Uint8Array(book), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="laprinta-specification-${number}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[spec] XLSX generation failed", e);
    return Response.json({ error: "Не удалось сформировать Excel, попробуйте ещё раз" }, { status: 500 });
  }
}
