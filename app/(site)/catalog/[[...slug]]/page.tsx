import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/site/Breadcrumbs";
import { CatalogNav } from "@/components/site/CatalogNav";
import { FilterPanel, FiltersDrawer, SortSelect } from "@/components/site/CatalogControls";
import { ProductGrid } from "@/components/site/ProductCard";
import {
  LOAD_BUCKETS,
  SORTS,
  ancestors,
  buildTree,
  flattenTree,
  listProducts,
  materialsIn,
  parseFilters,
  resolveSectionPath,
  sectionHref,
} from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { readDb } from "@/lib/db";
import { modelsCount } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug = [] } = await params;
  if (!slug.length) return { title: "Каталог", description: "Каталог готовых изделий laprinta: поплавки и другие изделия из пластика и ТПУ." };
  const db = await readDb();
  const section = resolveSectionPath(db, slug);
  if (!section) return {};
  return { title: section.title, description: section.description || undefined, alternates: { canonical: sectionHref(db, section.id) } };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug = [] } = await params;
  const db = await readDb();
  const section = slug.length ? resolveSectionPath(db, slug) : null;
  if (slug.length && !section) notFound();

  const filters = parseFilters(await searchParams);
  const tree = buildTree(db, { publishedOnly: true });
  const nodes = flattenTree(tree);
  const node = section ? nodes.find((n) => n.id === section.id) : null;
  const chain = section ? ancestors(db, section.id) : [];

  const inSection = listProducts(db, section?.id ?? null);
  const products = listProducts(db, section?.id ?? null, filters);
  const cards = products.map((p) => toCard(db, p));
  const materials = materialsIn(inSection);
  const loadOptions = LOAD_BUCKETS.map(({ id, label }) => ({ id, label }));
  const totalCount = listProducts(db, null).length;

  const crumbs: Crumb[] = [{ href: "/", label: "Главная" }, { href: "/catalog", label: "Каталог" }, ...chain.map((s) => ({ href: sectionHref(db, s.id), label: s.title }))];

  // Mobile chips: children of the current section, or siblings for a leaf.
  const parent = node?.parentId ? nodes.find((n) => n.id === node.parentId) : null;
  const chipSource = !node ? tree : node.children.length ? node.children : parent ? parent.children : tree;
  const chipAll = !node ? { href: "/catalog", label: "Все" } : node.children.length ? { href: sectionHref(db, node.id), label: "Все" } : parent ? { href: sectionHref(db, parent.id), label: "Все" } : { href: "/catalog", label: "Все" };
  const chipAllActive = !node || node.children.length > 0;

  return (
    <div className="shell">
      <aside className="rail" aria-label="Каталог и фильтры">
        <div className="rail__inner">
          <CatalogNav db={db} tree={tree} activeId={section?.id ?? null} openIds={chain.map((s) => s.id)} totalCount={totalCount} />
          <div className="rail__filters">
            <FilterPanel loadOptions={loadOptions} materials={materials} />
          </div>
        </div>
      </aside>

      <section className="shell-main" aria-labelledby="catalog-title">
        <Breadcrumbs items={crumbs} />
        <header className="page-head">
          <h1 id="catalog-title" className="page-title">
            {section?.title ?? "Каталог"}
          </h1>
          <p className="page-sub">
            {modelsCount(inSection.length)} · готовые изделия
            {section?.description ? <span className="page-sub__desc">{section.description}</span> : null}
          </p>
        </header>

        {chipSource.length > 0 && (
          <nav className="chips" aria-label="Подразделы">
            <Link href={chipAll.href} className={`chip${chipAllActive ? " is-active" : ""}`}>
              {chipAll.label}
            </Link>
            {chipSource.map((s) => (
              <Link key={s.id} href={sectionHref(db, s.id)} className={`chip${s.id === section?.id ? " is-active" : ""}`}>
                {s.title}
                <span className="chip__count">{s.productCount}</span>
              </Link>
            ))}
          </nav>
        )}

        <div className="toolbar">
          <FiltersDrawer loadOptions={loadOptions} materials={materials} resultCount={products.length} />
          <p className="toolbar__count" aria-live="polite">
            {products.length !== inSection.length && `Найдено: ${modelsCount(products.length)}`}
          </p>
          <SortSelect options={SORTS.map(({ id, label }) => ({ id, label }))} />
        </div>

        {cards.length ? (
          <ProductGrid products={cards} priorityCount={4} />
        ) : (
          <div className="empty">
            <h2>Ничего не найдено</h2>
            <p>Попробуйте изменить фильтры или выбрать другой раздел.</p>
            <Link href={section ? sectionHref(db, section.id) : "/catalog"} className="btn btn--ghost">
              Сбросить фильтры
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
