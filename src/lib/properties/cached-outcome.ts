import "server-only";

import { ArcGisError, type ArcGisErrorKind } from "@/lib/arcgis/client";

/**
 * Resultado serializable que cruza la frontera de `use cache`.
 *
 * En producción Next.js oculta los errores lanzados dentro de un ámbito cacheado (llegan
 * como un Error genérico con `digest`). Por eso las funciones cacheadas capturan el
 * `ArcGisError`, lo devuelven como dato con una vida de caché corta (`cacheLife("seconds")`)
 * y `unwrap` lo vuelve a lanzar fuera de la caché, donde la ruta puede distinguir 502/504.
 */
export type CachedOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: { kind: ArcGisErrorKind; message: string } };

/** Perfil de caché para datos completos: revalida cada 24 h (los datos son de agosto de 2023). */
export const DAILY_CACHE_PROFILE = { stale: 3600, revalidate: 86_400, expire: 604_800 } as const;

/** Convierte un error en un resultado fallido; los errores que no son de ArcGIS se relanzan. */
export function toFailure(error: unknown): { ok: false; error: { kind: ArcGisErrorKind; message: string } } {
  if (!(error instanceof ArcGisError)) throw error;
  return { ok: false, error: { kind: error.kind, message: error.message } };
}

export function unwrap<T>(outcome: CachedOutcome<T>): T {
  if (outcome.ok) return outcome.value;
  throw new ArcGisError(outcome.error.kind, outcome.error.message);
}
