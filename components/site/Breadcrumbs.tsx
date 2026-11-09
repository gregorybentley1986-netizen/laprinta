import Link from "next/link";
import { Fragment } from "react";

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навигационная цепочка" className="crumbs">
      <ol>
        {items.map((c, i) => (
          <Fragment key={i}>
            <li>{c.href && i < items.length - 1 ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
