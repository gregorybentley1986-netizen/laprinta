"use client";

import { Icon } from "@/components/ui/Icon";
import { COLOR_PRESETS, isLight, nameToHex, normalizeHex, parseHexList, rgbLabel, swatchBackground } from "@/lib/colors";
import type { ProductColor } from "@/lib/types";

type Props = { value: ProductColor[]; onChange: (next: ProductColor[]) => void };

const FALLBACK = "#8b959f";

/**
 * Colour variants editor: each row is a name plus a primary picker and an
 * optional second picker (two-tone). Pickers are native `<input type="color">`,
 * i.e. the OS RGB palette; the HEX field stays editable for exact values.
 */
export function ColorEditor({ value, onChange }: Props) {
  const patch = (i: number, next: Partial<ProductColor>) => onChange(value.map((c, j) => (j === i ? { ...c, ...next } : c)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  const setPrimary = (i: number, hex: string) => {
    const second = parseHexList(value[i].hex)[1];
    patch(i, { hex: second ? `${hex},${second}` : hex });
  };

  const toggleSecond = (i: number) => {
    const [first, second] = parseHexList(value[i].hex);
    if (!first) return;
    patch(i, { hex: second ? first : `${first},#ffffff` });
  };

  const add = (color: ProductColor) => {
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

      {value.length === 0 && <p className="ceditor__empty">Цвета не заданы — на карточке блок расцветок скрыт.</p>}

      <ul className="ceditor__list" role="list">
        {value.map((c, i) => {
          const [first, second] = parseHexList(c.hex);
          const primary = first ?? FALLBACK;
          return (
            <li key={i} className="ceditor__row">
              <span
                className="ceditor__preview"
                style={{ background: swatchBackground(c.hex) }}
                data-light={isLight(primary) ? "1" : "0"}
                aria-hidden="true"
              />
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
                  <label className="ceditor__pick" title="Основной цвет — откройте палитру">
                    <input type="color" value={primary} onChange={(e) => setPrimary(i, e.target.value)} aria-label={`Палитра: основной цвет ${i + 1}`} />
                    <span>Основной</span>
                  </label>
                  {second ? (
                    <>
                      <label className="ceditor__pick" title="Второй цвет">
                        <input
                          type="color"
                          value={second}
                          aria-label={`Палитра: второй цвет ${i + 1}`}
                          onChange={(e) => patch(i, { hex: `${first ?? FALLBACK},${e.target.value}` })}
                        />
                        <span>Второй</span>
                      </label>
                      <button type="button" className="ceditor__ghost-btn" onClick={() => toggleSecond(i)}>
                        Убрать второй
                      </button>
                    </>
                  ) : (
                    <button type="button" className="ceditor__ghost-btn" onClick={() => toggleSecond(i)}>
                      <Icon name="plus" size={14} />
                      Второй цвет (градиент)
                    </button>
                  )}
                  <span className="ceditor__rgb">{rgbLabel(c.hex)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="ceditor__footer">
        <p className="ceditor__presets-label">Быстрый выбор цвета</p>
        <div className="ceditor__presets">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="ceditor__preset"
              style={{ background: p.hex }}
              title={`${p.name} · ${p.hex}`}
              aria-label={`Добавить цвет «${p.name}»`}
              data-light={isLight(p.hex) ? "1" : "0"}
              onClick={() => add(p)}
            />
          ))}
        </div>
        <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => add({ name: "", hex: FALLBACK })}>
          <Icon name="plus" size={16} />
          Добавить свой цвет
        </button>
      </div>
    </div>
  );
}
