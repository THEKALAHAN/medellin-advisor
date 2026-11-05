/**
 * Validación estricta de los parámetros de búsqueda (síncrona, sin acceso a red).
 * Todo valor que llegue a la cláusula SQL sale de una lista blanca, es un número validado
 * o es un código numérico de barrio. El barrio por slug se resuelve después a códigos
 * (`resolveSearchQuery` en service.ts), nunca se usa el nombre en el SQL.
 */
import type { PropertySearchQuery } from "@/types/property";

import {
  COMMUNES,
  FILTER_STRATA,
  OPERATIONS,
  PAGE_SIZES,
  PAGINATION,
  PROPERTY_TYPES,
  SORTS,
  isPageSize,
  isSortOption,
} from "./catalog";
import { NEIGHBORHOOD_ID_PATTERN, SLUG_PATTERN } from "./slug";

export interface ParamIssue {
  param: string;
  message: string;
}

/** Referencia de barrio aún sin resolver. */
export type NeighborhoodRef =
  | { kind: "id"; communeCode: string; neighborhoodCode: string }
  | { kind: "slug"; communeCode: string; slug: string };

export interface ParsedSearchParams extends Omit<PropertySearchQuery, "neighborhood"> {
  neighborhood: NeighborhoodRef | null;
}

export type ParseResult =
  | { ok: true; params: ParsedSearchParams }
  | { ok: false; issues: ParamIssue[] };

const ALLOWED_PARAMS = new Set([
  "page",
  "limit",
  "operation",
  "type",
  "commune",
  "neighborhood",
  "stratum",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "bedrooms",
  "bathrooms",
  "sort",
]);

/** Límite superior razonable para precios en COP (mayor que cualquier dato válido). */
const MAX_PRICE = 1_000_000_000_000;
const MAX_AREA = 100_000;
const MAX_ROOMS = 20;
const NEIGHBORHOOD_SLUG_MAX_LENGTH = 80;

function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

function listKeys(table: Record<string, unknown>): string {
  return Object.keys(table).join(", ");
}

