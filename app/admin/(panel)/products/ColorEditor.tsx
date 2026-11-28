"use client";

import { ColorPie } from "@/components/ui/ColorPie";
import { Icon } from "@/components/ui/Icon";
import { COLOR_PRESETS, MAX_COLORS, nameToHex, normalizeHex, parseHexList, rgbLabel } from "@/lib/colors";
import type { ProductColor } from "@/lib/types";

type Props = { value: ProductColor[]; onChange: (next: ProductColor[]) => void };

const FALLBACK = "#8b959f";

/**
 * Colours of one item: up to three entries, each a name plus one colour.
 * The icon on the site is a pie of those colours (2 → halves, 3 → 120° each),
 * previewed above the rows. Pickers are native `<input type="color">`, i.e. the
 * OS RGB palette; the HEX field stays editable for exact values.
 */
export function ColorEditor({ value, onChange }: Props) {
  const full = value.length >= MAX_COLORS;
  const patch = (i: number, next: Partial<ProductColor>) => onChange(value.map((c, j) => (j === i ? { ...c, ...next } : c)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  const pieHex = value
    .map((c) => parseHexList(c.hex)[0] ?? nameToHex(c.name))
    .filter(Boolean)
    .join(",");

  const add = (color: ProductColor) => {
    if (full) return;
    const name = color.name.trim() || color.hex.toUpperCase();
    if (value.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.hex === color.hex)) return;
    onChange([...value, { name, hex: normalizeHex(color.hex, FALLBACK) }]);
  };

  return (
    <div className="ceditor">
      <datalist id="lp-color-names">
        {COLOR_PRESETS.map((p) => (
          <option key={p.name} value={p.name} />
        ))}
      </datalist>

      <div className="ceditor__icon">
        {pieHex ? (
          <ColorPie hex={pieHex} size={44} title={value.map((c) => c.name).join(", ")} />
        ) : (
          <span className="ceditor__icon-empty" aria-hidden="true" />
        )}
        <div>
          <p className="ceditor__icon-title">
            {value.length === 0
              ? "Цвета не заданы — иконка на карточке скрыта"
              : `Иконка на сайте: ${Math.min(value.length, MAX_COLORS) === 1 ? "сплошной круг" : Math.min(value.length, MAX_COLORS) === 2 ? "две половины" : "три сектора по 120°"}`}
          </p>
          <p className="ceditor__icon-hint">
            {value.length > MAX_COLORS
              ? `Цветов ${value.length} — в иконку попадут первые ${MAX_COLORS}, сохраните не больше ${MAX_COLORS}`
              : `Не более ${MAX_COLORS} цветов в изделии.`}
          </p>
        </div>
      </div>

      <ul className="ceditor__list" role="list">
        {value.map((c, i) => {
          const hex = parseHexList(c.hex)[0] ?? nameToHex(c.name);
          return (
            <li key={i} className="ceditor__row">
              <ColorPie hex={hex} size={40} className="ceditor__preview" />
              <div className="ceditor__body">
                <div className="ceditor__line">
                  <input
                    className="input input--sm"
                    list="lp-color-names"
                    value={c.name}
                    placeholder="Название цвета"
                    aria-label={`Название цвета ${i + 1}`}
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                  <input
                    className="input input--sm ceditor__hex"
                    value={c.hex}
                    placeholder="#RRGGBB"
                    spellCheck={false}
                    aria-label={`HEX цвета ${i + 1}`}
                    onChange={(e) => patch(i, { hex: e.target.value })}
                    onBlur={() => patch(i, { hex: normalizeHex(value[i].hex, nameToHex(value[i].name)) })}
                  />
                  <button type="button" className="aicon-btn aicon-btn--danger" aria-label={`Удалить цвет ${i + 1}`} onClick={() => remove(i)}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <div className="ceditor__line ceditor__pickers">
                  <label className="ceditor__pick" title="Открыть палитру RGB">
                    <input type="color" value={hex} onChange={(e) => patch(i, { hex: e.target.value })} aria-label={`Палитра: цвет ${i + 1}`} />
                    <span>Палитра</span>
                  </label>
                  <span className="ceditor__rgb">{rgbLabel(hex)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="ceditor__footer">
        <p className="ceditor__presets-label">{full ? `Достигнут максимум — ${MAX_COLORS} цвета` : "Быстрый выбор цвета"}</p>
        <div className="ceditor__presets">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="ceditor__preset"
              style={{ background: p.hex }}
              title={`${p.name} · ${p.hex}`}
              aria-label={`Добавить цвет «${p.name}»`}
              disabled={full}
              onClick={() => add(p)}
            />
          ))}
        </div>
        <button type="button" className="abtn abtn--ghost abtn--sm" disabled={full} onClick={() => add({ name: "", hex: FALLBACK })}>
          <Icon name="plus" size={16} />
          Добавить цвет
        </button>
      </div>
    </div>
  );
}
