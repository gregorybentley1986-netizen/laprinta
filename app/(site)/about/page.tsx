import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "О компании",
  description: "laprinta — собственное аддитивное производство изделий из пластика и термополиуретана.",
};

const MATERIALS = [
  { name: "PLA", text: "Жёсткий и точный пластик для корпусов с чистой геометрией и гладкой поверхностью." },
  { name: "PETG", text: "Прочный, не боится воды и перепадов температуры. Основной материал наших поплавков." },
  { name: "ТПУ", text: "Термополиуретан: гибкий, упругий и износостойкий. Гнётся, а не ломается." },
];

const STEPS = [
  { title: "Моделирование", text: "Проектируем изделие в CAD, считаем плавучесть и вес, проверяем модель в 3D." },
  { title: "Печать", text: "Печатаем серию на собственном парке принтеров с контролем параметров слоя." },
  { title: "Контроль и упаковка", text: "Проверяем геометрию, вес и огрузку каждого изделия, упаковываем партию." },
];

export default function AboutPage() {
  return (
    <div className="page container">
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "О компании" }]} />
      <header className="page-head page-head--wide">
        <h1 className="page-title">О компании</h1>
        <p className="page-lead">
          <strong>laprinta</strong> — {site.positioning.charAt(0).toLowerCase() + site.positioning.slice(1)}. Мы проектируем и выпускаем серийные изделия на собственном аддитивном производстве — от модели до упакованной партии.
        </p>
      </header>

      <section className="prose-block" aria-labelledby="materials-title">
        <h2 id="materials-title" className="section-title">
          Материалы
        </h2>
        <div className="cards-3">
          {MATERIALS.map((m) => (
            <article key={m.name} className="info-card">
              <h3>{m.name}</h3>
              <p>{m.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="prose-block" id="production" aria-labelledby="production-title">
        <h2 id="production-title" className="section-title">
          Производство
        </h2>
        <ol className="steps" role="list">
          {STEPS.map((s, i) => (
            <li key={s.title} className="step">
              <span className="step__num">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="cta-strip">
        <div>
          <h2>Посмотрите изделия в каталоге</h2>
          <p>Фото, видео и 3D-модель — в карточке каждого товара.</p>
        </div>
        <Link href="/catalog" className="btn btn--primary">
          Открыть каталог
          <Icon name="arrowRight" size={16} />
        </Link>
      </section>
    </div>
  );
}
