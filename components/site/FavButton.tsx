"use client";

import { useFavorites } from "@/lib/favorites";
import { Icon } from "@/components/ui/Icon";

type Props = { slug: string; name: string; variant?: "icon" | "button" };

export function FavButton({ slug, name, variant = "icon" }: Props) {
  const { has, toggle } = useFavorites();
  const on = has(slug);
  const label = on ? `Убрать «${name}» из избранного` : `Добавить «${name}» в избранное`;

  if (variant === "button") {
    return (
      <button type="button" className={`btn btn--outline-ink fav-cta${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => toggle(slug)}>
        <Icon name="heart" size={18} />
        {on ? "В избранном" : "В избранное"}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`fav-btn${on ? " is-on" : ""}`}
      aria-pressed={on}
      aria-label={label}
      title={on ? "В избранном" : "В избранное"}
      onClick={() => toggle(slug)}
    >
      <Icon name="heart" size={16} />
    </button>
  );
}
