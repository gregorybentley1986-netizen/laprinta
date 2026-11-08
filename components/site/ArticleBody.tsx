"use client";

import { useEffect } from "react";

/** Renders sanitized article HTML; loads the 3D viewer only when the article contains a model. */
export function ArticleBody({ html, hasModel }: { html: string; hasModel: boolean }) {
  useEffect(() => {
    if (hasModel) import("@google/model-viewer").catch(() => undefined);
  }, [hasModel]);
  return <div className="prose article__body" dangerouslySetInnerHTML={{ __html: html }} />;
}
