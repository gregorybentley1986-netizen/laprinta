import { MAX_COLORS, parseHexList, sectorPath } from "@/lib/colors";

type Props = {
  /** Comma-separated hex values, one per sector: `#d42b2b` or `#d42b2b,#ffffff`. */
  hex: string;
  size?: number;
  /** Accessible name, e.g. «Красный, белый». Decorative when omitted. */
  title?: string;
  className?: string;
};

const R = 15.5;

/**
 * Colour icon: a circle split into equal sectors (2 colours = halves,
 * 3 = 120° each). Drawn as SVG with the ring inside the radius — CSS gradients
 * plus a border left a jagged seam and a light fringe at the edge.
 */
export function ColorPie({ hex, size = 28, title, className }: Props) {
  const colors = parseHexList(hex).slice(0, MAX_COLORS);
  if (!colors.length) return null;

  const step = 360 / colors.length;
  const label = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };

  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} focusable="false" {...label}>
      <circle cx="16" cy="16" r={R} fill={colors[0]} />
      {colors.length > 1 &&
        colors.slice(1).map((fill, i) => (
          <path
            key={`${fill}-${i}`}
            d={sectorPath(R, i * step + step, (i + 1) * step + step + 0.4)}
            fill={fill}
            stroke={fill}
            strokeWidth={0.5}
            strokeLinejoin="round"
          />
        ))}
      <circle cx="16" cy="16" r={R - 0.5} fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1" />
    </svg>
  );
}
