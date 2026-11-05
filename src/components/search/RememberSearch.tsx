"use client";

import { useEffect } from "react";

export const LAST_SEARCH_KEY = "ma:last-search";
export const DETAIL_ORIGIN_KEY = "ma:detail-origin";

/** Origen de la navegación hacia una ficha, para poder regresar con `router.back()`. */
export interface DetailOrigin {
  /** URL del listado (con filtros, página y orden). */
  from: string;
  /** Ruta de la ficha abierta. */
  to: string;
  /** Longitud del historial que tendrá la pestaña al abrir la ficha. */
  historyLength: number;
}

/** Solo se aceptan URLs del propio listado (evita redirecciones a otros destinos). */
export function isResultsUrl(value: unknown): value is string {
  return typeof value === "string" && /^\/propiedades(\?[^#]*)?$/.test(value);
}

/**
 * Registra que se abre una ficha desde el listado. Se llama en la fase de captura del clic,
 * antes de que el enlace navegue (la entrada nueva del historial aún no existe).
 */
export function recordDetailOrigin(detailPath: string) {
  try {
    const origin: DetailOrigin = {
      from: window.location.pathname + window.location.search,
      to: detailPath,
      historyLength: window.history.length + 1,
    };
    sessionStorage.setItem(DETAIL_ORIGIN_KEY, JSON.stringify(origin));
  } catch {
    // Almacenamiento no disponible: el regreso usará el enlace de respaldo.
  }
}

/**
 * Guarda en la sesión del navegador la URL de la búsqueda actual para que la ficha individual
 * pueda ofrecer «Volver a los resultados» con los mismos filtros. No renderiza nada.
 */
export function RememberSearch({ query }: { query: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_SEARCH_KEY, query ? `/propiedades?${query}` : "/propiedades");
    } catch {
      // Almacenamiento no disponible (modo privado, bloqueo de cookies): se usa el enlace genérico.
    }
  }, [query]);
  return null;
}
