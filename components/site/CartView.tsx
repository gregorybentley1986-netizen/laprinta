"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EMPTY_CUSTOMER, loadCustomer, saveCustomer, useCart } from "@/lib/cart";
import { CUSTOMER_LIMITS, cartTotals, lineSum, totalsNote, type CartCustomer } from "@/lib/cart-math";
import type { CardProduct } from "@/lib/cards";
import { plural } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { QtyStepper } from "./CartButton";

const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const money = (n: number) => `${rub.format(n)} ₽`;
const noop = () => () => {};

const FIELDS: { key: keyof CartCustomer; label: string; type?: string; autoComplete?: string; wide?: boolean }[] = [
  { key: "name", label: "Имя", autoComplete: "name" },
  { key: "phone", label: "Телефон", type: "tel", autoComplete: "tel" },
  { key: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { key: "company", label: "Компания", autoComplete: "organization" },
];

export function CartView({ products, email }: { products: CardProduct[]; email: string }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const { lines, setQty, remove, clear, prune, maxQty } = useCart();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const [customer, setCustomer] = useState<CartCustomer>(EMPTY_CUSTOMER);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setCustomer(loadCustomer()), []);
  useEffect(() => {
    if (hydrated) prune(new Set(byId.keys()));
  }, [hydrated, byId, prune]);

  const items = lines.flatMap((l) => {
    const p = byId.get(l.id);
    return p ? [{ ...l, product: p }] : [];
  });
  const totals = cartTotals(items.map((i) => ({ qty: i.qty, priceRub: i.product.priceRub, priceFrom: i.product.priceFrom })));
  const note = totalsNote(totals);

  const updateCustomer = (key: keyof CartCustomer, value: string) => {
    const next = { ...customer, [key]: value };
    setCustomer(next);
    saveCustomer(next);
  };

  const download = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ id, qty }) => ({ id, qty })), customer }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Не удалось сформировать PDF");
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "laprinta-specification.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сформировать PDF");
    } finally {
      setPending(false);
    }
  };

  if (!hydrated) return <div className="cart-loading" aria-busy="true" />;

  if (!items.length) {
    return (
      <div className="empty">
        <Icon name="cart" size={32} />
        <h2>Корзина пуста</h2>
        <p>Добавляйте модели из каталога кнопкой «В корзину» — затем здесь можно скачать спецификацию для заказа.</p>
        <Link href="/catalog" className="btn btn--primary">
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="cart__main">
        <section aria-labelledby="cart-items-title">
          <div className="cart__bar">
            <h2 id="cart-items-title" className="cart__title">
              {items.length} {plural(items.length, ["позиция", "позиции", "позиций"])}
            </h2>
            <button
              type="button"
              className="cart__clear"
              onClick={() => {
                if (confirm("Очистить корзину?")) clear();
              }}
            >
              <Icon name="trash" size={16} />
              Очистить
            </button>
          </div>
          <ul className="cart-list" role="list">
            {items.map(({ id, qty, product: p }) => {
              const sum = lineSum({ qty, priceRub: p.priceRub, priceFrom: p.priceFrom });
              return (
                <li key={id} className="cart-line">
                  <Link href={`/product/${p.slug}`} className="cart-line__thumb" tabIndex={-1} aria-hidden="true">
                    {p.cover ? <Image src={p.cover.url} alt="" width={88} height={88} sizes="88px" /> : <Icon name="image" size={22} />}
                  </Link>
                  <div className="cart-line__info">
                    <span className="pcard__sku">{p.sku}</span>
                    <Link href={`/product/${p.slug}`} className="cart-line__name">
                      {p.name}
                    </Link>
                    <span className="cart-line__unit">{p.priceRub == null ? p.price : `${p.price} / шт.`}</span>
                  </div>
                  <div className="cart-line__qty">
                    <QtyStepper qty={qty} max={maxQty} name={p.name} onChange={(n) => (n < 1 ? remove(id) : setQty(id, n))} />
                  </div>
                  <div className="cart-line__sum">{sum == null ? "—" : `${p.priceFrom ? "от " : ""}${money(sum)}`}</div>
                  <button type="button" className="cart-line__remove" aria-label={`Удалить «${p.name}» из корзины`} title="Удалить" onClick={() => remove(id)}>
                    <Icon name="close" size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="cart-form" aria-labelledby="cart-form-title">
          <h2 id="cart-form-title" className="cart__title">
            Данные для спецификации
          </h2>
          <p className="cart-form__hint">Необязательно — заполненные поля попадут в PDF. Хранятся только в этом браузере.</p>
          <div className="cart-form__grid">
            {FIELDS.map((f) => (
              <label key={f.key} className="cart-field">
                <span>{f.label}</span>
                <input
                  type={f.type ?? "text"}
                  autoComplete={f.autoComplete}
                  maxLength={CUSTOMER_LIMITS[f.key]}
                  value={customer[f.key]}
                  onChange={(e) => updateCustomer(f.key, e.target.value)}
                />
              </label>
            ))}
            <label className="cart-field cart-field--wide">
              <span>Комментарий</span>
              <textarea
                rows={3}
                maxLength={CUSTOMER_LIMITS.comment}
                value={customer.comment}
                placeholder="Расцветки, сроки, доставка…"
                onChange={(e) => updateCustomer("comment", e.target.value)}
              />
            </label>
          </div>
        </section>
      </div>

      <aside className="cart-summary" aria-label="Итог">
        <dl className="cart-summary__rows">
          <div>
            <dt>Позиций</dt>
            <dd>{items.length}</dd>
          </div>
          <div>
            <dt>Количество</dt>
            <dd>{totals.units} шт.</dd>
          </div>
        </dl>
        <div className="cart-summary__total">
          <span>Итого{totals.approximate ? " (предварительно)" : ""}</span>
          <strong>
            {totals.hasFrom ? "от " : ""}
            {money(totals.total)}
          </strong>
        </div>
        {note && <p className="cart-summary__note">{note}</p>}
        <button type="button" className="btn btn--primary btn--block" onClick={download} disabled={pending}>
          {pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="download" size={18} />}
          {pending ? "Формируем PDF…" : "Скачать спецификацию (PDF)"}
        </button>
        {error && (
          <p className="cart-summary__error" role="alert">
            {error}
          </p>
        )}
        <p className="cart-summary__hint">
          Корзина не оформляет заказ и не требует оплаты. Отправьте спецификацию на{" "}
          <a href={`mailto:${email}?subject=${encodeURIComponent("Спецификация заказа")}`}>{email}</a> — мы подтвердим цены и сроки.
        </p>
      </aside>
    </div>
  );
}
