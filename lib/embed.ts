// Video hosting embeds allowed in articles. Shared by the editor (client) and the sanitizer (server).

export type EmbedProvider = "youtube" | "vk" | "rutube";

export const EMBED_PROVIDER_LABEL: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  vk: "VK Видео",
  rutube: "Rutube",
};

/** Converts a pasted page/share/embed URL into a canonical iframe URL, or null if unsupported. */
export function toEmbed(input: string): { provider: EmbedProvider; src: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : url.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ?? "";
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    const start = Number.parseInt(url.searchParams.get("t") ?? url.searchParams.get("start") ?? "", 10);
    return { provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}${start > 0 ? `?start=${start}` : ""}` };
  }

  if (host === "vk.com" || host === "vkvideo.ru" || host === "vk.ru") {
    if (url.pathname === "/video_ext.php") {
      const oid = url.searchParams.get("oid");
      const id = url.searchParams.get("id");
      const hash = url.searchParams.get("hash");
      if (!oid || !id || !/^-?\d+$/.test(oid) || !/^\d+$/.test(id)) return null;
      return { provider: "vk", src: `https://vk.com/video_ext.php?oid=${oid}&id=${id}${hash && /^\w+$/.test(hash) ? `&hash=${hash}` : ""}&hd=2` };
    }
    const m = /video(-?\d+)_(\d+)/.exec(url.pathname + url.search);
    if (!m) return null;
    return { provider: "vk", src: `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2` };
  }

  if (host === "rutube.ru") {
    const id = /^\/(?:video|play\/embed|shorts)\/([0-9a-f]{32})/.exec(url.pathname)?.[1];
    if (!id) return null;
    return { provider: "rutube", src: `https://rutube.ru/play/embed/${id}` };
  }
  return null;
}

/** True only for iframe URLs in the canonical form produced by `toEmbed`. */
export function isAllowedEmbedSrc(src: string) {
  return (
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{6,20}(\?start=\d+)?$/.test(src) ||
    /^https:\/\/vk\.com\/video_ext\.php\?oid=-?\d+&id=\d+(&hash=\w+)?&hd=2$/.test(src) ||
    /^https:\/\/rutube\.ru\/play\/embed\/[0-9a-f]{32}$/.test(src)
  );
}
