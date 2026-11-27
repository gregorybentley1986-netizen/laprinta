import Link from "next/link";
import { ColorPie } from "@/components/ui/ColorPie";
import type { VariantRow } from "@/lib/catalog";

/**
 * Variant picker in the buybox: rows of colours (one pie per distinct colour set)
 * and of specs flagged «различие в серии». Combinations that do not exist in the
 * series are dimmed and cannot be clicked — e.g. a blue float is only made in
 * 1 g, so on the 0.5 g page «синий» is washed out, and vice versa.
 */
export function ProductVariantPicker({ rows }: { rows: VariantRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="variant-options">
      {rows.map((row) => (
        <div key={row.id} className="variant-options__group">
          <p className="buybox__label">{row.label}</p>
          <ul className={`variant-options__list variant-options__list--${row.kind}`} role="list">
            {row.choices.map((choice) => {
              const label = choice.text ?? choice.colors?.map((c) => c.name).join(", ") ?? "";
              const unavailable = !choice.current && !choice.slug;
              const inner =
                row.kind === "color" ? (
                  <ColorPie hex={(choice.colors ?? []).map((c) => c.hex).join(",")} size={30} title={label} />
                ) : (
                  choice.text
                );
              const base = row.kind === "color" ? "color-variant" : "variant-chip";

              if (choice.current) {
                return (
                  <li key={choice.key}>
                    <span className={`${base} is-current`} aria-current="true" title={`${label} — этот товар`}>
                      {inner}
                    </span>
                  </li>
                );
              }
              if (unavailable) {
                return (
                  <li key={choice.key}>
                    <span className={`${base} is-unavailable`} aria-disabled="true" title={`${label} — нет в этой комбинации`}>
                      {inner}
                      <span className="sr-only"> — нет в этой комбинации</span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={choice.key}>
                  <Link
                    href={`/product/${choice.slug}`}
                    className={base}
                    title={`${label} — открыть товар`}
                    aria-label={`${row.label}: ${label} — открыть товар`}
                  >
                    {inner}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
