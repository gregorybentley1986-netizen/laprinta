import Link from "next/link";
import { buildTree, sectionHref } from "@/lib/catalog";
import { readDb } from "@/lib/db";
import { site } from "@/lib/site";
import { Wordmark } from "./Wordmark";

export async function SiteFooter() {
  const db = await readDb();
  const tree = buildTree(db, { publishedOnly: true });
  const catalogLinks = tree.flatMap((s) => [s, ...s.children]).slice(0, 7);

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Wordmark className="wordmark--md" />
          <p>{site.positioning}.</p>
        </div>
        <nav className="site-footer__col" aria-label="Каталог">
          <p className="overline">Каталог</p>
          {catalogLinks.map((s) => (
            <Link key={s.id} href={sectionHref(db, s.id)}>
              {s.title}
            </Link>
          ))}
        </nav>
        <nav className="site-footer__col" aria-label="Компания">
          <p className="overline">Компания</p>
          <Link href="/about">О компании</Link>
          <Link href="/about#production">Производство</Link>
          <Link href="/contacts">Контакты</Link>
          <Link href="/favorites">Избранное</Link>
          <Link href="/cart">Корзина</Link>
        </nav>
        <div className="site-footer__col">
          <p className="overline">Связаться</p>
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <p className="site-footer__note">Опт и сотрудничество — напишите нам, ответим в течение рабочего дня.</p>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} laprinta · {site.domain}</span>
        <span>Цены на сайте носят информационный характер и не являются публичной офертой.</span>
      </div>
    </footer>
  );
}
