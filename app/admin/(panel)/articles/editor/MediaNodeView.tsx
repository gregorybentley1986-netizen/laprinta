"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { Icon } from "@/components/ui/Icon";
import type { GalleryImage } from "./nodes";

const LABEL: Record<string, string> = {
  figureImage: "Фото",
  gallery: "Галерея",
  figureVideo: "Видео",
  embed: "Видео по ссылке",
  model: "3D-модель",
};

export function MediaNodeView({ node, updateAttributes, deleteNode, selected, editor }: ReactNodeViewProps) {
  const type = node.type.name;
  const { src, poster, caption } = node.attrs as { src: string; poster?: string; caption: string };
  const editable = editor.isEditable;

  return (
    <NodeViewWrapper className={`rte-media rte-media--${type}${selected ? " is-selected" : ""}`} data-drag-handle="">
      <div className="rte-media__bar" contentEditable={false}>
        <span className="rte-media__grip" aria-hidden="true">
          <Icon name="grip" size={14} />
        </span>
        <span className="rte-media__label">{LABEL[type] ?? type}</span>
        {editable && (
          <button type="button" className="aicon-btn aicon-btn--danger" aria-label="Удалить блок" title="Удалить блок" onClick={() => deleteNode()}>
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>
      <div className="rte-media__preview" contentEditable={false}>
        {type === "figureImage" && <img src={src} alt={node.attrs.alt || caption} />}
        {type === "gallery" && (
          <div className="rte-media__gallery">
            {(node.attrs.images as GalleryImage[]).map((img) => (
              <img key={img.src} src={img.src} alt={img.alt} />
            ))}
          </div>
        )}
        {type === "figureVideo" && <video src={src} poster={poster || undefined} controls preload="metadata" />}
        {type === "embed" && (
          <div className="rte-media__embed">
            <iframe src={src} title={caption || "Видео"} allowFullScreen loading="lazy" />
          </div>
        )}
        {type === "model" && (
          <div className="rte-media__model">
            {poster ? <img src={poster} alt="" /> : null}
            <span>
              <Icon name="cube" size={22} />
              GLB · {src?.split("/").pop()}
            </span>
          </div>
        )}
      </div>
      <div className="rte-media__fields" contentEditable={false}>
        <input
          className="input input--sm"
          value={caption}
          placeholder="Подпись (необязательно)"
          aria-label="Подпись"
          disabled={!editable}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
        />
        {type === "figureImage" && (
          <input
            className="input input--sm"
            value={node.attrs.alt ?? ""}
            placeholder="Alt-текст для поиска и экранных дикторов"
            aria-label="Alt-текст"
            disabled={!editable}
            onChange={(e) => updateAttributes({ alt: e.target.value })}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}
