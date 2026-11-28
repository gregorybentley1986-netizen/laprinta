import { readSpecRequest } from "@/lib/spec-request";
import { renderSpecPdf, specNumber } from "@/lib/spec-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readSpecRequest(req);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: parsed.status });

  const number = specNumber();
  try {
    const pdf = await renderSpecPdf({ lines: parsed.lines, customer: parsed.customer, number, consentAt: parsed.consentAt });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laprinta-specification-${number}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[spec] PDF generation failed", e);
    return Response.json({ error: "Не удалось сформировать PDF, попробуйте ещё раз" }, { status: 500 });
  }
}
