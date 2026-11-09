"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/site/Wordmark";

export type GalleryItem = {
  id: string;
  type: "image" | "video" | "glb";
  url: string;
  posterUrl?: string;
  alt: string;
  width?: number;
  height?: number;
};

const TYPE_LABEL = { image: "Фото", video: "Видео", glb: "3D" } as const;

function ModelStage({ item }: { item: GalleryItem }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let alive = true;
    import("@google/model-viewer")
      .then(() => alive && setReady(true))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onError = () => setFailed(true);
    let detachGrid = () => {};
    let alive = true;
    const onLoad = () => {
      import("@/lib/model-grid")
        .then(({ attachFloorGrid }) => {
          if (!alive) return;
          detachGrid();
          detachGrid = attachFloorGrid(el);
        })
        .catch(() => {});
    };
    el.addEventListener("error", onError);
    el.addEventListener("load", onLoad);
    if ((el as HTMLElement & { loaded?: boolean }).loaded) onLoad();
    return () => {
      alive = false;
      el.removeEventListener("error", onError);
      el.removeEventListener("load", onLoad);
      detachGrid();
    };
  }, [ready]);

  if (failed) {
    return (
      <div className="gallery__fallback">
        <Icon name="cube" size={32} />
        <p>3D-просмотр недоступен в этом браузере.</p>
        <a href={item.url} download className="link-btn">
          Скачать модель (.glb)
        </a>
      </div>
    );
  }
  return (
    <div className="gallery__model">
      {ready ? (
        <model-viewer
          ref={ref}
          src={item.url}
          alt={item.alt}
          camera-controls
          auto-rotate
          auto-rotate-delay="1500"
          rotation-per-second="18deg"
          camera-orbit="25deg 78deg auto"
          shadow-intensity="0.7"
          shadow-softness="0.9"
          exposure="1.05"
          environment-image="neutral"
          interaction-prompt="auto"
          touch-action="pan-y"
        />
      ) : (
        <div className="gallery__loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Загружаем 3D-модель…
        </div>
      )}
      <span className="gallery__watermark" aria-hidden="true">
        <Wordmark href={null} />
      </span>
      <p className="gallery__hint">
        <Icon name="cube" size={14} />
        Вращайте модель мышью или пальцем, масштаб — колесом или щипком
      </p>
    </div>
  );
}

export function ProductGallery({ items, name }: { items: GalleryItem[]; name: string }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const active = items[index];

  if (!items.length) {
    return (
      <div className="gallery gallery--empty">
        <div className="gallery__stage">
          <div className="gallery__fallback">
            <Icon name="image" size={32} />
            <p>Фотографии скоро появятся</p>
          </div>
        </div>
      </div>
    );
  }

  const go = (delta: number) => setIndex((i) => (i + delta + items.length) % items.length);

  return (
    <div className="gallery">
      <div
        className={`gallery__stage gallery__stage--${active.type}`}
        onTouchStart={(e) => {
          if (active.type === "image") touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
      >
        {active.type === "image" && (
          <Image key={active.id} src={active.url} alt={active.alt} fill sizes="(max-width: 900px) 100vw, 720px" priority={index === 0} className="gallery__img" />
        )}
        {active.type === "video" && (
          <video key={active.id} className="gallery__video" src={active.url} poster={active.posterUrl} controls playsInline preload="metadata">
            Ваш браузер не поддерживает видео.
          </video>
        )}
        {active.type === "glb" && <ModelStage key={active.id} item={active} />}

        {items.length > 1 && active.type === "image" && (
          <>
            <button type="button" className="gallery__nav gallery__nav--prev" aria-label="Предыдущее" onClick={() => go(-1)}>
              <Icon name="arrowLeft" size={18} />
            </button>
            <button type="button" className="gallery__nav gallery__nav--next" aria-label="Следующее" onClick={() => go(1)}>
              <Icon name="arrowRight" size={18} />
            </button>
          </>
        )}
        <span className="gallery__counter" aria-hidden="true">
          {index + 1} / {items.length}
        </span>
      </div>

      {items.length > 1 && (
        <div className="gallery__thumbs" role="tablist" aria-label={`Медиа: ${name}`}>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${TYPE_LABEL[item.type]} ${i + 1}`}
              className={`gallery__thumb gallery__thumb--${item.type}${i === index ? " is-active" : ""}`}
              onClick={() => setIndex(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") go(1);
                if (e.key === "ArrowLeft") go(-1);
              }}
            >
              {item.type === "image" && <Image src={item.url} alt="" fill sizes="96px" />}
              {item.type === "video" && item.posterUrl && <Image src={item.posterUrl} alt="" fill sizes="96px" />}
              {item.type !== "image" && (
                <span className="gallery__thumb-badge">
                  <Icon name={item.type === "video" ? "play" : "cube"} size={14} />
                  {TYPE_LABEL[item.type]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
