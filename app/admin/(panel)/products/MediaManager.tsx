"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/format";
import type { ProductMedia } from "@/lib/types";
import { deleteMedia, reorderMedia, updateMedia } from "../../actions";
import { useToast } from "../Toast";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.mp4,.webm,.glb";
const TYPE_LABEL = { image: "Фото", video: "Видео", glb: "3D · GLB" } as const;

export function MediaManager({ productId, productName, media }: { productId: string; productName: string; media: ProductMedia[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(media);
  const [progress, setProgress] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setItems(media), [media]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const images = items.filter((m) => m.type === "image");

  const upload = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const body = new FormData();
    body.append("productId", productId);
    list.forEach((f) => body.append("files", f));
    setErrors([]);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let data: { saved?: ProductMedia[]; errors?: string[]; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      const errs = [...(data.errors ?? []), ...(data.error ? [data.error] : [])];
      setErrors(errs);
      if (data.saved?.length) {
        toast(`Загружено файлов: ${data.saved.length}`);
        router.refresh();
      } else if (!errs.length) {
        setErrors(["Не удалось загрузить файлы"]);
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setErrors(["Сеть недоступна — попробуйте ещё раз"]);
    };
    xhr.send(body);
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const prev = items;
    const next = arrayMove(items, items.findIndex((m) => m.id === active.id), items.findIndex((m) => m.id === over.id));
    setItems(next);
    const res = await reorderMedia(productId, next.map((m) => m.id));
    if (!res.ok) {
      setItems(prev);
      return toast(res.error, "error");
    }
    toast("Порядок медиа сохранён");
    router.refresh();
  };

  const patch = async (m: ProductMedia, data: Parameters<typeof updateMedia>[2], msg: string) => {
    const res = await updateMedia(productId, m.id, data);
    if (!res.ok) return toast(res.error, "error");
    toast(msg);
    router.refresh();
  };

  const remove = async (m: ProductMedia) => {
    if (!confirm(`Удалить файл (${TYPE_LABEL[m.type]})?`)) return;
    setItems((cur) => cur.filter((x) => x.id !== m.id));
    const res = await deleteMedia(productId, m.id);
    if (!res.ok) {
      setItems(media);
      return toast(res.error, "error");
    }
    toast("Файл удалён");
    router.refresh();
  };

  return (
    <section className="panel" aria-labelledby="media-title">
      <div className="panel__head">
        <h2 id="media-title" className="panel__title">
          Фото, видео и 3D
        </h2>
        <span className="admin-sub">Первое фото — обложка в каталоге, если не выбрано иное. Порядок — перетаскиванием.</span>
      </div>

      <div
        className={`dropzone${dragOver ? " is-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={24} />
        <p>
          <strong>Перетащите файлы сюда</strong> или{" "}
          <button type="button" className="link-inline" onClick={() => inputRef.current?.click()}>
            выберите на компьютере
          </button>
        </p>
        <p className="dropzone__hint">Фото: JPG, PNG, WebP до 8 МБ · Видео: MP4, WebM до 100 МБ · 3D: GLB (glTF 2.0) до 20 МБ. STL не принимается.</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
        {progress !== null && (
          <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Загрузка">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <ul className="notice notice--error" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {items.length > 0 ? (
        <DndContext id="media-grid" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((m) => m.id)} strategy={rectSortingStrategy}>
            <ul className="media-grid" role="list">
              {items.map((m, i) => (
                <MediaTile
                  key={m.id}
                  media={m}
                  index={i}
                  productName={productName}
                  images={images}
                  onCover={() => patch(m, { isCover: true }, "Обложка выбрана")}
                  onAlt={(alt) => patch(m, { alt }, "Подпись сохранена")}
                  onPoster={(posterUrl) => patch(m, { posterUrl }, "Постер обновлён")}
                  onDelete={() => remove(m)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="admin-sub">Файлов пока нет.</p>
      )}
    </section>
  );
}

type TileProps = {
  media: ProductMedia;
  index: number;
  productName: string;
  images: ProductMedia[];
  onCover: () => void;
  onAlt: (alt: string) => void;
  onPoster: (url: string | null) => void;
  onDelete: () => void;
};

function MediaTile({ media: m, index, productName, images, onCover, onAlt, onPoster, onDelete }: TileProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: m.id });
  const [alt, setAlt] = useState(m.alt ?? "");
  useEffect(() => setAlt(m.alt ?? ""), [m.alt]);

  return (
    <li ref={setNodeRef} className={`media-tile${isDragging ? " is-dragging" : ""}${m.isCover ? " is-cover" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className="media-tile__preview">
        {m.type === "image" && <img src={m.url} alt="" loading="lazy" />}
        {m.type === "video" && (m.posterUrl ? <img src={m.posterUrl} alt="" loading="lazy" /> : null)}
        {m.type !== "image" && (
          <span className="media-tile__icon">
            <Icon name={m.type === "video" ? "play" : "cube"} size={26} />
          </span>
        )}
        <button ref={setActivatorNodeRef} type="button" className="media-tile__handle" aria-label={`Переместить файл ${index + 1}`} {...attributes} {...listeners}>
          <Icon name="grip" size={16} />
        </button>
        <span className="media-tile__badge">
          {index + 1}. {TYPE_LABEL[m.type]}
        </span>
        {m.isCover && <span className="media-tile__cover">Обложка</span>}
      </div>
      <div className="media-tile__body">
        <input
          className="input input--sm"
          value={alt}
          placeholder={`Подпись (alt): ${productName}`}
          aria-label="Подпись к файлу"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => alt !== (m.alt ?? "") && onAlt(alt)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
        {(m.type === "video" || m.type === "glb") && (
          <select className="input input--sm" value={m.posterUrl ?? ""} onChange={(e) => onPoster(e.target.value || null)} aria-label="Постер">
            <option value="">Без постера</option>
            {images.map((img, i) => (
              <option key={img.id} value={img.url}>
                Постер: фото {i + 1}
              </option>
            ))}
          </select>
        )}
        <div className="media-tile__foot">
          <span className="media-tile__size">{formatBytes(m.bytes)}</span>
          <div className="media-tile__tools">
            {m.type === "image" && !m.isCover && (
              <button type="button" className="aicon-btn" onClick={onCover} aria-label="Сделать обложкой" title="Сделать обложкой">
                <Icon name="star" size={16} />
              </button>
            )}
            <a href={m.url} target="_blank" rel="noreferrer" className="aicon-btn" aria-label="Открыть файл" title="Открыть файл">
              <Icon name="external" size={16} />
            </a>
            <button type="button" className="aicon-btn aicon-btn--danger" onClick={onDelete} aria-label="Удалить файл" title="Удалить">
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
