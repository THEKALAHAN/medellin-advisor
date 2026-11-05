import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { ArcGisError, queryCount, queryFeatures, queryStatistics } from "@/lib/arcgis/client";
import {
  ARCGIS_LAYER_URL,
  PROPERTY_AMENITY_FIELDS,
  PROPERTY_DETAIL_FIELDS,
  PROPERTY_LIST_FIELDS,
} from "@/lib/arcgis/config";
import type {
  CountedRule,
  DatasetMeta,
  Property,
  PropertyDetail,
  PropertySearchQuery,
  PropertySearchResult,
} from "@/types/property";

import { DAILY_CACHE_PROFILE, toFailure, unwrap, type CachedOutcome } from "./cached-outcome";
import { SORTS } from "./catalog";
import {
  DATA_DISCLAIMER,
  DATA_PERIOD,
  DATA_POLICY_WHERE,
  EXCLUSION_RULES,
  QUALITY_FLAG_RULES,
} from "./data-policy";
import { resolveNeighborhoodSlug } from "./facets";
import { normalizeProperty, normalizePropertyDetail } from "./normalize";
import { parsePropertyId, type ParamIssue, type ParsedSearchParams } from "./query-params";
import { buildWhereClause } from "./where-clause";

/** Etiqueta de caché común para poder invalidar todos los datos de ArcGIS a la vez. */
export const ARCGIS_CACHE_TAG = "arcgis-properties";

// ---------------------------------------------------------------- resolución de parámetros

export type ResolveResult =
  | { ok: true; query: PropertySearchQuery }
  | { ok: false; issues: ParamIssue[] };

/**
 * Convierte los parámetros validados en una consulta ejecutable.
 * Un barrio indicado por slug se resuelve a `codigo_comuna` + `codigo_barrio` con las facetas
 * (cacheadas). Puede lanzar ArcGisError si las facetas no están disponibles.
 */
export async function resolveSearchQuery(params: ParsedSearchParams): Promise<ResolveResult> {
  const { neighborhood, ...rest } = params;
  if (neighborhood === null) return { ok: true, query: { ...rest, neighborhood: null } };
  if (neighborhood.kind === "id") {
    return {
      ok: true,
      query: {
        ...rest,
        neighborhood: {
          communeCode: neighborhood.communeCode,
          neighborhoodCode: neighborhood.neighborhoodCode,
        },
      },
    };
  }
  const resolved = await resolveNeighborhoodSlug(neighborhood.communeCode, neighborhood.slug);
  if (!resolved) {
    return {
      ok: false,
      issues: [{ param: "neighborhood", message: "No existe un barrio con ese slug en la comuna indicada" }],
    };
  }
  return { ok: true, query: { ...rest, neighborhood: resolved } };
}

// ---------------------------------------------------------------- búsqueda

/**
 * Busca propiedades con filtros, orden y paginación en el servidor de ArcGIS.
 *
 * Caché: `use cache` + `cacheLife` (Next.js 16 con Cache Components). La consulta resuelta
 * forma parte de la clave, por lo que filtros distintos producen entradas distintas.
 * - Página válida: 24 h.
 * - Página fuera de rango: perfil `minutes` (no se fija una respuesta vacía durante 24 h).
 * - Fallo de ArcGIS: perfil `seconds`.
 */
export async function searchProperties(query: PropertySearchQuery): Promise<PropertySearchResult> {
  return unwrap(await fetchPropertyPage(query));
}

async function fetchPropertyPage(
  query: PropertySearchQuery,
): Promise<CachedOutcome<PropertySearchResult>> {
  "use cache";
  cacheTag(ARCGIS_CACHE_TAG);
  try {
    const value = await loadPropertyPage(query);
    if (value.pagination.pageOutOfRange) cacheLife("minutes");
    else cacheLife(DAILY_CACHE_PROFILE);
    return { ok: true, value };
  } catch (error) {
    const failure = toFailure(error);
    cacheLife("seconds");
    return failure;
  }
}

async function loadPropertyPage(query: PropertySearchQuery): Promise<PropertySearchResult> {
  const where = buildWhereClause(query);
  const offset = (query.page - 1) * query.limit;

  // Conteo y página en paralelo: en el caso habitual (página válida) ahorra un viaje de ida y vuelta.
  const [total, features] = await Promise.all([
    queryCount(where),
    queryFeatures({
      where,
      outFields: PROPERTY_LIST_FIELDS.join(","),
      orderByFields: SORTS[query.sort],
      resultOffset: offset,
      resultRecordCount: query.limit,
      returnGeometry: true,
    }),
  ]);

  const totalPages = Math.ceil(total / query.limit);
  // Sin resultados solo existe la página 1 (vacía); cualquier otra está fuera de rango.
  const pageOutOfRange = query.page > Math.max(totalPages, 1);

  const data: Property[] = [];
  let invalidRecordsSkipped = 0;
  if (!pageOutOfRange) {
    for (const feature of features) {
      const property = normalizeProperty(feature);
      if (property) data.push(property);
      else invalidRecordsSkipped += 1;
    }
  }
  if (invalidRecordsSkipped > 0) {
    console.warn(`[properties] ${invalidRecordsSkipped} registros descartados por esquema inválido`);
  }

  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasPreviousPage: !pageOutOfRange && query.page > 1,
      hasNextPage: !pageOutOfRange && query.page < totalPages,
      pageOutOfRange,
    },
    invalidRecordsSkipped,
  };
}

