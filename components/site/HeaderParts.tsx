"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFavorites } from "@/lib/favorites";
import { site } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "./Wordmark";

export type NavSection = { href: string; title: string; children: { href: string; title: string }[] };

function isActive(pathname: string, href: string) {
  if (href === "/catalog") return pathname.startsWith("/catalog") || pathname.startsWith("/product");
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="site-nav" aria-label="Основная навигация">
      {site.nav.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : undefined} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function FavoritesLink() {
  const { ids } = useFavorites();
  const pathname = usePathname();
  return (
    <Link href="/favorites" className={`header-fav${pathname === "/favorites" ? " is-active" : ""}`} aria-label={`Избранное${ids.length ? `, ${ids.length}` : ""}`}>
      <Icon name="heart" size={18} />
      <span className="header-fav__label">Избранное</span>
      {ids.length > 0 && <span className="count-badge">{ids.length}</span>}
    </Link>
  );
}

export function MobileMenu({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" className="icon-btn menu-trigger" aria-label="Открыть меню" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}>
        <Icon name="menu" size={22} />
      </button>
      <div className={`drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="drawer__backdrop" onClick={() => setOpen(false)} />
        <div ref={panelRef} id="mobile-menu" className="drawer__panel" role="dialog" aria-modal="true" aria-label="Меню" inert={!open}>
          <div className="drawer__head">
            <Wordmark className="wordmark--sm" />
            <button type="button" className="icon-btn" aria-label="Закрыть меню" onClick={() => setOpen(false)}>
              <Icon name="close" size={22} />
            </button>
          </div>
          <nav className="drawer__nav" aria-label="Меню">
            {site.nav.map((item) => (
              <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : undefined}>
                {item.label}
                <Icon name="chevronRight" size={18} />
              </Link>
            ))}
            <Link href="/favorites" className={pathname === "/favorites" ? "is-active" : undefined}>
              Избранное
              <Icon name="chevronRight" size={18} />
            </Link>
          </nav>
          {sections.length > 0 && (
            <div className="drawer__sections">
              <p className="overline">Разделы каталога</p>
              {sections.map((s) => (
                <div key={s.href} className="drawer__group">
                  <Link href={s.href} className="drawer__group-title">
                    {s.title}
                  </Link>
                  {s.children.map((c) => (
                    <Link key={c.href} href={c.href} className="drawer__sub">
                      {c.title}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
          <p className="drawer__foot">
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
        </div>
      </div>
    </>
  );
}
