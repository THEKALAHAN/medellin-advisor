import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { ArcGisError, queryStatistics, type StatisticDefinition } from "@/lib/arcgis/client";
import type {
  FacetCounts,
  NeighborhoodId,
  NumericRange,
  OperationCode,
  PropertyFacets,
  PropertyTypeCode,
} from "@/types/property";

import { DAILY_CACHE_PROFILE, toFailure, unwrap, type CachedOutcome } from "./cached-outcome";
import {
  AREA_KNOWN_SQL,
  FILTER_STRATA,
  OPERATIONS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_CODES,
  findCommuneByCode,
} from "./catalog";
import { DATA_POLICY_WHERE } from "./data-policy";
import { cleanText, slugify } from "./slug";

export const FACETS_CACHE_TAG = "arcgis-facets";

/**
 * Facetas para construir los filtros (comunas, barrios, tipos, estratos y rangos).
 *
 * - Usa la misma política de calidad que el listado (DATA_POLICY_WHERE): solo cuenta registros
 *   que pueden aparecer en los resultados.
 * - 4 consultas estadísticas de ArcGIS (groupBy); nunca descarga registros.
 * - Todo o nada: si una consulta falla, se lanza un ArcGisError (sin facetas parciales).
 * - Los conteos se desglosan por operación; no son facetas cruzadas con otros filtros.
 */
export async function getPropertyFacets(): Promise<PropertyFacets> {
  return unwrap(await fetchFacets());
}

/** Resuelve un slug de barrio dentro de una comuna a sus códigos. null si no existe. */
export async function resolveNeighborhoodSlug(
  communeCode: string,
  slug: string,
): Promise<NeighborhoodId | null> {
  const facets = await getPropertyFacets();
  const match = facets.neighborhoods.find((n) => n.communeCode === communeCode && n.slug === slug);
  return match ? { communeCode: match.communeCode, neighborhoodCode: match.neighborhoodCode } : null;
}

async function fetchFacets(): Promise<CachedOutcome<PropertyFacets>> {
  "use cache";
  cacheTag(FACETS_CACHE_TAG);
  try {
    const value = await loadFacets();
    cacheLife(DAILY_CACHE_PROFILE);
    return { ok: true, value };
  } catch (error) {
    const failure = toFailure(error);
    cacheLife("seconds");
    return failure;
  }
}

// ---------------------------------------------------------------- lectura de filas

function invalid(message: string): never {
  throw new ArcGisError("invalid_response", `Facetas: ${message}`);
}

function readCount(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    invalid(`conteo inválido en «${field}»`);
  }
  return value;
}

function readNumberOrNull(row: Record<string, unknown>, field: string): number | null {
  const value = row[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) invalid(`valor inválido en «${field}»`);
  return value;
}

function readText(row: Record<string, unknown>, field: string): string | null {
  const value = row[field];
  if (typeof value !== "string") return null;
  const cleaned = cleanText(value);
  return cleaned === "" ? null : cleaned;
}

function readOperation(row: Record<string, unknown>): OperationCode {
  const value = row.commercial_type;
  if (value !== "SELL" && value !== "RENT") invalid("operación desconocida");
  return value;
}

function emptyCounts(): FacetCounts {
  return { total: 0, SELL: 0, RENT: 0 };
}

function addCount(counts: FacetCounts, operation: OperationCode, n: number): void {
  counts[operation] += n;
  counts.total += n;
}

const COUNT: StatisticDefinition = {
  statisticType: "count",
  onStatisticField: "objectid",
  outStatisticFieldName: "n",
};

// ---------------------------------------------------------------- construcción

