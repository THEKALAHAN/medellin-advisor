import "server-only";

import { ArcGisError } from "@/lib/arcgis/client";

/**
 * Políticas de caché HTTP para el CDN.
 *
 * - LONG: datos completos. 24 h en el CDN y una semana de stale-while-revalidate.
 * - SHORT: respuestas válidas pero provisionales (metadatos incompletos, página fuera de rango).
 * - Errores: `no-store`.
 *
 * El CDN debe usar la URL completa, incluida la query string, como clave de caché. Esto
 * NO está verificado todavía: debe comprobarse en Vercel tras el primer despliegue (ver CLAUDE.md).
 */
export const CACHE_CONTROL = {
  long: "public, s-maxage=86400, stale-while-revalidate=604800",
  short: "public, s-maxage=60, stale-while-revalidate=60",
  none: "no-store",
} as const;

export function jsonResponse(body: unknown, cacheControl: string, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": cacheControl } });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return jsonResponse(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    CACHE_CONTROL.none,
    status,
  );
}

/** Traduce errores del proveedor a respuestas 502/504; cualquier otro error es 500. */
export function upstreamErrorResponse(error: unknown, context: string): Response {
  if (error instanceof ArcGisError) {
    console.error(`[${context}] ${error.kind}: ${error.message}`);
    return error.kind === "timeout"
      ? errorResponse(504, "UPSTREAM_TIMEOUT", "La fuente de datos no respondió a tiempo")
      : errorResponse(502, "UPSTREAM_ERROR", "La fuente de datos no está disponible");
  }
  console.error(`[${context}] Error inesperado`, error);
  return errorResponse(500, "INTERNAL_ERROR", "Error interno del servidor");
}