// ---------------------------------------------------------------- ficha individual

/**
 * Recupera una propiedad por su `objectid` (identificador único de la capa, verificado:
 * 28.425 valores distintos y sin nulos).
 *
 * - Consulta individual: `objectid = N AND (política de calidad)`, `resultRecordCount = 1`.
 *   La política es la misma cláusula DATA_POLICY_WHERE del listado (no se duplican reglas):
 *   un registro excluido devuelve null, igual que uno inexistente.
 * - `id` debe venir validado con `parsePropertyId`; se vuelve a comprobar aquí por seguridad.
 * - Caché y errores: mismo patrón que `searchProperties` (24 h; fallos con perfil `seconds`).
 *   Un «no encontrado» también se cachea 24 h: los datos de la capa no cambian.
 */
export async function getPropertyById(id: number): Promise<PropertyDetail | null> {
  if (parsePropertyId(String(id)) === null) return null;
  return unwrap(await fetchPropertyById(id));
}

async function fetchPropertyById(id: number): Promise<CachedOutcome<PropertyDetail | null>> {
  "use cache";
  cacheTag(ARCGIS_CACHE_TAG);
  try {
    const features = await queryFeatures({
      where: `objectid = ${id} AND (${DATA_POLICY_WHERE})`,
      outFields: PROPERTY_DETAIL_FIELDS.join(","),
      resultRecordCount: 1,
      returnGeometry: true,
    });
    const value = features.length > 0 ? normalizePropertyDetail(features[0], PROPERTY_AMENITY_FIELDS) : null;
    if (features.length > 0 && value === null) {
      console.warn(`[properties] objectid ${id} descartado por esquema inválido`);
    }
    cacheLife(DAILY_CACHE_PROFILE);
    return { ok: true, value };
  } catch (error) {
    const failure = toFailure(error);
    cacheLife("seconds");
    return failure;
  }
}

// ---------------------------------------------------------------- metadatos y conteos

interface PolicyCounts {
  total: number;
  included: number;
  rules: Record<string, number>;
  flags: Record<string, number>;
}

/**
 * Todos los conteos de la política en UNA consulta estadística (SUM de CASE por regla).
 * Las condiciones son las mismas que usa DATA_POLICY_WHERE, así que las cifras son coherentes.
 */
async function getPolicyCounts(): Promise<CachedOutcome<PolicyCounts>> {
  "use cache";
  cacheTag(ARCGIS_CACHE_TAG);
  try {
    const sumWhen = (condition: string, alias: string) => ({
      statisticType: "sum" as const,
      onStatisticField: `CASE WHEN ${condition} THEN 1 ELSE 0 END`,
      outStatisticFieldName: alias,
    });
    const [row] = await queryStatistics("1=1", [
      { statisticType: "count", onStatisticField: "objectid", outStatisticFieldName: "total" },
      sumWhen(DATA_POLICY_WHERE, "included"),
      ...EXCLUSION_RULES.map((rule, i) => sumWhen(`(${rule.violation})`, `rule_${i}`)),
      ...QUALITY_FLAG_RULES.map((flag, i) =>
        sumWhen(`(${DATA_POLICY_WHERE}) AND (${flag.condition})`, `flag_${i}`),
      ),
    ]);
    const read = (alias: string): number => {
      const value = row?.[alias];
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        throw new ArcGisError("invalid_response", `Conteo inválido: ${alias}`);
      }
      return value;
    };
    const value: PolicyCounts = {
      total: read("total"),
      included: read("included"),
      rules: Object.fromEntries(EXCLUSION_RULES.map((r, i) => [r.id, read(`rule_${i}`)])),
      flags: Object.fromEntries(QUALITY_FLAG_RULES.map((f, i) => [f.id, read(`flag_${i}`)])),
    };
    cacheLife(DAILY_CACHE_PROFILE);
    return { ok: true, value };
  } catch (error) {
    const failure = toFailure(error);
    cacheLife("seconds");
    return failure;
  }
}

/**
 * Metadatos de la fuente y de la política de calidad.
 * Si los conteos fallan, se devuelven `null` (nunca cifras inventadas) y `complete: false`,
 * para que la ruta no envíe una caché CDN de 24 h.
 */
export async function getDatasetMeta(): Promise<DatasetMeta> {
  const outcome = await getPolicyCounts();
  const counts = outcome.ok ? outcome.value : null;
  if (!outcome.ok) {
    console.error(`[properties] Conteos de la política no disponibles: ${outcome.error.message}`);
  }

  const rules: CountedRule[] = EXCLUSION_RULES.map((r) => ({
    id: r.id,
    description: r.description,
    records: counts?.rules[r.id] ?? null,
  }));
  const qualityFlags: CountedRule[] = QUALITY_FLAG_RULES.map((f) => ({
    id: f.id,
    description: f.description,
    records: counts?.flags[f.id] ?? null,
  }));

  return {
    source: {
      name: "Oferta comercial de vivienda – Investigaciones Internet (OIME)",
      publisher: "Alcaldía de Medellín",
      url: ARCGIS_LAYER_URL,
    },
    dataPeriod: DATA_PERIOD,
    disclaimer: DATA_DISCLAIMER,
    exclusionPolicy: {
      rules,
      excludedRecords: counts ? counts.total - counts.included : null,
      totalRecords: counts?.total ?? null,
      includedRecords: counts?.included ?? null,
    },
    qualityFlags,
    complete: counts !== null,
  };
}
