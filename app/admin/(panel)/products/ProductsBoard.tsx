"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ProductStatus } from "@/lib/types";
import { moveProduct, saveProductLayout, updatePrice, updateProductStatus } from "../../actions";
import { useToast } from "../Toast";

export type BoardSection = { id: string; title: string; depth: number; hidden: boolean; href: string };
export type BoardProduct = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  sectionId: string;
  priceRub: number | null;
  status: ProductStatus;
  cover: string | null;
  mediaCount: number;
};

type Layout = Record<string, string[]>;

const STATUS_LABEL: Record<ProductStatus, string> = { published: "Опубликован", coming_soon: "Скоро", draft: "Черновик" };
const TREE = "tree:";
const GROUP = "group:";

function buildLayout(sections: BoardSection[], products: BoardProduct[]): Layout {
  const layout: Layout = Object.fromEntries(sections.map((s) => [s.id, [] as string[]]));
  for (const p of products) (layout[p.sectionId] ??= []).push(p.id);
  return layout;
}

function changedContainers(before: Layout, after: Layout): Layout {
  const out: Layout = {};
  for (const [k, ids] of Object.entries(after)) {
    const prev = before[k] ?? [];
    if (prev.length !== ids.length || prev.some((id, i) => id !== ids[i])) out[k] = ids;
  }
  return out;
}