async function loadFacets(): Promise<PropertyFacets> {
  const knownArea = `CASE WHEN ${AREA_KNOWN_SQL} THEN private_area_m2 END`;
  const [locationRows, typeRows, strataRows, rangeRows] = await Promise.all([
    queryStatistics(DATA_POLICY_WHERE, [COUNT], [
      "codigo_comuna",
      "commune_calculated",
      "codigo_barrio",
      "neighborhood_calculated",
      "commercial_type",
    ]),
    queryStatistics(DATA_POLICY_WHERE, [COUNT], ["type", "tipo_inmueble", "commercial_type"]),
    queryStatistics(DATA_POLICY_WHERE, [COUNT], ["stratum", "commercial_type"]),
    queryStatistics(
      DATA_POLICY_WHERE,
      [
        COUNT,
        { statisticType: "min", onStatisticField: "price", outStatisticFieldName: "min_price" },
        { statisticType: "max", onStatisticField: "price", outStatisticFieldName: "max_price" },
        { statisticType: "min", onStatisticField: knownArea, outStatisticFieldName: "min_area" },
        { statisticType: "max", onStatisticField: knownArea, outStatisticFieldName: "max_area" },
      ],
      ["commercial_type"],
    ),
  ]);

  // Totales y rangos por operación.
  const totals = emptyCounts();
  const emptyRange = (): NumericRange => ({ min: null, max: null });
  const priceRange: Record<OperationCode, NumericRange> = { SELL: emptyRange(), RENT: emptyRange() };
  const areaRange: Record<OperationCode, NumericRange> = { SELL: emptyRange(), RENT: emptyRange() };
  for (const row of rangeRows) {
    const operation = readOperation(row);
    addCount(totals, operation, readCount(row, "n"));
    priceRange[operation] = {
      min: readNumberOrNull(row, "min_price"),
      max: readNumberOrNull(row, "max_price"),
    };
    const minArea = readNumberOrNull(row, "min_area");
    const maxArea = readNumberOrNull(row, "max_area");
    areaRange[operation] = {
      min: minArea === null ? null : Math.round(minArea * 100) / 100,
      max: maxArea === null ? null : Math.round(maxArea * 100) / 100,
    };
  }

  // Tipos de inmueble.
  const typeSlugs = new Map<PropertyTypeCode, string>(
    Object.entries(PROPERTY_TYPES).map(([slug, code]) => [code, slug]),
  );
  const types = new Map<PropertyTypeCode, { label: string; counts: FacetCounts }>();
  for (const row of typeRows) {
    const code = row.type;
    if (typeof code !== "string" || !(PROPERTY_TYPE_CODES as readonly string[]).includes(code)) {
      invalid("tipo de inmueble desconocido");
    }
    const typeCode = code as PropertyTypeCode;
    const entry = types.get(typeCode) ?? {
      label: readText(row, "tipo_inmueble") ?? typeCode,
      counts: emptyCounts(),
    };
    addCount(entry.counts, readOperation(row), readCount(row, "n"));
    types.set(typeCode, entry);
  }

  // Estratos: 1–6 como filtro; 0, 7 y nulo se cuentan aparte (no se interpretan).
  const strata = new Map<number, FacetCounts>(FILTER_STRATA.map((s) => [s, emptyCounts()]));
  const strataOutsideFilter = emptyCounts();
  for (const row of strataRows) {
    const value = readNumberOrNull(row, "stratum");
    const target = value !== null ? strata.get(value) : undefined;
    addCount(target ?? strataOutsideFilter, readOperation(row), readCount(row, "n"));
  }

  // Comunas y barrios, identificados por códigos.
  const communes = new Map<string, { sourceName: string; counts: FacetCounts }>();
  const neighborhoods = new Map<
    string,
    { communeCode: string; neighborhoodCode: string; name: string; counts: FacetCounts }
  >();
  const withoutLocation = emptyCounts();
  for (const row of locationRows) {
    const operation = readOperation(row);
    const n = readCount(row, "n");
    const communeCode = readText(row, "codigo_comuna");
    if (communeCode === null) {
      addCount(withoutLocation, operation, n);
      continue;
    }
    const commune = communes.get(communeCode) ?? {
      sourceName: readText(row, "commune_calculated") ?? communeCode,
      counts: emptyCounts(),
    };
    addCount(commune.counts, operation, n);
    communes.set(communeCode, commune);

    const neighborhoodCode = readText(row, "codigo_barrio");
    if (neighborhoodCode === null) continue;
    const id = `${communeCode}-${neighborhoodCode}`;
    const neighborhood = neighborhoods.get(id) ?? {
      communeCode,
      neighborhoodCode,
      // Sin nombre en la fuente: se muestra el identificador, nunca un nombre inventado.
      name: readText(row, "neighborhood_calculated") ?? id,
      counts: emptyCounts(),
    };
    addCount(neighborhood.counts, operation, n);
    neighborhoods.set(id, neighborhood);
  }

  const collator = new Intl.Collator("es", { sensitivity: "base" });

  const communeList = [...communes].map(([code, c]) => {
    const known = findCommuneByCode(code);
    if (!known) console.warn(`[facets] codigo_comuna «${code}» no está en la lista blanca`);
    return {
      code,
      slug: known?.slug ?? slugify(c.sourceName),
      name: known?.name ?? c.sourceName,
      sourceName: c.sourceName,
      counts: c.counts,
    };
  });
  communeList.sort((a, b) => collator.compare(a.name, b.name));
  const communeSlugByCode = new Map(communeList.map((c) => [c.code, c.slug]));

  // Slug único dentro de cada comuna; si dos nombres producen el mismo slug, se añade el código.
  const slugUse = new Map<string, number>();
  for (const n of neighborhoods.values()) {
    const key = `${n.communeCode}|${slugify(n.name)}`;
    slugUse.set(key, (slugUse.get(key) ?? 0) + 1);
  }
  const neighborhoodList = [...neighborhoods].map(([id, n]) => {
    const base = slugify(n.name) || n.neighborhoodCode;
    const collides = (slugUse.get(`${n.communeCode}|${slugify(n.name)}`) ?? 0) > 1;
    return {
      id,
      communeCode: n.communeCode,
      neighborhoodCode: n.neighborhoodCode,
      communeSlug: communeSlugByCode.get(n.communeCode) ?? n.communeCode,
      name: n.name,
      slug: collides ? `${base}-${n.neighborhoodCode}` : base,
      counts: n.counts,
    };
  });
  neighborhoodList.sort(
    (a, b) => collator.compare(a.communeSlug, b.communeSlug) || collator.compare(a.name, b.name),
  );

  return {
    totals,
    operations: Object.entries(OPERATIONS).map(([slug, op]) => ({
      slug,
      code: op.code,
      label: op.label,
      count: totals[op.code],
    })),
    types: [...types]
      .map(([code, t]) => ({ slug: typeSlugs.get(code) ?? code, code, label: t.label, counts: t.counts }))
      .sort((a, b) => b.counts.total - a.counts.total),
    communes: communeList,
    neighborhoods: neighborhoodList,
    withoutLocation,
    strata: [...strata].map(([value, counts]) => ({ value, counts })),
    strataOutsideFilter,
    priceRange,
    areaRange,
  };
}
