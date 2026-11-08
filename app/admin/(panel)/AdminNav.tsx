"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const ITEMS = [
  { href: "/admin/products", label: "Товары", icon: "box" as const },
  { href: "/admin/sections", label: "Разделы", icon: "folder" as const },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-nav" aria-label="Админка">
      {ITEMS.map((i) => {
        const active = pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon name={i.icon} size={16} />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