export function parsePropertySearchParams(params: URLSearchParams): ParseResult {
  const issues: ParamIssue[] = [];

  for (const key of new Set(params.keys())) {
    if (!ALLOWED_PARAMS.has(key)) {
      issues.push({ param: key, message: "Parámetro no admitido" });
    } else if (params.getAll(key).length > 1) {
      issues.push({ param: key, message: "El parámetro no puede repetirse" });
    }
  }

  /** Devuelve el valor recortado, o null si falta o está vacío. */
  const read = (key: string): string | null => {
    const value = params.get(key)?.trim();
    return value ? value : null;
  };

  const readInteger = (key: string, min: number, max: number): number | null => {
    const raw = read(key);
    if (raw === null) return null;
    if (!/^\d{1,13}$/.test(raw)) {
      issues.push({ param: key, message: "Debe ser un número entero no negativo" });
      return null;
    }
    const value = Number(raw);
    if (value < min || value > max) {
      issues.push({ param: key, message: `Debe estar entre ${min} y ${max}` });
      return null;
    }
    return value;
  };

  const readDecimal = (key: string, min: number, max: number): number | null => {
    const raw = read(key);
    if (raw === null) return null;
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(raw)) {
      issues.push({ param: key, message: "Debe ser un número no negativo (máximo 2 decimales)" });
      return null;
    }
    const value = Number(raw);
    if (value < min || value > max) {
      issues.push({ param: key, message: `Debe estar entre ${min} y ${max}` });
      return null;
    }
    return value;
  };

  const readEnum = <T>(key: string, table: Record<string, T>): T | null => {
    const raw = read(key);
    if (raw === null) return null;
    const value = lookup(table, raw.toLowerCase());
    if (value === undefined) {
      issues.push({ param: key, message: `Valor no válido. Opciones: ${listKeys(table)}` });
      return null;
    }
    return value;
  };

  const page = readInteger("page", 1, PAGINATION.maxPage) ?? 1;

  let limit: PropertySearchQuery["limit"] = PAGINATION.defaultLimit;
  const rawLimit = read("limit");
  if (rawLimit !== null) {
    // Coincidencia exacta ("012" no es válido): una sola URL canónica por tamaño de página.
    const value = Number(rawLimit);
    if (PAGE_SIZES.map(String).includes(rawLimit) && isPageSize(value)) {
      limit = value;
    } else {
      issues.push({ param: "limit", message: `Valores permitidos: ${PAGE_SIZES.join(", ")}` });
    }
  }

  const operation = readEnum("operation", OPERATIONS)?.code ?? null;
  const type = readEnum("type", PROPERTY_TYPES);
  const communeCode = readEnum("commune", COMMUNES)?.code ?? null;

  // Barrio: identificador "CC-BB" (códigos de la fuente) o slug legible + `commune`.
  let neighborhood: NeighborhoodRef | null = null;
  const rawNeighborhood = read("neighborhood");
  if (rawNeighborhood !== null) {
    const idMatch = NEIGHBORHOOD_ID_PATTERN.exec(rawNeighborhood);
    if (idMatch) {
      const [, neighborhoodCommune, neighborhoodCode] = idMatch;
      if (communeCode !== null && communeCode !== neighborhoodCommune) {
        issues.push({
          param: "neighborhood",
          message: "El barrio no pertenece a la comuna indicada en `commune`",
        });
      } else {
        neighborhood = { kind: "id", communeCode: neighborhoodCommune, neighborhoodCode };
      }
    } else {
      const slug = rawNeighborhood.toLowerCase();
      if (slug.length > NEIGHBORHOOD_SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
        issues.push({
          param: "neighborhood",
          message: "Debe ser un identificador «CC-BB» (p. ej. 10-14) o un slug (p. ej. las-palmas)",
        });
      } else if (communeCode === null) {
        // Hay nombres de barrio repetidos en comunas distintas (p. ej. «Las Palmas»).
        issues.push({
          param: "neighborhood",
          message: "Para buscar un barrio por slug se requiere el parámetro `commune`",
        });
      } else {
        neighborhood = { kind: "slug", communeCode, slug };
      }
    }
  }

  let stratum: number | null = null;
  const rawStratum = read("stratum");
  if (rawStratum !== null) {
    const value = Number(rawStratum);
    if (/^\d$/.test(rawStratum) && (FILTER_STRATA as readonly number[]).includes(value)) {
      stratum = value;
    } else {
      issues.push({ param: "stratum", message: `Valores permitidos: ${FILTER_STRATA.join(", ")}` });
    }
  }

  const minPrice = readInteger("minPrice", 0, MAX_PRICE);
  const maxPrice = readInteger("maxPrice", 0, MAX_PRICE);
  const minArea = readDecimal("minArea", 0, MAX_AREA);
  const maxArea = readDecimal("maxArea", 0, MAX_AREA);
  // Son mínimos (>=); 0 no filtraría nada útil y solo excluiría los nulos.
  const bedrooms = readInteger("bedrooms", 1, MAX_ROOMS);
  const bathrooms = readInteger("bathrooms", 1, MAX_ROOMS);

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    issues.push({ param: "minPrice", message: "No puede ser mayor que maxPrice" });
  }
  if (minArea !== null && maxArea !== null && minArea > maxArea) {
    issues.push({ param: "minArea", message: "No puede ser mayor que maxArea" });
  }

  const rawSort = read("sort");
  let sort: PropertySearchQuery["sort"] = "default";
  if (rawSort !== null) {
    const normalized = rawSort.toLowerCase();
    if (isSortOption(normalized)) {
      sort = normalized;
    } else {
      issues.push({ param: "sort", message: `Valor no válido. Opciones: ${listKeys(SORTS)}` });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    params: {
      page,
      limit,
      operation,
      type,
      communeCode,
      neighborhood,
      stratum,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      bedrooms,
      bathrooms,
      sort,
    },
  };
}

/** Mayor valor de un OID de ArcGIS (entero de 32 bits con signo). */
const MAX_OBJECT_ID = 2_147_483_647;

/**
 * Valida el identificador de una ficha (`objectid`): entero positivo, sin ceros a la izquierda
 * ni signos (una única URL canónica por propiedad). Devuelve null si no es válido.
 */
export function parsePropertyId(raw: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_OBJECT_ID ? id : null;
}
