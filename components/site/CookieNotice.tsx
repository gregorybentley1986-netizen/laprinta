"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Одно уведомление на сессию: sessionStorage живёт до закрытия вкладки. */
const KEY = "lp:cookie-notice";

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* приватный режим без хранилища — просто не показываем повторно */
    }
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ничего страшного: уведомление просто покажется снова */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="cookie-notice" role="region" aria-label="Уведомление об использовании cookie">
      <div className="cookie-notice__text">
        <Icon name="info" size={18} />
        <p>
          Сайт использует cookie и локальное хранилище браузера: без них не работают корзина, избранное и форма
          спецификации. Рекламных и аналитических cookie нет — подробнее в{" "}
          <Link href="/privacy#cookies">политике обработки персональных данных</Link>.
        </p>
      </div>
      <button type="button" className="btn btn--primary btn--sm cookie-notice__button" onClick={close}>
        Понятно
      </button>
    </div>
  );
}
