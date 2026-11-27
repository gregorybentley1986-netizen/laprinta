"use client";

import { useState } from "react";
import { isLight, parseHexList, swatchBackground } from "@/lib/colors";
import type { ProductColor } from "@/lib/types";

/**
 * Colour picker for the product card: RGB swatches with the selected name.
 * Purely presentational — a colour choice does not change the cart line
 * (the catalog sells one SKU per product, colours are a description).
 */
export function ProductColors({ colors }: { colors: ProductColor[] }) {
  const [active, setActive] = useState(0);
  if (colors.length === 0) return null;
  const current = colors[Math.min(active, colors.length - 1)];

  return (
    <div className="colors-pick">
      <p className="buybox__label">
        Цвет: <span className="colors-pick__current">{current.name}</span>
      </p>
      <ul className="colors-pick__list" role="list">
        {colors.map((c, i) => {
          const primary = parseHexList(c.hex)[0] ?? c.hex;
          return (
            <li key={`${c.name}-${c.hex}-${i}`}>
              <button
                type="button"
                className={`swatch-btn${i === active ? " is-active" : ""}`}
                aria-pressed={i === active}
                aria-label={`Цвет «${c.name}»`}
                title={c.name}
                onClick={() => setActive(i)}
              >
                <span
                  className="swatch-btn__dot"
                  style={{ background: swatchBackground(c.hex) }}
                  data-light={isLight(primary) ? "1" : "0"}
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
