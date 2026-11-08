"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

/**
 * Forge hero (approved draft). Idle farm glow + mark glow are always on;
 * the cursor spotlight is an additive layer and never replaces them.
 */
export function HomeHero({ seriesHref }: { seriesHref: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = ref.current;
    if (!hero) return;
    let raf = 0;
    let x = 72;
    let y = 58;
    const apply = () => {
      raf = 0;
      hero.style.setProperty("--mx", `${x.toFixed(2)}%`);
      hero.style.setProperty("--my", `${y.toFixed(2)}%`);
    };
    const move = (cx: number, cy: number) => {
      const r = hero.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      x = Math.min(100, Math.max(0, ((cx - r.left) / r.width) * 100));
      y = Math.min(100, Math.max(0, ((cy - r.top) / r.height) * 100));
      hero.classList.add("is-pointer");
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMouse = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY);
    const off = () => hero.classList.remove("is-pointer");

    hero.addEventListener("mousemove", onMouse, { passive: true });
    hero.addEventListener("mouseenter", onMouse, { passive: true });
    hero.addEventListener("mouseleave", off);
    hero.addEventListener("touchstart", onTouch, { passive: true });
    hero.addEventListener("touchmove", onTouch, { passive: true });
    hero.addEventListener("touchend", off, { passive: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (new URLSearchParams(window.location.search).get("demo") === "cursor" && !reduce) {
      hero.classList.add("is-pointer");
      apply();
    }
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("mousemove", onMouse);
      hero.removeEventListener("mouseenter", onMouse);
      hero.removeEventListener("mouseleave", off);
      hero.removeEventListener("touchstart", onTouch);
      hero.removeEventListener("touchmove", onTouch);
      hero.removeEventListener("touchend", off);
    };
  }, []);

  return (
    <section className="hero" ref={ref} aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-farm" />
        <div className="hero-idle-glow" />
        <div className="hero-spot" />
      </div>
      <div className="brand-mark" aria-hidden="true">
        <div className="brand-mark-glow" />
        <svg viewBox="10 -8 40 40" fill="none" overflow="visible">
          <defs>
            {/* LOCKED mark gradient — do not edit */}
            <linearGradient id="metalLevel" gradientUnits="userSpaceOnUse" x1="30" y1="-4" x2="30" y2="27">
              <stop offset="0%" stopColor="#f2ffff" stopOpacity="0.98" />
              <stop offset="28%" stopColor="#6eeff4" stopOpacity="0.88" />
              <stop offset="62%" stopColor="#1299a1" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#041214" stopOpacity="0.18" />
            </linearGradient>
            <radialGradient id="metalRadial" gradientUnits="userSpaceOnUse" cx="30" cy="4" r="18">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="40%" stopColor="#b8fbff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#00e8ef" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="metalSheen" gradientUnits="userSpaceOnUse" x1="6" y1="-10" x2="54" y2="34">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="28%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="42%" stopColor="#eaffff" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="58%" stopColor="#c5fcff" stopOpacity="0.12" />
              <stop offset="72%" stopColor="#00e8ef" stopOpacity="0" />
              <stop offset="100%" stopColor="#00e8ef" stopOpacity="0" />
              <animateTransform attributeName="gradientTransform" type="translate" from="-56 -56" to="56 56" dur="5.6s" repeatCount="indefinite" />
            </linearGradient>
            <mask id="markSilhouette" maskUnits="userSpaceOnUse" x="8" y="-10" width="44" height="44" maskContentUnits="userSpaceOnUse">
              <rect x="8" y="-10" width="44" height="44" fill="#000" />
              <g fill="none" stroke="#fff" strokeLinejoin="round" strokeLinecap="round">
                <g transform="translate(-23.47549,-8.6930421)">
                  <g transform="translate(12.93681,4.1907975)">
                    <path
                      transform="matrix(0.71878205,0,0,0.71878205,6.6901649,12.085315)"
                      strokeWidth="2.78248"
                      d="M 61.359483,25.481389 H 55.887031 32.952078 a 5.0409894,5.0409894 60 0 1 -4.365625,-7.561484 l 2.736226,-4.739283 11.467477,-19.8622519 a 5.0409895,5.0409895 7.0701838e-7 0 1 8.73125,1e-7 l 2.736226,4.7392831 11.467476,19.8622517 a 5.0409895,5.0409895 120 0 1 -4.365625,7.561484 z"
                    />
                    <path
                      transform="matrix(0.22862813,0,0,0.22862813,29.711147,18.10475)"
                      strokeWidth="8.74783"
                      d="M 67.641167,25.481389 H 49.605347 26.670394 A 1.4142577,1.4142577 60 0 1 25.445611,23.360002 L 34.463521,7.7405247 45.930998,-12.121727 a 1.4142577,1.4142577 7.0701843e-7 0 1 2.449566,0 L 57.398474,3.4977509 68.86595,23.360002 a 1.4142577,1.4142577 120 0 1 -1.224783,2.121387 z"
                    />
                    <path strokeWidth="2" d="M 40.219594,15.310243 C 44.29437,8.4572109 44.29437,8.4572109 44.29437,8.4572109" />
                  </g>
                </g>
              </g>
            </mask>
          </defs>
          <g mask="url(#markSilhouette)">
            <rect x="10" y="-8" width="40" height="40" fill="url(#metalLevel)" />
            <rect x="10" y="-8" width="40" height="40" fill="url(#metalRadial)" />
            <rect className="sheen-anim mark-sheen" x="10" y="-8" width="40" height="40" fill="url(#metalSheen)" />
          </g>
        </svg>
      </div>
      <div className="line-tag">аддитивные технологии</div>
      <div className="brand-wrap">
        <h1 className="brand" id="hero-title">
          la<span>printa</span>
        </h1>
      </div>
      <p className="hero-line">{site.positioning}.</p>
      <div className="hero-meta">
        <Link className="cta" href="/catalog">
          Открыть каталог <span aria-hidden="true">→</span>
        </Link>
        <Link className="cta-ghost" href={seriesHref}>
          Смотреть серии
        </Link>
      </div>
    </section>
  );
}
