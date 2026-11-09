"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { EMBED_PROVIDER_LABEL, toEmbed } from "@/lib/embed";
import { useToast } from "../../Toast";
import { MEDIA_NODES, type GalleryImage } from "./nodes";

type Uploaded = { type: "image" | "video" | "glb"; url: string; width?: number; height?: number; name: string };

const P: Record<string, React.ReactNode> = {
  undo: <path d="M9 7H4v5M4 12a8 8 0 1 0 2.3-5.7L4 8.5" />,
  redo: <path d="M15 7h5v5M20 12a8 8 0 1 1-2.3-5.7L20 8.5" />,
  bullet: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  ordered: <path d="M10 6.5h10M10 12h10M10 17.5h10M4 5l1.5-1v5M3.8 14.5c.3-.6 1-.9 1.6-.7.9.3 1 1.3.3 1.9L4 17.5h2.2" />,
  quote: <path d="M5 7h5v5H6.5c0 2 .8 3.2 2.5 4M14 7h5v5h-3.5c0 2 .8 3.2 2.5 4" />,
  hr: <path d="M4 12h16M8 7h8M8 17h8" />,
  code: <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  left: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  center: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  right: <path d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  justify: <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
  table: <path d="M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14" />,
  image: <path d="M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5h.01" />,
  video: <path d="M4 6h11v12H4zM15 10l5-3v10l-5-3" />,
  embed: <path d="M3 6h18v12H3zM10 9.5v5l4-2.5-4-2.5" />,
  cube: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  gallery: <path d="M3 6h8v6H3zM13 6h8v6h-8zM3 14h8v4H3zM13 14h8v4h-8z" />,
};

