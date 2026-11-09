"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";

type Option = { id: string; label: string };
type FilterProps = { loadOptions: Option[]; materials: string[] };

function useQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const list = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  const toggleIn = (key: string, value: string) =>
    update((p) => {
      const cur = list(key);
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      if (next.length) p.set(key, next.join(","));
      else p.delete(key);
    });
  return { params, update, list, toggleIn, pending };
}

export function FilterPanel({ loadOptions, materials }: FilterProps) {
  const { params, update, list, toggleIn, pending } = useQuery();
  const load = list("load");
  const material = list("material");
  const stock = params.get("stock") === "1";
  const active = load.length + material.length + (stock ? 1 : 0);

  return (
    <div className={`filters${pending ? " is-pending" : ""}`}>
      <fieldset className="filter-group">
        <legend className="overline">Грузоподъёмность</legend>
        {loadOptions.map((o) => (
          <label key={o.id} className="check">
            <input type="checkbox" checked={load.includes(o.id)} onChange={() => toggleIn("load", o.id)} />
            <span className="check__box" aria-hidden="true">
              <Icon name="check" size={12} />
            </span>
            {o.label}
          </label>
        ))}
      </fieldset>
      {materials.length > 0 && (
        <fieldset className="filter-group">
          <legend className="overline">Материал</legend>
          {materials.map((m) => (
            <label key={m} className="check">
              <input type="checkbox" checked={material.includes(m)} onChange={() => toggleIn("material", m)} />
              <span className="check__box" aria-hidden="true">
                <Icon name="check" size={12} />
              </span>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className="filter-group">
        <legend className="overline">Наличие</legend>
        <label className="check">
          <input type="checkbox" checked={stock} onChange={() => update((p) => (stock ? p.delete("stock") : p.set("stock", "1")))} />
          <span className="check__box" aria-hidden="true">
            <Icon name="check" size={12} />
          </span>
          Только в наличии
        </label>
      </fieldset>
      {active > 0 && (
        <button type="button" className="link-btn" onClick={() => update((p) => ["load", "material", "stock"].forEach((k) => p.delete(k)))}>
          Сбросить фильтры ({active})
        </button>
      )}
    </div>
  );
}

export function SortSelect({ options }: { options: Option[] }) {
  const { params, update } = useQuery();
  return (
    <label className="sort-select">
      <span className="sort-select__label">Сортировка</span>
      <select
        value={params.get("sort") ?? "default"}
        onChange={(e) => update((p) => (e.target.value === "default" ? p.delete("sort") : p.set("sort", e.target.value)))}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={16} />
    </label>
  );
}

export function FiltersDrawer({ loadOptions, materials, resultCount }: FilterProps & { resultCount: number }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const active = ["load", "material"].reduce((n, k) => n + (params.get(k)?.split(",").filter(Boolean).length ?? 0), 0) + (params.get("stock") === "1" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn--ghost btn--sm filters-trigger" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="filters-sheet">
        <Icon name="filter" size={16} />
        Фильтры
        {active > 0 && <span className="count-badge">{active}</span>}
      </button>
      <div className={`sheet${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="sheet__backdrop" onClick={() => setOpen(false)} />
        <div id="filters-sheet" className="sheet__panel" role="dialog" aria-modal="true" aria-label="Фильтры" inert={!open}>
          <div className="sheet__head">
            <h2>Фильтры</h2>
            <button type="button" className="icon-btn" aria-label="Закрыть фильтры" onClick={() => setOpen(false)}>
              <Icon name="close" size={22} />
            </button>
          </div>
          <div className="sheet__body">
            <FilterPanel loadOptions={loadOptions} materials={materials} />
          </div>
          <div className="sheet__foot">
            <button type="button" className="btn btn--primary btn--block" onClick={() => setOpen(false)}>
              Показать {resultCount}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
