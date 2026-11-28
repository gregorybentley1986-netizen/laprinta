import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page container not-found">
      <p className="not-found__code">404</p>
      <h1 className="page-title">Страница не найдена</h1>
      <p className="page-lead">Возможно, товар перенесли в другой раздел или ссылка устарела.</p>
      <div className="not-found__actions">
        <Link href="/catalog" className="btn btn--primary">
          Открыть каталог
        </Link>
        <Link href="/" className="btn btn--ghost">
          На главную
        </Link>
      </div>
    </div>
  );
}
