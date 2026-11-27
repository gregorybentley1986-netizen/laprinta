import Link from "next/link";
import { ColorPie } from "@/components/ui/ColorPie";
import type { ProductColor } from "@/lib/types";

export type ColorVariant = { slug: string; name: string; colors: ProductColor[]; current: boolean };

/**
 * Colour row in the buybox: one pie per variant — the current item (marked) and
 * every other product of the same series, each linking to its own page.
 * Products outside a series simply show their own colour pies, not clickable.
 */
export function ProductColorLinks({ items }: { items: ColorVariant[] }) {
  const shown = items.filter((v) => v.colors.length > 0);
  if (shown.length === 0) return null;

  return (
    <div className="color-variants">
      <p className="buybox__label">Цвет</p>
      <ul className="color-variants__list" role="list">
        {shown.map((v) => {
          const names = v.colors.map((c) => c.name).join(", ");
          const hex = v.colors.map((c) => c.hex).join(",");
          const title = `${v.name} — ${names}`;
          return (
            <li key={v.slug}>
              {v.current ? (
                <span className="color-variant is-current" title={`${title} (этот товар)`}>
                  <ColorPie hex={hex} size={30} title={names} />
                </span>
              ) : (
                <Link
                  href={`/product/${v.slug}`}
                  className="color-variant"
                  title={title}
                  aria-label={`Перейти к «${v.name}», цвет: ${names}`}
                >
                  <ColorPie hex={hex} size={30} title={names} />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
