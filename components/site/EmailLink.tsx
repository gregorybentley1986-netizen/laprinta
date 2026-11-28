"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { emailCodes } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";

/** Копирование с запасным путём: Clipboard API требует разрешения и https. */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* нет разрешения или небезопасный контекст — ниже запасной путь */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Публичный адрес почты без утечки в разметку: строка собирается в браузере
 * из кодов символов, в HTML стоит перевёрнутая копия под CSS `direction: rtl`,
 * а `mailto:` появляется только при наведении, фокусе или клике. Сборщики
 * адресов (в том числе роботы, исполняющие JS) не видят ни адреса, ни ссылки.
 */
export function EmailLink({
  subject,
  label,
  className,
  copy,
  icon,
}: {
  subject?: string;
  /** Текст ссылки; если не задан — показывается сам адрес. */
  label?: ReactNode;
  className?: string;
  /** Кнопка «скопировать адрес» — по умолчанию есть, если показан сам адрес. */
  copy?: boolean;
  icon?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const address = String.fromCharCode(...emailCodes);
  const mailto = `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  const reversed = address.split("").reverse().join("");
  const showCopy = copy ?? !label;

  const copyAddress = async () => {
    const ok = await writeClipboard(address);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="email-link">
      <a
        className={className}
        // Ссылка «заряжается» только при наведении/фокусе/клике: робот, который
        // просто исполняет JS страницы (как Googlebot), mailto в разметке не увидит.
        href={armed ? mailto : undefined}
        role="link"
        tabIndex={0}
        rel="nofollow"
        aria-label={label ? undefined : "Написать письмо"}
        onPointerEnter={() => setArmed(true)}
        onFocus={() => setArmed(true)}
        onClick={(e) => {
          if (armed) return;
          e.preventDefault();
          setArmed(true);
          window.location.href = mailto;
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          setArmed(true);
          window.location.href = mailto;
        }}
      >
        {icon}
        {label ?? <span className="email-rev">{reversed}</span>}
      </a>
      {showCopy && (
        <button type="button" className="email-copy" onClick={copyAddress} aria-label="Скопировать адрес почты" title="Скопировать адрес">
          <Icon name={copied ? "check" : "copy"} size={14} />
        </button>
      )}
      <span className="sr-only" role="status">
        {copied ? "Адрес скопирован" : ""}
      </span>
    </span>
  );
}
