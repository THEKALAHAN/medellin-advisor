import Link from "next/link";

/**
 * Logotipo tipográfico con un arco arquitectónico como recurso de identidad.
 * `tone="light"` para fondos verde profundo.
 */
export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const text = tone === "dark" ? "text-forest" : "text-ivory";
  return (
    <Link
      href="/"
      className={`group inline-flex min-h-11 items-center gap-3 ${text}`}
      aria-label="Medellin Advisors, ir al inicio"
    >
      <ArchMark className="h-9 w-7 shrink-0 text-champagne transition-transform duration-500 group-hover:-translate-y-0.5" />
      <span className="flex flex-col leading-none">
        <span className="font-serif text-[1.55rem] font-medium tracking-[0.01em]">Medellin</span>
        {/* Espacio para que el texto visible sea «Medellin Advisors» (coincide con el nombre accesible). */}{" "}
        <span className="mt-1 text-[0.6875rem] font-semibold tracking-[0.38em] uppercase opacity-80">
          Advisors
        </span>
      </span>
    </Link>
  );
}

/** Arco de medio punto con pilastras: el recurso gráfico de la marca. */
export function ArchMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 36" fill="none" className={className} aria-hidden="true" focusable="false">
      <path d="M3 35V14a11 11 0 0 1 22 0v21" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 35V15a6 6 0 0 1 12 0v20" stroke="currentColor" strokeWidth="1" opacity=".7" />
      <path d="M1 35h26" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
