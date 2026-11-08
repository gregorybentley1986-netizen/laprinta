import { buildTree, sectionHref } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { CartLink, FavoritesLink, MobileMenu, NavLinks, type NavSection } from "./HeaderParts";
import { Wordmark } from "./Wordmark";

/** `home` variant: no wordmark (the hero carries it) and transparent overlay on mobile. */
export async function SiteHeader({ variant = "default" }: { variant?: "home" | "default" }) {
  const db = await readDb();
  const sections: NavSection[] = buildTree(db, { publishedOnly: true }).map((s) => ({
    href: sectionHref(db, s.id),
    title: s.title,
    children: s.children.map((c) => ({ href: sectionHref(db, c.id), title: c.title })),
  }));

  return (
    <header className={`site-header site-header--${variant}`}>
      <div className="site-header__inner">
        {variant !== "home" && <Wordmark className="site-header__logo" />}
        <NavLinks />
        <div className="site-header__actions">
          <FavoritesLink />
          <CartLink />
          <MobileMenu sections={sections} />
        </div>
      </div>
    </header>
  );
}
