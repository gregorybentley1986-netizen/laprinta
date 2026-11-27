import Link from "next/link";
import type { VariantAttribute } from "@/lib/catalog";

/**
 * Attribute-based variant selector in the buybox. Specs marked with the
 * «различие в серии» flag become rows of values; the current item's value is
 * highlighted, the others link to the matching product of the same series.
 */
export function ProductVariantOptions({ groups }: { groups: VariantAttribute[] }) {
  if (groups.length === 0) return null;

  return (
    <div className="variant-options">
      {groups.map((group) => (
        <div key={group.label} className="variant-options__group">
          <p className="buybox__label">{group.label}</p>
          <ul className="variant-options__list" role="list">
            {group.options.map((option) => (
              <li key={`${group.label}-${option.value}`}>
                {option.current ? (
                  <span className="variant-chip is-current" aria-current="true">
                    {option.value}
                  </span>
                ) : (
                  <Link href={`/product/${option.slug}`} className="variant-chip" title={`${group.label}: ${option.value} — открыть товар`}>
                    {option.value}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
