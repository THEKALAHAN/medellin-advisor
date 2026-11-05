"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, type MouseEvent } from "react";

import {
  DETAIL_ORIGIN_KEY,
  LAST_SEARCH_KEY,
  isResultsUrl,
  type DetailOrigin,
} from "@/components/search/RememberSearch";
import { IconChevronLeft } from "@/components/ui/icons";

const FALLBACK = "/propiedades";

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseOrigin(raw: string | null): DetailOrigin | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DetailOrigin>;
    return isResultsUrl(value.from) && typeof value.to === "string" && typeof value.historyLength === "number"
      ? (value as DetailOrigin)
      : null;
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};
const readLastSearch = () => readSession(LAST_SEARCH_KEY);
const readOrigin = () => readSession(DETAIL_ORIGIN_KEY);

/**
 * «Volver a los resultados».
 * - Si la ficha se abrió desde el listado en esta pestaña y la entrada anterior del historial es
 *   ese listado, usa `router.back()`: sin recarga, conserva filtros, página, orden y la posición
 *   de desplazamiento (la página sigue preservada por Next.js).
 * - En cualquier otro caso (enlace compartido, nueva pestaña, navegación intermedia) navega al
 *   último listado de la sesión o, si no existe, a /propiedades. Nunca depende solo del historial.
 * - Sin JavaScript es un enlace normal.
 */
export function BackToResults() {
  const router = useRouter();
  const pathname = usePathname();
  const lastSearchRaw = useSyncExternalStore(noopSubscribe, readLastSearch, () => null);
  const originRaw = useSyncExternalStore(noopSubscribe, readOrigin, () => null);

  const origin = parseOrigin(originRaw);
  const cameFromResults = origin !== null && origin.to === pathname;
  const lastSearch = isResultsUrl(lastSearchRaw) ? lastSearchRaw : null;
  const href = cameFromResults ? origin.from : (lastSearch ?? FALLBACK);
  const label = href !== FALLBACK || cameFromResults ? "Volver a los resultados" : "Ver todas las propiedades";

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    // Solo si el historial no cambió desde que se abrió la ficha: la entrada anterior es el listado.
    if (cameFromResults && window.history.length === origin.historyLength) {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-forest underline-offset-4 hover:underline"
    >
      <IconChevronLeft size={18} />
      {label}
    </Link>
  );
}
