export const site = {
  name: "laprinta",
  domain: "laprinta.ru",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://laprinta.ru",
  positioning: "Изделия из пластика и термополиуретана изготовленные методом аддитивных технологий",
  // TODO(Greg): подтвердить публичный e-mail для витрины.
  email: "info@laprinta.ru",
  nav: [
    { href: "/catalog", label: "Каталог" },
    { href: "/articles", label: "Статьи" },
    { href: "/about", label: "О компании" },
    { href: "/contacts", label: "Контакты" },
  ],
};

/**
 * Коды символов публичного адреса. Клиентские компоненты собирают из них
 * строку сами, поэтому в HTML и RSC-пейлоаде нет ни адреса, ни `mailto:` —
 * именно по ним работают сборщики почты для спама.
 */
export const emailCodes: number[] = Array.from(site.email).map((c) => c.charCodeAt(0));
