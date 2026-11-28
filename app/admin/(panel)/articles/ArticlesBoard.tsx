"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ArticleStatus } from "@/lib/types";
import { reorderArticles, setArticleStatus } from "../../article-actions";
import { useToast } from "../Toast";

export type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  cover: string | null;
  status: ArticleStatus;
  date: string;
  scheduled: boolean;
  publicUrl: string | null;
};

export function ArticlesBoard({ rows }: { rows: ArticleRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(rows);
  useEffect(() => setItems(rows), [rows]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const prev = items;
    const next = arrayMove(items, items.findIndex((r) => r.id === active.id), items.findIndex((r) => r.id === over.id));
    setItems(next);
    const res = await reorderArticles(next.map((r) => r.id));
    if (!res.ok) {
      setItems(prev);
      return toast(res.error, "error");
    }
    toast("Порядок статей сохранён");
    router.refresh();
  };

  const changeStatus = async (id: string, status: ArticleStatus) => {
    setItems((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await setArticleStatus(id, status);
    if (!res.ok) return toast(res.error, "error");
    toast(status === "published" ? "Статья опубликована" : "Статья скрыта");
    router.refresh();
  };

  return (
    <div className="articles-admin">
      <div className="board__toolbar">
        <div>
          <h1 className="admin-title">Статьи</h1>
          <p className="admin-sub">Порядок в списке — порядок на сайте. Перетаскивайте строки за ручку.</p>
        </div>
        <Link href="/admin/articles/new" className="abtn abtn--primary">
          <Icon name="plus" size={16} />
          Новая статья
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="group">
          <p className="group__empty">Статей пока нет — создайте первую.</p>
        </div>
      ) : (
        <DndContext id="articles-board" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="group">
              <div className="group__list">
                {items.map((r) => (
                  <Row key={r.id} row={r} onStatus={changeStatus} />
                ))}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function Row({ row, onStatus }: { row: ArticleRow; onStatus: (id: string, s: ArticleStatus) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  return (
    <div ref={setNodeRef} data-id={row.id} className={`prow arow${isDragging ? " is-dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button ref={setActivatorNodeRef} type="button" className="prow__handle" aria-label={`Перетащить «${row.title}»`} {...attributes} {...listeners}>
        <Icon name="grip" size={18} />
      </button>
      <div className="prow__thumb arow__thumb">{row.cover ? <Image src={row.cover} alt="" width={80} height={48} sizes="80px" /> : <Icon name="file" size={18} />}</div>
      <div className="prow__info">
        <Link href={`/admin/articles/${row.id}`} className="prow__name">
          {row.title}
        </Link>
        <span className="prow__meta">
          /articles/{row.slug} · {row.date}
          {row.scheduled && " · запланирована"}
        </span>
      </div>
      <div className="prow__status">
        <select className={`input input--sm status-select--${row.status}`} value={row.status} aria-label="Статус" onChange={(e) => onStatus(row.id, e.target.value as ArticleStatus)}>
          <option value="published">Опубликована</option>
          <option value="draft">Черновик</option>
        </select>
      </div>
      <div className="prow__actions arow__actions">
        {row.publicUrl && (
          <a href={row.publicUrl} target="_blank" rel="noreferrer" className="aicon-btn" aria-label="Открыть на сайте" title="Открыть на сайте">
            <Icon name="external" size={16} />
          </a>
        )}
        <Link href={`/admin/articles/${row.id}`} className="aicon-btn" aria-label="Редактировать" title="Редактировать">
          <Icon name="chevronRight" size={18} />
        </Link>
      </div>
    </div>
  );
}