function Svg({ name }: { name: keyof typeof P }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`rte-btn${active ? " is-active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function normalizeHref(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(v)) return v;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
  return null;
}

export function RichEditor({
  articleId,
  initialHtml,
  onChange,
}: {
  articleId: string;
  initialHtml: string;
  onChange: (html: string, changed: boolean) => void;
}) {
  const toast = useToast();
  // Plugins normalize the doc on the first transaction (trailing paragraph after media, table fixes);
  // that must not count as an edit.
  const baseline = useRef<string | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Начните писать статью…" }),
      ...MEDIA_NODES,
    ],
    content: initialHtml,
    editorProps: { attributes: { class: "rte-content prose", "aria-label": "Текст статьи" } },
    onCreate: ({ editor: e }) => {
      e.view.dispatch(e.state.tr.setMeta("addToHistory", false));
      baseline.current = e.getHTML();
    },
    onUpdate: ({ editor: e }) => {
      const h = e.getHTML();
      onChange(h, baseline.current !== null && h !== baseline.current);
    },
  });

  if (!editor) return <div className="rte rte--loading" />;
  return <EditorUI editor={editor} articleId={articleId} toast={toast} />;
}

function EditorUI({ editor, articleId, toast }: { editor: Editor; articleId: string; toast: ReturnType<typeof useToast> }) {
  const [bar, setBar] = useState<null | "link" | "embed">(null);
  const [url, setUrl] = useState("");
  const [barError, setBarError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickKind = useRef<"image" | "video" | "glb">("image");

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 2 })
        ? "h2"
        : e.isActive("heading", { level: 3 })
          ? "h3"
          : e.isActive("heading", { level: 4 })
            ? "h4"
            : e.isActive("codeBlock")
              ? "code"
              : "p",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      align: (["left", "center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canMerge: e.can().mergeOrSplit(),
    }),
  });

  const chain = () => editor.chain().focus();
  // Media nodes are block atoms: without a trailing paragraph the inserted node stays selected
  // and the next insert would replace it.
  const insertBlock = (node: { type: string; attrs: Record<string, unknown> }) =>
    chain().insertContent([node, { type: "paragraph" }]).run();

  const setBlock = (v: string) => {
    if (v === "p") chain().setParagraph().run();
    else if (v === "code") chain().toggleCodeBlock().run();
    else chain().toggleHeading({ level: Number(v.slice(1)) as 2 | 3 | 4 }).run();
  };

  const openBar = (mode: "link" | "embed") => {
    setBarError(null);
    setUrl(mode === "link" ? (editor.getAttributes("link").href ?? "") : "");
    setBar(bar === mode ? null : mode);
  };

  const applyBar = () => {
    if (bar === "link") {
      const href = normalizeHref(url);
      if (href === null) return setBarError("Ссылка должна начинаться с https://, mailto:, tel: или /");
      if (!href) chain().extendMarkRange("link").unsetLink().run();
      else chain().extendMarkRange("link").setLink({ href }).run();
    } else if (bar === "embed") {
      const embed = toEmbed(url);
      if (!embed) return setBarError("Поддерживаются ссылки YouTube, VK Видео и Rutube");
      insertBlock({ type: "embed", attrs: { src: embed.src, caption: "" } });
      toast(`Видео ${EMBED_PROVIDER_LABEL[embed.provider]} добавлено`);
    }
    setBar(null);
  };

  const pick = (kind: "image" | "video" | "glb") => {
    pickKind.current = kind;
    if (!fileRef.current) return;
    fileRef.current.accept = kind === "image" ? ".jpg,.jpeg,.png,.webp" : kind === "video" ? ".mp4,.webm" : ".glb";
    fileRef.current.multiple = kind === "image";
    fileRef.current.click();
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const kind = pickKind.current;
    const fd = new FormData();
    fd.append("articleId", articleId);
    [...files].forEach((f) => fd.append("files", f));
    setUploading(files.length > 1 ? `Загружаем ${files.length} файла…` : `Загружаем ${files[0].name}…`);
    try {
      const res = await fetch("/api/admin/article-upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { saved?: Uploaded[]; errors?: string[]; error?: string };
      for (const e of data.errors ?? (data.error ? [data.error] : [])) toast(e, "error");
      const saved = (data.saved ?? []).filter((m) => m.type === kind);
      if (!saved.length) return;
      if (kind === "image" && saved.length > 1) {
        const images: GalleryImage[] = saved.map((m) => ({ src: m.url, alt: "", width: m.width, height: m.height }));
        insertBlock({ type: "gallery", attrs: { images, caption: "" } });
      } else {
        const m = saved[0];
        const type = kind === "image" ? "figureImage" : kind === "video" ? "figureVideo" : "model";
        insertBlock({ type, attrs: { src: m.url, width: m.width, height: m.height, caption: "" } });
      }
    } catch {
      toast("Не удалось загрузить файл", "error");
    } finally {
      setUploading(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="rte">
      <div className="rte-toolbar" role="toolbar" aria-label="Форматирование">
        <div className="rte-group">
          <Btn label="Отменить" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
            <Svg name="undo" />
          </Btn>
          <Btn label="Повторить" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
            <Svg name="redo" />
          </Btn>
        </div>
        <div className="rte-group">
          <select className="input input--sm rte-select" value={s.block} aria-label="Тип блока" onChange={(e) => setBlock(e.target.value)}>
            <option value="p">Абзац</option>
            <option value="h2">Заголовок 2</option>
            <option value="h3">Заголовок 3</option>
            <option value="h4">Заголовок 4</option>
            <option value="code">Блок кода</option>
          </select>
        </div>
        <div className="rte-group">
          <Btn label="Жирный (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
            <b>Ж</b>
          </Btn>
          <Btn label="Курсив (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
            <i>К</i>
          </Btn>
          <Btn label="Подчёркнутый (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
            <u>Ч</u>
          </Btn>
          <Btn label="Зачёркнутый" active={s.strike} onClick={() => chain().toggleStrike().run()}>
            <s>З</s>
          </Btn>
          <Btn label="Код в строке" active={s.code} onClick={() => chain().toggleCode().run()}>
            <Svg name="code" />
          </Btn>
          <Btn label="Ссылка" active={s.link || bar === "link"} onClick={() => openBar("link")}>
            <Svg name="link" />
          </Btn>
        </div>
        <div className="rte-group">
          <Btn label="Маркированный список" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
            <Svg name="bullet" />
          </Btn>
          <Btn label="Нумерованный список" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
            <Svg name="ordered" />
          </Btn>
          <Btn label="Цитата" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
            <Svg name="quote" />
          </Btn>
          <Btn label="Разделитель" onClick={() => chain().setHorizontalRule().run()}>
            <Svg name="hr" />
          </Btn>
        </div>
        <div className="rte-group">
          {(["left", "center", "right", "justify"] as const).map((a) => (
            <Btn
              key={a}
              label={{ left: "По левому краю", center: "По центру", right: "По правому краю", justify: "По ширине" }[a]}
              active={s.align === a}
              onClick={() => (a === "left" ? chain().unsetTextAlign().run() : chain().setTextAlign(a).run())}
            >
              <Svg name={a} />
            </Btn>
          ))}
        </div>
        <div className="rte-group">
          <Btn label="Вставить таблицу 3×3" active={s.table} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <Svg name="table" />
          </Btn>
          <Btn label="Фото (несколько файлов — галерея)" onClick={() => pick("image")}>
            <Svg name="image" />
          </Btn>
          <Btn label="Видео-файл MP4/WebM" onClick={() => pick("video")}>
            <Svg name="video" />
          </Btn>
          <Btn label="Видео YouTube / VK / Rutube" active={bar === "embed"} onClick={() => openBar("embed")}>
            <Svg name="embed" />
          </Btn>
          <Btn label="3D-модель GLB" onClick={() => pick("glb")}>
            <Svg name="cube" />
          </Btn>
        </div>
        {uploading && (
          <span className="rte-status" role="status">
            <span className="spinner" aria-hidden="true" />
            {uploading}
          </span>
        )}
      </div>

      {s.table && (
        <div className="rte-subbar" role="toolbar" aria-label="Таблица">
          <span className="rte-subbar__label">Таблица:</span>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => chain().addRowBefore().run()}>
            + строка выше
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => chain().addRowAfter().run()}>
            + строка ниже
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => chain().deleteRow().run()}>
            − строка
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => chain().addColumnBefore().run()}>
            + столбец слева
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => chain().addColumnAfter().run()}>
            + столбец справа
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => chain().deleteColumn().run()}>
            − столбец
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => chain().toggleHeaderRow().run()}>
            Строка-заголовок
          </button>
          <button type="button" className="abtn abtn--ghost abtn--sm" disabled={!s.canMerge} onClick={() => chain().mergeOrSplit().run()}>
            Объединить / разделить
          </button>
          <button type="button" className="abtn abtn--danger-ghost abtn--sm" onClick={() => chain().deleteTable().run()}>
            Удалить таблицу
          </button>
        </div>
      )}

      {bar && (
        <div className="rte-subbar">
          <span className="rte-subbar__label">{bar === "link" ? "Ссылка:" : "Видео:"}</span>
          <input
            className="input input--sm rte-subbar__input"
            autoFocus
            value={url}
            placeholder={bar === "link" ? "https://… или /catalog/…" : "https://youtu.be/…, https://vkvideo.ru/video-…, https://rutube.ru/video/…"}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyBar();
              } else if (e.key === "Escape") {
                setBar(null);
                editor.commands.focus();
              }
            }}
          />
          <button type="button" className="abtn abtn--primary abtn--sm" onClick={applyBar}>
            {bar === "link" ? "Применить" : "Вставить"}
          </button>
          {bar === "link" && s.link && (
            <button
              type="button"
              className="abtn abtn--danger-ghost abtn--sm"
              onClick={() => {
                chain().extendMarkRange("link").unsetLink().run();
                setBar(null);
              }}
            >
              Убрать ссылку
            </button>
          )}
          <button type="button" className="abtn abtn--ghost abtn--sm" onClick={() => setBar(null)}>
            Отмена
          </button>
          {barError && (
            <span className="rte-subbar__error" role="alert">
              {barError}
            </span>
          )}
        </div>
      )}

      <EditorContent editor={editor} className="rte-body" />
      <input ref={fileRef} type="file" hidden onChange={(e) => upload(e.target.files)} />
    </div>
  );
}