export function ProductsBoard({ sections, products, initialSection }: { sections: BoardSection[]; products: BoardProduct[]; initialSection: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [, startTransition] = useTransition();

  const [layout, setLayout] = useState<Layout>(() => buildLayout(sections, products));
  const [byId, setById] = useState(() => new Map(products.map((p) => [p.id, p])));
  const [selected, setSelected] = useState<string | null>(initialSection);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const snapshot = useRef<Layout | null>(null);

  // Re-sync with the server after router.refresh(), but never mid-drag.
  useEffect(() => {
    if (snapshot.current) return;
    setLayout(buildLayout(sections, products));
    setById(new Map(products.map((p) => [p.id, p])));
  }, [sections, products]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  const selectSection = (id: string | null) => {
    setSelected(id);
    router.replace(id ? `${pathname}?section=${id}` : pathname, { scroll: false });
  };

  const findContainer = (id: string): string | undefined => {
    if (id.startsWith(GROUP)) return id.slice(GROUP.length);
    if (id in layout) return id;
    return Object.keys(layout).find((k) => layout[k].includes(id));
  };

  const persist = (next: Layout) => {
    const before = snapshot.current ?? layout;
    const diff = changedContainers(before, next);
    snapshot.current = null;
    if (!Object.keys(diff).length) return;
    startTransition(async () => {
      const res = await saveProductLayout(diff);
      if (!res.ok) {
        setLayout(before);
        toast(res.error, "error");
        return;
      }
      setById((m) => {
        const copy = new Map(m);
        for (const [sid, ids] of Object.entries(diff)) ids.forEach((id) => copy.set(id, { ...copy.get(id)!, sectionId: sid }));
        return copy;
      });
      toast("Порядок сохранён");
      router.refresh();
    });
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    snapshot.current = structuredClone(layout);
    setActiveId(String(active.id));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || String(over.id).startsWith(TREE)) return;
    const from = findContainer(String(active.id));
    const to = findContainer(String(over.id));
    if (!from || !to || from === to) return;
    setLayout((prev) => {
      const fromItems = prev[from].filter((id) => id !== active.id);
      const overIndex = prev[to].indexOf(String(over.id));
      const toItems = [...prev[to]];
      toItems.splice(overIndex >= 0 ? overIndex : toItems.length, 0, String(active.id));
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const id = String(active.id);
    if (!over) {
      if (snapshot.current) setLayout(snapshot.current);
      snapshot.current = null;
      return;
    }
    const overId = String(over.id);
    let next = layout;
    if (overId.startsWith(TREE)) {
      const target = overId.slice(TREE.length);
      const base = snapshot.current ?? layout;
      const from = Object.keys(base).find((k) => base[k].includes(id));
      if (!from || from === target) {
        setLayout(base);
        snapshot.current = null;
        return;
      }
      next = { ...base, [from]: base[from].filter((x) => x !== id), [target]: [...base[target].filter((x) => x !== id), id] };
      toast(`Перенесено в «${sectionById.get(target)?.title}»`);
    } else {
      const container = findContainer(overId);
      if (container) {
        const items = layout[container];
        const oldIndex = items.indexOf(id);
        const newIndex = overId.startsWith(GROUP) ? items.length - 1 : items.indexOf(overId);
        if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) next = { ...layout, [container]: arrayMove(items, oldIndex, newIndex) };
      }
    }
    setLayout(next);
    persist(next);
  };

  const onPrice = async (id: string, value: number | null) => {
    const res = await updatePrice(id, value);
    if (!res.ok) return toast(res.error, "error");
    setById((m) => new Map(m).set(id, { ...m.get(id)!, priceRub: value }));
    toast("Цена сохранена");
  };
  const onStatus = async (id: string, status: ProductStatus) => {
    setById((m) => new Map(m).set(id, { ...m.get(id)!, status }));
    const res = await updateProductStatus(id, status);
    if (!res.ok) return toast(res.error, "error");
    toast("Статус обновлён");
  };
  const onMove = async (id: string, sectionId: string) => {
    const res = await moveProduct(id, sectionId);
    if (!res.ok) return toast(res.error, "error");
    setLayout((prev) => {
      const from = Object.keys(prev).find((k) => prev[k].includes(id))!;
      return { ...prev, [from]: prev[from].filter((x) => x !== id), [sectionId]: [...prev[sectionId], id] };
    });
    toast(`Перенесено в «${sectionById.get(sectionId)?.title}»`);
    router.refresh();
  };

  const total = Object.values(layout).reduce((n, ids) => n + ids.length, 0);
  const visibleSections = sections.filter((s) => !selected || s.id === selected);
  const matches = (id: string) => {
    const p = byId.get(id);
    return !!p && (!searching || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  };
  const active = activeId ? byId.get(activeId) : null;

  return (
    <div className="board">
      <DndContext id="products-board" sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => {
        if (snapshot.current) setLayout(snapshot.current);
        snapshot.current = null;
        setActiveId(null);
      }}>
        <aside className="board__tree" aria-label="Разделы">
          <p className="admin-overline">Разделы</p>
          <button type="button" className={`tree-row${selected === null ? " is-active" : ""}`} onClick={() => selectSection(null)}>
            <span>Все товары</span>
            <span className="tree-row__count">{total}</span>
          </button>
          {sections.map((s) => (
            <TreeTarget key={s.id} section={s} count={layout[s.id]?.length ?? 0} active={selected === s.id} dragging={!!activeId} onSelect={() => selectSection(s.id)} />
          ))}
          <p className="board__hint">Перетащите товар за ручку <Icon name="grip" size={14} /> на раздел слева, чтобы перенести его.</p>
        </aside>

        <section className="board__main">
          <div className="board__toolbar">
            <div>
              <h1 className="admin-title">{selected ? sectionById.get(selected)?.title : "Все товары"}</h1>
              <p className="admin-sub">Перетаскивайте строки, чтобы изменить порядок на витрине. Цена и статус сохраняются сразу.</p>
            </div>
            <div className="board__actions">
              <label className="search">
                <Icon name="search" size={16} />
                <input className="input" type="search" placeholder="Поиск по названию или артикулу" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Поиск товаров" />
              </label>
              <Link href={`/admin/products/new${selected ? `?section=${selected}` : ""}`} className="abtn abtn--primary">
                <Icon name="plus" size={16} />
                Добавить товар
              </Link>
            </div>
          </div>
          {searching && <p className="notice">Во время поиска перетаскивание отключено.</p>}

          {visibleSections.map((s) => {
            const ids = (layout[s.id] ?? []).filter(matches);
            if (searching && !ids.length) return null;
            return (
              <Group key={s.id} section={s} ids={ids} disabled={searching} showEmpty={!selected ? !activeId && !(layout[s.id] ?? []).length : true}>
                {ids.map((id) => (
                  <Row key={id} product={byId.get(id)!} sections={sections} disabled={searching} onPrice={onPrice} onStatus={onStatus} onMove={onMove} />
                ))}
              </Group>
            );
          })}
        </section>

        <DragOverlay dropAnimation={null}>{active ? <RowPreview product={active} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function TreeTarget({ section, count, active, dragging, onSelect }: { section: BoardSection; count: number; active: boolean; dragging: boolean; onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: TREE + section.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tree-row tree-row--d${section.depth}${active ? " is-active" : ""}${isOver ? " is-over" : ""}${dragging ? " is-target" : ""}`}
      onClick={onSelect}
    >
      <span className="tree-row__title">
        {section.title}
        {section.hidden && <span className="badge badge--muted">скрыт</span>}
      </span>
      <span className="tree-row__count">{isOver ? "сюда" : count}</span>
    </button>
  );
}

function Group({ section, ids, disabled, showEmpty, children }: { section: BoardSection; ids: string[]; disabled: boolean; showEmpty: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: GROUP + section.id, disabled });
  return (
    <div className={`group${isOver ? " is-over" : ""}`}>
      <div className="group__head">
        <h2>
          {section.title}
          {section.hidden && <span className="badge badge--muted">скрыт на сайте</span>}
        </h2>
        <span className="group__count">{ids.length}</span>
        {!section.hidden && (
          <a href={section.href} target="_blank" rel="noreferrer" className="group__link">
            На сайте
            <Icon name="external" size={14} />
          </a>
        )}
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <div ref={setNodeRef} className="group__list">
          {children}
          {ids.length === 0 && showEmpty && <p className="group__empty">Нет товаров — перетащите сюда</p>}
        </div>
      </SortableContext>
    </div>
  );
}

type RowProps = {
  product: BoardProduct;
  sections: BoardSection[];
  disabled: boolean;
  onPrice: (id: string, v: number | null) => void;
  onStatus: (id: string, s: ProductStatus) => void;
  onMove: (id: string, sectionId: string) => void;
};

function Row({ product, sections, disabled, onPrice, onStatus, onMove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: product.id, disabled });
  const [price, setPrice] = useState(product.priceRub?.toString() ?? "");
  useEffect(() => setPrice(product.priceRub?.toString() ?? ""), [product.priceRub]);

  const commitPrice = () => {
    const trimmed = price.trim().replace(/\s/g, "");
    const value = trimmed === "" ? null : Number(trimmed);
    if (value === product.priceRub) return;
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      setPrice(product.priceRub?.toString() ?? "");
      return;
    }
    onPrice(product.id, value);
  };

  return (
    <div ref={setNodeRef} data-id={product.id} className={`prow${isDragging ? " is-dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button ref={setActivatorNodeRef} type="button" className="prow__handle" aria-label={`Перетащить «${product.name}»`} disabled={disabled} {...attributes} {...listeners}>
        <Icon name="grip" size={18} />
      </button>
      <div className="prow__thumb">{product.cover ? <Image src={product.cover} alt="" width={48} height={48} sizes="48px" /> : <Icon name="image" size={18} />}</div>
      <div className="prow__info">
        <Link href={`/admin/products/${product.id}`} className="prow__name">
          {product.name}
        </Link>
        <span className="prow__meta">
          {product.sku || "без артикула"} · медиа: {product.mediaCount}
        </span>
      </div>
      <label className="prow__price">
        <span className="sr-only">Цена, ₽</span>
        <input
          className="input input--sm"
          inputMode="numeric"
          value={price}
          placeholder="—"
          onChange={(e) => setPrice(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        />
        <span aria-hidden="true">₽</span>
      </label>
      <label className="prow__status">
        <span className="sr-only">Статус</span>
        <select className={`input input--sm status-select status-select--${product.status}`} value={product.status} onChange={(e) => onStatus(product.id, e.target.value as ProductStatus)}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="prow__section">
        <span className="sr-only">Раздел</span>
        <select className="input input--sm" value={product.sectionId} onChange={(e) => onMove(product.id, e.target.value)}>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {"— ".repeat(s.depth)}
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <div className="prow__actions">
        <Link href={`/admin/products/${product.id}`} className="aicon-btn" aria-label={`Редактировать «${product.name}»`} title="Редактировать">
          <Icon name="chevronRight" size={18} />
        </Link>
      </div>
    </div>
  );
}

function RowPreview({ product }: { product: BoardProduct }) {
  return (
    <div className="prow prow--overlay">
      <span className="prow__handle">
        <Icon name="grip" size={18} />
      </span>
      <div className="prow__thumb">{product.cover ? <Image src={product.cover} alt="" width={48} height={48} sizes="48px" /> : <Icon name="image" size={18} />}</div>
      <div className="prow__info">
        <span className="prow__name">{product.name}</span>
        <span className="prow__meta">{product.sku}</span>
      </div>
    </div>
  );
}
