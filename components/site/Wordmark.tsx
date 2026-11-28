import Link from "next/link";

/** The `laprinta` wordmark — the only place Arista Pro is used. */
export function Wordmark({ href = "/", className = "" }: { href?: string | null; className?: string }) {
  const mark = (
    <>
      la<span>printa</span>
    </>
  );
  if (!href) return <span className={`wordmark ${className}`}>{mark}</span>;
  return (
    <Link href={href} className={`wordmark ${className}`} aria-label="laprinta — на главную">
      {mark}
    </Link>
  );
}
