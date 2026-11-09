"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { slugify } from "@/lib/slug";
import type { SectionStatus } from "@/lib/types";
import { deleteSection, reorderSections, saveSection, setSectionStatus, type SectionInput } from "../../actions";
import { useToast } from "../Toast";

export type AdminSectionNode = {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  description: string;
  status: SectionStatus;
  productCount: number;
  directCount: number;
  href: string;
  children: AdminSectionNode[];
};

type ParentOption = { id: string; title: string };

export function SectionsBoard({ tree }: { tree: AdminSectionNode[] }) {
  const parents: ParentOption[] = tree.map((t) => ({ id: t.id, title: t.title }));
  return (
    <div className="sections-page">
      <div className="board__toolbar">
        <div>
          <h1 className="admin-title">Разделы каталога</h1>
          <p className="admin-sub">Два уровня: раздел → подраздел. Порядок на сайте задаётся перетаскиванием за ручку.</p>
        </div>
      </div>
      <div className="sections-grid">
        <section className="panel">
          <h2 className="panel__title">Структура</h2>
          <SortableList parentId={null} nodes={tree} parents={parents} />
        </section>
        <aside>
          <section className="panel panel--sticky">
            <h2 className="panel__title">Новый раздел</h2>
            <SectionEditor parents={parents} initial={{ title: "", slug: "", description: "", parentId: null, status: "published" }} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function SortableList({ parentId, nodes, parents }: { parentId: string | null; nodes: AdminSectionNode[]; parents: ParentOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(nodes);
  useEffect(() => setItems(nodes), [nodes]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const prev = items;
    const next = arrayMove(items, items.findIndex((n) => n.id === active.id), items.findIndex((n) => n.id === over.id));
    setItems(next);
    const res = await reorderSections(parentId, next.map((n) => n.id));
    if (!res.ok) {
      setItems(prev);
      return toast(res.error, "error");
    }
    toast("Порядок разделов сохранён");
    router.refresh();
  };

  if (!items.length) return parentId ? null : <p className="admin-sub">Разделов пока нет — создайте первый справа.</p>;
  return (
    <DndContext id={`sections-${parentId ?? "root"}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <ul className={`stree${parentId ? " stree--nested" : ""}`} role="list">
          {items.map((n) => (
            <SectionItem key={n.id} node={n} parents={parents} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SectionItem({ node, parents }: { node: AdminSectionNode; parents: ParentOption[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const hidden = node.status === "hidden";

  const toggle = () =>
    startTransition(async () => {
      const res = await setSectionStatus(node.id, hidden ? "published" : "hidden");
      if (!res.ok) return toast(res.error, "error");
      toast(hidden ? "Раздел показан на сайте" : "Раздел скрыт с сайта");
      router.refresh();
    });

  const remove = () => {
    if (!confirm(`Удалить раздел «${node.title}»?`)) return;
    startTransition(async () => {
      const res = await deleteSection(node.id);
      if (!res.ok) return toast(res.error, "error");
      toast("Раздел удалён");
      router.refresh();
    });
  };

  return (
    <li ref={setNodeRef} className={`stree__item${isDragging ? " is-dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className={`srow${hidden ? " is-hidden" : ""}`}>
        <button ref={setActivatorNodeRef} type="button" className="prow__handle" aria-label={`Перетащить «${node.title}»`} {...attributes} {...listeners}>
          <Icon name="grip" size={18} />
        </button>
        <div className="srow__info">
          <span className="srow__title">
            {node.title}
            {hidden && <span className="badge badge--muted">скрыт</span>}
          </span>
          <span className="srow__meta">{node.href}</span>
        </div>
        <Link href={`/admin/products?section=${node.id}`} className="badge badge--count" title="Товары раздела">
          {node.productCount} тов.
        </Link>
        <div className="srow__tools">
          <button type="button" className="aicon-btn" onClick={toggle} aria-label={hidden ? "Показать на сайте" : "Скрыть с сайта"} title={hidden ? "Показать на сайте" : "Скрыть с сайта"}>
            <Icon name="eye" size={16} style={hidden ? { opacity: 0.4 } : undefined} />
          </button>
          <button type="button" className={`aicon-btn${editing ? " is-active" : ""}`} onClick={() => setEditing((e) => !e)} aria-expanded={editing} aria-label="Редактировать" title="Редактировать">
            <Icon name="chevronDown" size={16} style={editing ? { transform: "rotate(180deg)" } : undefined} />
          </button>
          <button type="button" className="aicon-btn aicon-btn--danger" onClick={remove} aria-label="Удалить" title="Удалить">
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>
      {editing && (
        <div className="srow__editor">
          <SectionEditor
            parents={parents.filter((p) => p.id !== node.id)}
            canNest={node.children.length === 0}
            initial={{ id: node.id, title: node.title, slug: node.slug, description: node.description, parentId: node.parentId, status: node.status }}
            onDone={() => setEditing(false)}
          />
        </div>
      )}
      {node.children.length > 0 && <SortableList parentId={node.id} nodes={node.children} parents={parents} />}
    </li>
  );
}

function SectionEditor({ initial, parents, canNest = true, onDone }: { initial: SectionInput; parents: ParentOption[]; canNest?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveSection(v);
      if (!res.ok) return setError(res.error);
      toast(initial.id ? "Раздел сохранён" : "Раздел создан");
      if (!initial.id) {
        setV({ title: "", slug: "", description: "", parentId: v.parentId, status: "published" });
        setSlugTouched(false);
      }
      onDone?.();
      router.refresh();
    });
  };

  return (
    <form className="fields" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Название *</span>
        <input
          className="input"
          value={v.title}
          required
          onChange={(e) => setV((c) => ({ ...c, title: e.target.value, slug: slugTouched ? c.slug : slugify(e.target.value) }))}
        />
      </label>
      <label className="field">
        <span className="field__label">Адрес (slug)</span>
        <input
          className="input"
          value={v.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setV((c) => ({ ...c, slug: e.target.value.toLowerCase() }));
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">Родительский раздел</span>
        <select className="input" value={v.parentId ?? ""} onChange={(e) => setV((c) => ({ ...c, parentId: e.target.value || null }))} disabled={!canNest && !initial.parentId}>
          <option value="">— верхний уровень —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Описание</span>
        <textarea className="input" rows={2} value={v.description} onChange={(e) => setV((c) => ({ ...c, description: e.target.value }))} />
      </label>
      <label className="acheck">
        <input type="checkbox" checked={v.status === "hidden"} onChange={(e) => setV((c) => ({ ...c, status: e.target.checked ? "hidden" : "published" }))} />
        Скрыть с сайта
      </label>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <div className="fields__actions">
        <button type="submit" className="abtn abtn--primary" disabled={pending}>
          {pending ? "Сохраняем…" : initial.id ? "Сохранить" : "Добавить раздел"}
        </button>
        {onDone && (
          <button type="button" className="abtn abtn--ghost" onClick={onDone}>
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
