import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Icon } from "@/components/ui/Icon";
import { EmailLink } from "@/components/site/EmailLink";

export const metadata: Metadata = { title: "Контакты", description: "Связаться с laprinta: вопросы по товарам, опт и сотрудничество." };

export default function ContactsPage() {
  return (
    <div className="page container">
      <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Контакты" }]} />
      <header className="page-head page-head--wide">
        <h1 className="page-title">Контакты</h1>
        <p className="page-lead">Ответим на вопросы по моделям, подберём изделие под задачу и обсудим оптовые поставки.</p>
      </header>
      <div className="cards-3">
        <article className="info-card">
          <h3>Электронная почта</h3>
          <p>Вопросы по товарам, опт и сотрудничество.</p>
          <EmailLink className="link-arrow link-arrow--ink" icon={<Icon name="mail" size={16} />} />
        </article>
        <article className="info-card">
          <h3>Оптовым покупателям</h3>
          <p>Напишите, какие модели и объёмы интересуют, — пришлём условия и сроки производства партии.</p>
          <EmailLink
            className="link-arrow link-arrow--ink"
            subject="Опт"
            label={
              <>
                Запросить условия
                <Icon name="arrowRight" size={16} />
              </>
            }
          />
        </article>
        <article className="info-card">
          <h3>Каталог</h3>
          <p>Все модели с фото, видео и 3D-просмотром. Добавляйте понравившиеся в избранное.</p>
          <Link className="link-arrow link-arrow--ink" href="/catalog">
            Открыть каталог
            <Icon name="arrowRight" size={16} />
          </Link>
        </article>
      </div>
    </div>
  );
}
