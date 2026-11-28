import Image from "next/image";
import Link from "next/link";
import { HomeHero } from "@/components/site/HomeHero";
import { ProductGrid } from "@/components/site/ProductCard";
import { Icon } from "@/components/ui/Icon";
import { buildTree, coverOf, listProducts, sectionHref, sortedMedia } from "@/lib/catalog";
import { toCard } from "@/lib/cards";
import { readDb } from "@/lib/db";
import { modelsCount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await readDb();
  const tree = buildTree(db, { publishedOnly: true });
  const first = tree[0];
  const featured = listProducts(db, null).slice(0, 4).map((p) => toCard(db, p));
  const tiles = tree.flatMap((s) => (s.children.length ? s.children : [s])).filter((s) => s.productCount > 0);
  // Prefer a non-tall photo so the 4:3 tile crop still shows the product.
  const tileCover = (sectionId: string) => {
    const products = listProducts(db, sectionId);
    const images = products.flatMap((p) => sortedMedia(p).filter((m) => m.type === "image"));
    return images.find((m) => !m.width || !m.height || m.height / m.width <= 1.4) ?? (products[0] && coverOf(products[0]));
  };

  return (
    <>
      <HomeHero seriesHref={first ? sectionHref(db, first.id) : "/catalog"} />

      <section className="content-band" aria-labelledby="intro-title">
        <div className="container">
          <h2 id="intro-title">Серийные изделия в каталоге</h2>
          <p className="lead">Пластик и термополиуретан — готовые модели, которые можно сравнить, рассмотреть в 3D и выбрать под задачу.</p>
          <div className="cols">
            <article>
              <h3>Пластик</h3>
              <p>PLA и PETG: жёсткие лёгкие корпуса с точной геометрией и гладкой поверхностью.</p>
              <Link className="more" href="/catalog?material=PETG">
                Смотреть модели →
              </Link>
            </article>
            <article>
              <h3>Термополиуретан</h3>
              <p>Гибкие и износостойкие детали из ТПУ: гнутся, а не ломаются при ударе.</p>
              <Link className="more" href="/catalog?material=ТПУ">
                Смотреть модели →
              </Link>
            </article>
            <article>
              <h3>Серии моделей</h3>
              <p>Единый каталог laprinta — сравнивайте серии и открывайте карточки изделий.</p>
              <Link className="more" href="/catalog">
                Смотреть модели →
              </Link>
            </article>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="band" aria-labelledby="featured-title">
          <div className="container">
            <div className="band__head">
              <div>
                <p className="overline">Каталог</p>
                <h2 id="featured-title" className="band__title">
                  Популярные модели
                </h2>
              </div>
              <Link href="/catalog" className="link-arrow">
                Весь каталог
                <Icon name="arrowRight" size={16} />
              </Link>
            </div>
            <ProductGrid products={featured} className="pgrid--row" />
          </div>
        </section>
      )}

      {tiles.length > 0 && (
        <section className="band band--raised" aria-labelledby="sections-title">
          <div className="container">
            <div className="band__head">
              <div>
                <p className="overline">Разделы</p>
                <h2 id="sections-title" className="band__title">
                  Выберите тип изделия
                </h2>
              </div>
            </div>
            <ul className="section-tiles" role="list">
              {tiles.map((s) => {
                const cover = tileCover(s.id);
                return (
                  <li key={s.id}>
                    <Link href={sectionHref(db, s.id)} className="section-tile">
                      <span className="section-tile__media">
                        {cover && <Image src={cover.url} alt="" fill sizes="(max-width: 700px) 50vw, 260px" />}
                      </span>
                      <span className="section-tile__body">
                        <span className="section-tile__title">{s.title}</span>
                        <span className="section-tile__count">{modelsCount(s.productCount)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="band" aria-labelledby="production-title">
        <div className="container">
          <div className="band__head">
            <div>
              <p className="overline">Производство</p>
              <h2 id="production-title" className="band__title">
                Аддитивное производство полного цикла
              </h2>
            </div>
            <Link href="/about" className="link-arrow">
              О компании
              <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <div className="facts">
            <div className="fact">
              <span className="fact__value">3D</span>
              <p>Модель каждой позиции можно повернуть и рассмотреть прямо в карточке товара.</p>
            </div>
            <div className="fact">
              <span className="fact__value">PLA · PETG · ТПУ</span>
              <p>Подбираем материал под задачу: жёсткость, гибкость, стойкость к воде и ударам.</p>
            </div>
            <div className="fact">
              <span className="fact__value">Серия</span>
              <p>Стабильная геометрия и вес от партии к партии — каждое изделие проходит контроль.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
