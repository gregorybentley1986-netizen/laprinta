"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { slugify } from "@/lib/slug";
import type { ProductStatus } from "@/lib/types";
import { deleteProduct, saveProduct, type ProductInput } from "../../actions";
import { useToast } from "../Toast";
import type { SectionOption } from "./data";

type Props = {
  initial: ProductInput;
  sections: SectionOption[];
  publicUrl?: string | null;
  media?: React.ReactNode;
};

const numOrNull = (v: string) => {
  const t = v.trim().replace(",", ".").replace(/\s/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export function ProductForm({ initial, sections, publicUrl, media }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState(initial);
  const [price, setPrice] = useState(initial.priceRub?.toString() ?? "");
  const [load, setLoad] = useState(initial.loadGrams?.toString().replace(".", ",") ?? "");
  const [colors, setColors] = useState(initial.colors.join(", "));
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [error, setError] = useState<string | null>(null);
  const isNew = !initial.id;

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setV((cur) => ({ ...cur, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const priceRub = numOrNull(price);
    const loadGrams = numOrNull(load);
    if (Number.isNaN(priceRub)) return setError("Цена должна быть числом");
    if (Number.isNaN(loadGrams)) return setError("Грузоподъёмность должна быть числом");
    startTransition(async () => {
      const res = await saveProduct({ ...v, priceRub, loadGrams, colors: colors.split(",") });
      if (!res.ok) {
        setError(res.error);
        toast(res.error, "error");
        return;
      }
      toast(isNew ? "Товар создан — теперь добавьте фото, видео и 3D" : "Изменения сохранены");
      if (isNew) router.push(`/admin/products/${res.id}`);
      else router.refresh();
    });
  };

  const remove = () => {
    if (!initial.id || !confirm(`Удалить «${initial.name}» вместе со всеми файлами? Действие необратимо.`)) return;
    startTransition(async () => {
      const res = await deleteProduct(initial.id!);
      if (!res.ok) return toast(res.error, "error");
      toast("Товар удалён");
      router.push("/admin/products");
    });
  };

  const setSpec = (i: number, key: "label" | "value", value: string) => set("specs", v.specs.map((s, j) => (j === i ? { ...s, [key]: value } : s)));
  const moveSpec = (i: number, d: -1 | 1) => {
    const next = [...v.specs];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    set("specs", next);
  };

  return (
    <form className="editor" onSubmit={submit} noValidate>
      <div className="editor__head">
        <Link href="/admin/products" className="back-link">
          <Icon name="arrowLeft" size={16} />
          Все товары
        </Link>
        <h1 className="admin-title">{isNew ? "Новый товар" : v.name || "Без названия"}</h1>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="abtn abtn--ghost abtn--sm">
            <Icon name="eye" size={16} />
            Смотреть на сайте
          </a>
        )}
      </div>

      <div className="editor__grid">
        <div className="editor__main">
          <section className="panel">
            <h2 className="panel__title">Основное</h2>
            <div className="fields fields--2">
              <label className="field field--wide">
                <span className="field__label">Название *</span>
                <input
                  className="input"
                  value={v.name}
                  required
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!slugTouched) set("slug", slugify(e.target.value));
                  }}
                />
              </label>
              <label className="field">
                <span className="field__label">Адрес страницы (slug)</span>
                <div className="input-prefix">
                  <span>/product/</span>
                  <input
                    className="input"
                    value={v.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", e.target.value.toLowerCase());
                    }}
                  />
                </div>
              </label>
              <label className="field">
                <span className="field__label">Артикул</span>
                <input className="input" value={v.sku} onChange={(e) => set("sku", e.target.value)} placeholder="LP-…" />
              </label>
              <label className="field field--wide">
                <span className="field__label">Короткое описание</span>
                <input className="input" value={v.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Одна строка под названием" />
              </label>
              <label className="field field--wide">
                <span className="field__label">Описание</span>
                <textarea className="input" rows={6} value={v.description} onChange={(e) => set("description", e.target.value)} />
                <span className="field__hint">Пустая строка — новый абзац.</span>
              </label>
            </div>
          </section>

          {media ?? (
            <section className="panel">
              <h2 className="panel__title">Фото, видео и 3D</h2>
              <p className="notice">Сохраните товар — после этого можно будет загрузить фотографии, видео и 3D-модель (GLB).</p>
            </section>
          )}

          <section className="panel">
            <h2 className="panel__title">Характеристики</h2>
            <div className="fields fields--3">
              <label className="field">
                <span className="field__label">Грузоподъёмность, г</span>
                <input className="input" inputMode="decimal" value={load} onChange={(e) => setLoad(e.target.value)} />
                <span className="field__hint">Используется в фильтре каталога</span>
              </label>
              <label className="field">
                <span className="field__label">Материал</span>
                <input className="input" value={v.material} onChange={(e) => set("material", e.target.value)} placeholder="PETG + ТПУ" />
                <span className="field__hint">Через «+», для фильтра</span>
              </label>
              <label className="field">
                <span className="field__label">Расцветки</span>
                <input className="input" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Через запятую" />
              </label>
            </div>
            <div className="specs">
              {v.specs.length > 0 && (
                <div className="specs__head" aria-hidden="true">
                  <span>Параметр</span>
                  <span>Значение</span>
                </div>
              )}
              {v.specs.map((s, i) => (
                <div key={i} className="specs__row">
                  <input className="input input--sm" aria-label="Параметр" value={s.label} onChange={(e) => setSpec(i, "label", e.target.value)} />
                  <input className="input input--sm" aria-label="Значение" value={s.value} onChange={(e) => setSpec(i, "value", e.target.value)} />
                  <div className="specs__tools">
                    <button type="button" className="aicon-btn" aria-label="Выше" onClick={() => moveSpec(i, -1)} disabled={i === 0}>
                      <Icon name="chevronDown" size={16} style={{ transform: "rotate(180deg)" }} />
                    </button>
                    <button type="button" className="aicon-btn" aria-label="Ниже" onClick={() => moveSpec(i, 1)} disabled={i === v.specs.length - 1}>
                      <Icon name="chevronDown" size={16} />
                    </button>
                    <button type="button" className="aicon-btn aicon-btn--danger" aria-label="Удалить строку" onClick={() => set("specs", v.specs.filter((_, j) => j !== i))}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => set("specs", [...v.specs, { label: "", value: "" }])}>
                <Icon name="plus" size={16} />
                Добавить характеристику
              </button>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Маркетплейсы и SEO</h2>
            <div className="fields fields--2">
              <label className="field">
                <span className="field__label">Ссылка на Ozon</span>
                <input className="input" type="url" value={v.marketplace.ozonUrl ?? ""} onChange={(e) => set("marketplace", { ...v.marketplace, ozonUrl: e.target.value })} placeholder="https://www.ozon.ru/product/…" />
              </label>
              <label className="field">
                <span className="field__label">Ссылка на Wildberries</span>
                <input className="input" type="url" value={v.marketplace.wildberriesUrl ?? ""} onChange={(e) => set("marketplace", { ...v.marketplace, wildberriesUrl: e.target.value })} placeholder="https://www.wildberries.ru/catalog/…" />
              </label>
              <label className="field">
                <span className="field__label">SEO-заголовок</span>
                <input className="input" value={v.seo.title} onChange={(e) => set("seo", { ...v.seo, title: e.target.value })} placeholder={v.name} />
              </label>
              <label className="field">
                <span className="field__label">SEO-описание</span>
                <input className="input" value={v.seo.description} onChange={(e) => set("seo", { ...v.seo, description: e.target.value })} placeholder={v.tagline} />
              </label>
            </div>
          </section>
        </div>

        <aside className="editor__side">
          <section className="panel panel--sticky">
            <h2 className="panel__title">Публикация</h2>
            <label className="field">
              <span className="field__label">Статус</span>
              <select className="input" value={v.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
                <option value="published">Опубликован</option>
                <option value="coming_soon">Скоро в продаже</option>
                <option value="draft">Черновик (скрыт)</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Раздел *</span>
              <select className="input" value={v.sectionId} onChange={(e) => set("sectionId", e.target.value)}>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {"— ".repeat(s.depth)}
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Цена, ₽</span>
              <input className="input input--price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="По запросу" />
            </label>
            <label className="acheck">
              <input type="checkbox" checked={v.priceFrom} onChange={(e) => set("priceFrom", e.target.checked)} />
              Показывать как «от …»
            </label>
            <label className="acheck">
              <input type="checkbox" checked={v.inStock} onChange={(e) => set("inStock", e.target.checked)} />
              В наличии
            </label>
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="abtn abtn--primary abtn--block" disabled={pending}>
              {pending ? "Сохраняем…" : isNew ? "Создать товар" : "Сохранить"}
            </button>
            {!isNew && (
              <button type="button" className="abtn abtn--danger-ghost abtn--block" onClick={remove} disabled={pending}>
                <Icon name="trash" size={16} />
                Удалить товар
              </button>
            )}
          </section>
        </aside>
      </div>
    </form>
  );
}
