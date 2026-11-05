import type { NextRequest } from "next/server";

import { CACHE_CONTROL, errorResponse, jsonResponse, upstreamErrorResponse } from "@/lib/api/responses";
import { parsePropertySearchParams } from "@/lib/properties/query-params";
import { getDatasetMeta, resolveSearchQuery, searchProperties } from "@/lib/properties/service";
import type { PropertySearchResponse } from "@/types/property";

/**
 * GET /api/properties
 *
 * Listado paginado de propiedades normalizadas. Parámetros admitidos:
 * page, limit (12 | 24 | 48), operation, type, commune, neighborhood ("CC-BB" o slug + commune),
 * stratum (1–6), minPrice, maxPrice, minArea, maxArea, bedrooms, bathrooms, sort.
 *
 * - 200: resultados (datos históricos de agosto de 2023; ver `meta`).
 *   Caché CDN de 24 h solo si la página está en rango y los metadatos están completos.
 * - 400: parámetros inválidos, con el detalle de cada problema.
 * - 502/504: la fuente ArcGIS falló o no respondió a tiempo (`no-store`).
 */
export async function GET(request: NextRequest) {
  const parsed = parsePropertySearchParams(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return errorResponse(400, "INVALID_PARAMS", "Parámetros de búsqueda no válidos", parsed.issues);
  }

  try {
    const resolved = await resolveSearchQuery(parsed.params);
    if (!resolved.ok) {
      return errorResponse(400, "INVALID_PARAMS", "Parámetros de búsqueda no válidos", resolved.issues);
    }
    const { query } = resolved;

    const [result, meta] = await Promise.all([searchProperties(query), getDatasetMeta()]);
    const body: PropertySearchResponse = {
      ...result,
      query: {
        ...query,
        neighborhood: query.neighborhood
          ? `${query.neighborhood.communeCode}-${query.neighborhood.neighborhoodCode}`
          : null,
      },
      meta,
    };
    const cacheable = meta.complete && !result.pagination.pageOutOfRange;
    return jsonResponse(body, cacheable ? CACHE_CONTROL.long : CACHE_CONTROL.short);
  } catch (error) {
    return upstreamErrorResponse(error, "api/properties");
  }
}
