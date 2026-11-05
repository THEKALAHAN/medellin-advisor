"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { IconClose, IconMenu } from "@/components/ui/icons";

interface NavItem {
  href: string;
  label: string;
}

/**
 * Menú compacto para móvil y tablet pequeña.
 * Base: <details>/<summary> (funciona sin JavaScript y es operable con teclado).
 * Mejora progresiva: se cierra con Escape, al pulsar fuera y al elegir un enlace.
 */
export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;

    const close = (returnFocus: boolean) => {
      if (!details.open) return;
      details.open = false;
      if (returnFocus) details.querySelector("summary")?.focus();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.contains(event.target)) close(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <details ref={ref} className="group md:hidden">
      <summary
        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 border border-forest/20 px-3 text-forest transition-colors hover:border-forest"
        aria-label="Abrir menú de navegación"
      >
        <IconMenu className="group-open:hidden" />
        <IconClose className="hidden group-open:block" />
        <span className="text-xs font-semibold tracking-[0.16em] uppercase">Menú</span>
      </summary>

      <nav
        aria-label="Principal (móvil)"
        className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-[0_24px_40px_-24px_rgba(23,45,37,0.35)]"
      >
        <ul className="container-editorial flex flex-col py-3">
          {items.map((item) => (
            <li key={item.href} className="border-b border-line/70 last:border-b-0">
              <Link
                href={item.href}
                onClick={() => {
                  if (ref.current) ref.current.open = false;
                }}
                className="flex min-h-12 items-center justify-between font-serif text-[1.4rem] text-forest"
              >
                {item.label}
                <span className="rule-gold w-6" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
