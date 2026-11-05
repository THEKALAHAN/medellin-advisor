import type { NextRequest } from "next/server";

import { CACHE_CONTROL, errorResponse, jsonResponse, upstreamErrorResponse } from "@/lib/api/responses";
import { getPropertyFacets } from "@/lib/properties/facets";
import { getDatasetMeta } from "@/lib/properties/service";
import type { PropertyFacetsResponse } from "@/types/property";

/**
 * GET /api/properties/facets
 *
 * Opciones para construir los filtros: comunas, barrios (código + slug), tipos por operación,
 * estratos 1–6, rangos de precio y área, con conteos por operación. Aplica la misma política
 * de calidad que /api/properties. No admite parámetros.
 *
 * Los Server Components deben llamar directamente a `getPropertyFacets()` en lugar de usar esta ruta.
 */
export async function GET(request: NextRequest) {
  const params = [...new Set(request.nextUrl.searchParams.keys())];
  if (params.length > 0) {
    return errorResponse(
      400,
      "INVALID_PARAMS",
      "Este endpoint no admite parámetros",
      params.map((param) => ({ param, message: "Parámetro no admitido" })),
    );
  }

  try {
    const [data, meta] = await Promise.all([getPropertyFacets(), getDatasetMeta()]);
    const body: PropertyFacetsResponse = { data, meta };
    return jsonResponse(body, meta.complete ? CACHE_CONTROL.long : CACHE_CONTROL.short);
  } catch (error) {
    return upstreamErrorResponse(error, "api/properties/facets");
  }
}
