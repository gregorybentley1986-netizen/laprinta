import Link from "next/link";
import type { Database, SectionNode } from "@/lib/types";
import { sectionHref } from "@/lib/catalog";

type Props = {
  db: Database;
  tree: SectionNode[];
  activeId: string | null;
  openIds: string[];
  totalCount: number;
};

/** Sidebar rail: section → subsection tree with product counts. */
export function CatalogNav({ db, tree, activeId, openIds, totalCount }: Props) {
  const renderNode = (node: SectionNode, depth: number) => {
    const active = node.id === activeId;
    const open = openIds.includes(node.id) || depth === 0;
    return (
      <li key={node.id}>
        <Link href={sectionHref(db, node.id)} className={`rail-link rail-link--d${depth}${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
          <span>{node.title}</span>
          <span className="rail-link__count">{node.productCount}</span>
        </Link>
        {open && node.children.length > 0 && <ul role="list">{node.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <nav aria-label="Разделы каталога" className="rail-nav">
      <p className="overline rail-title">Каталог</p>
      <ul role="list">
        <li>
          <Link href="/catalog" className={`rail-link rail-link--d0${activeId === null ? " is-active" : ""}`} aria-current={activeId === null ? "page" : undefined}>
            <span>Все товары</span>
            <span className="rail-link__count">{totalCount}</span>
          </Link>
        </li>
        {tree.map((n) => renderNode(n, 0))}
      </ul>
    </nav>
  );
}
