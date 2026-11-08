"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { Icon } from "@/components/ui/Icon";

type Props = { id: string; name: string; variant?: "card" | "buybox" };

export function CartButton({ id, name, variant = "card" }: Props) {
  const { qtyOf, add, setQty, remove, maxQty } = useCart();
  const qty = qtyOf(id);

  if (variant === "buybox") {
    if (!qty) {
      return (
        <button type="button" className="btn btn--primary" onClick={() => add(id)}>
          <Icon name="cart" size={18} />В корзину
        </button>
      );
    }
    return (
      <div className="buy-incart">
        <QtyStepper qty={qty} max={maxQty} name={name} onChange={(n) => (n < 1 ? remove(id) : setQty(id, n))} />
        <Link href="/cart" className="btn btn--primary">
          <Icon name="check" size={18} />В корзине
        </Link>
      </div>
    );
  }

  if (qty) {
    return (
      <Link href="/cart" className="cart-chip is-on" aria-label={`«${name}» в корзине: ${qty} шт. Перейти в корзину`}>
        <Icon name="check" size={16} />
        <span className="cart-chip__label">В корзине</span>
      </Link>
    );
  }
  return (
    <button type="button" className="cart-chip" aria-label={`Добавить «${name}» в корзину`} onClick={() => add(id)}>
      <Icon name="cart" size={16} />
      <span className="cart-chip__label">В корзину</span>
    </button>
  );
}

export function QtyStepper({ qty, max, name, onChange }: { qty: number; max: number; name: string; onChange: (n: number) => void }) {
  return (
    <div className="qty" role="group" aria-label={`Количество «${name}»`}>
      <button type="button" className="qty__btn" aria-label="Уменьшить" onClick={() => onChange(qty - 1)}>
        <Icon name="minus" size={16} />
      </button>
      <input
        className="qty__input"
        inputMode="numeric"
        aria-label="Количество, шт."
        value={qty}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (Number.isFinite(n) && n > 0) onChange(Math.min(n, max));
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="qty__btn" aria-label="Увеличить" disabled={qty >= max} onClick={() => onChange(qty + 1)}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
