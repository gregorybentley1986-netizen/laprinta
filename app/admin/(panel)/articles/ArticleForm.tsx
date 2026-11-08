"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { slugify } from "@/lib/slug";
import { deleteArticle, saveArticle, type ArticleInput } from "../../article-actions";
import { useToast } from "../Toast";
import { RichEditor } from "./editor/RichEditor";

export type ProductOption = { id: string; name: string; section: string };

export function ArticleForm({ initial, isNew, products, publicUrl }: { initial: ArticleInput; isNew: boolean; products: ProductOption[]; publicUrl: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const html = useRef(initial.bodyHtml);
  const coverInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) => {
    setV((cur) => ({ ...cur, [key]: value }));
    setDirty(true);
  };

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveArticle({ ...v, bodyHtml: html.current });
      if (!res.ok) {
        setError(res.error);
        return toast(res.error, "error");
      }
      setDirty(false);
      toast(isNew ? "Статья создана" : "Статья сохранена");
      if (isNew) router.replace(`/admin/articles/${res.id}`);
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm(`Удалить статью «${initial.title}» вместе с загруженными файлами? Действие необратимо.`)) return;
    startTransition(async () => {
      const res = await deleteArticle(initial.id);
      if (!res.ok) return toast(res.error, "error");
      setDirty(false);
      toast("Статья удалена");
      router.push("/admin/articles");
    });
  };

  const uploadCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setCoverBusy(true);
    const fd = new FormData();
    fd.append("articleId", v.id);
    fd.append("files", file);
    try {
      const res = await fetch("/api/admin/article-upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { saved?: { type: string; url: string }[]; errors?: string[] };
      const img = data.saved?.find((m) => m.type === "image");
      if (img) set("coverUrl", img.url);
      else toast(data.errors?.[0] ?? "Загрузите изображение JPG, PNG или WebP", "error");
    } finally {
      setCoverBusy(false);
      if (coverInput.current) coverInput.current.value = "";
    }
  };

  const coverFromBody = () => {
    const src = /<img[^>]+src="([^"]+)"/.exec(html.current)?.[1];
    if (src) set("coverUrl", src);
    else toast("В тексте пока нет изображений", "error");
  };

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q) || p.section.toLowerCase().includes(q)) : products;
  }, [products, productQuery]);

  return (
    <form
      className="editor"
      onSubmit={submit}
      noValidate
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
      }}
    >
      <div className="editor__head">
        <Link href="/admin/articles" className="back-link">
          <Icon name="arrowLeft" size={16} />
          Все статьи
        </Link>
        <h1 className="admin-title">{isNew ? "Новая статья" : v.title || "Без заголовка"}</h1>
        {dirty && <span className="badge badge--muted">есть несохранённые изменения</span>}
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
            <div className="fields">
              <label className="field">
                <span className="field__label">Заголовок *</span>
                <input
                  className="input input--title"
                  value={v.title}
                  required
                  maxLength={200}
                  onChange={(e) => {
                    set("title", e.target.value);
                    if (!slugTouched) set("slug", slugify(e.target.value));
                  }}
                />
              </label>
              <label className="field">
                <span className="field__label">Адрес страницы (slug)</span>
                <div className="input-prefix">
                  <span>/articles/</span>
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
                <span className="field__label">Анонс</span>
                <textarea className="input" rows={3} maxLength={400} value={v.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
                <span className="field__hint">Показывается в списке статей и в превью ссылки · {v.excerpt.length}/400</span>
              </label>
            </div>
          </section>

          <section className="panel panel--editor">
            <h2 className="panel__title">Текст статьи</h2>
            <RichEditor
              articleId={v.id}
              initialHtml={initial.bodyHtml}
              onChange={(h, changed) => {
                html.current = h;
                if (changed) setDirty(true);
              }}
            />
          </section>
        </div>

        <aside className="editor__side">
          <section className="panel panel--sticky">
            <h2 className="panel__title">Публикация</h2>
            <label className="field">
              <span className="field__label">Статус</span>
              <select className="input" value={v.status} onChange={(e) => set("status", e.target.value as ArticleInput["status"])}>
                <option value="published">Опубликована</option>
                <option value="draft">Черновик (скрыта)</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">Дата публикации</span>
              <input className="input" type="date" value={v.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} />
              <span className="field__hint">Статья с будущей датой появится на сайте в этот день.</span>
            </label>
            {error && (
              <p className="notice notice--error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="abtn abtn--primary abtn--block" disabled={pending}>
              {pending ? "Сохраняем…" : "Сохранить"}
            </button>
            {!isNew && (
              <button type="button" className="abtn abtn--danger-ghost abtn--block" onClick={remove} disabled={pending}>
                <Icon name="trash" size={16} />
                Удалить статью
              </button>
            )}
          </section>

          <section className="panel">
            <h2 className="panel__title">Обложка</h2>
            <div className="cover-pick">
              {v.coverUrl ? <img src={v.coverUrl} alt="" /> : <span>Нет обложки</span>}
            </div>
            <div className="fields__actions">
              <button type="button" className="abtn abtn--ghost abtn--sm" disabled={coverBusy} onClick={() => coverInput.current?.click()}>
                <Icon name="upload" size={16} />
                {coverBusy ? "Загрузка…" : "Загрузить"}
              </button>
              <button type="button" className="abtn abtn--ghost abtn--sm" onClick={coverFromBody}>
                Из текста
              </button>
              {v.coverUrl && (
                <button type="button" className="aicon-btn aicon-btn--danger" aria-label="Убрать обложку" title="Убрать обложку" onClick={() => set("coverUrl", null)}>
                  <Icon name="trash" size={16} />
                </button>
              )}
            </div>
            <input ref={coverInput} type="file" accept=".jpg,.jpeg,.png,.webp" hidden onChange={(e) => uploadCover(e.target.files)} />
            <label className="field">
              <span className="field__label">Описание обложки (alt)</span>
              <input className="input" value={v.coverAlt} onChange={(e) => set("coverAlt", e.target.value)} />
            </label>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Товары в статье</h2>
              <span className="field__hint">{v.relatedProductIds.length} выбрано</span>
            </div>
            <input className="input input--sm" placeholder="Найти товар" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} aria-label="Найти товар" />
            <div className="pick-list" role="group" aria-label="Связанные товары">
              {filteredProducts.map((p) => (
                <label key={p.id} className="acheck">
                  <input
                    type="checkbox"
                    checked={v.relatedProductIds.includes(p.id)}
                    onChange={(e) => set("relatedProductIds", e.target.checked ? [...v.relatedProductIds, p.id] : v.relatedProductIds.filter((id) => id !== p.id))}
                  />
                  <span>
                    {p.name}
                    <small>{p.section}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">SEO</h2>
            <label className="field">
              <span className="field__label">Заголовок для поиска</span>
              <input className="input" value={v.seo.title} placeholder={v.title} onChange={(e) => set("seo", { ...v.seo, title: e.target.value })} />
            </label>
            <label className="field">
              <span className="field__label">Описание для поиска</span>
              <textarea className="input" rows={3} value={v.seo.description} placeholder={v.excerpt} onChange={(e) => set("seo", { ...v.seo, description: e.target.value })} />
            </label>
          </section>
        </aside>
      </div>
    </form>
  );
}
