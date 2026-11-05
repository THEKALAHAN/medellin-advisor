/**
 * Listas blancas verificadas contra la API (groupByFieldsForStatistics, nov. 2026).
 * Los slugs son los valores aceptados en la URL; el resto son valores reales de ArcGIS.
 */
import type { OperationCode, PageSize, PropertyTypeCode, SortOption } from "@/types/property";

export const OPERATIONS = {
  venta: { code: "SELL", label: "Venta" },
  arriendo: { code: "RENT", label: "Arriendo" },
} as const satisfies Record<string, { code: OperationCode; label: string }>;

export const PROPERTY_TYPES = {
  apartamento: "APARTAMENTO",
  casa: "CASA",
  oficina: "OFICINA",
  local: "LOCAL",
  bodega: "BODEGA",
  consultorio: "CONSULTORIO",
  lote: "LOTE",
  estudio: "ESTUDIO",
  "casa-lote": "CASA_LOTE",
  habitacion: "HABITACION",
} as const satisfies Record<string, PropertyTypeCode>;

export const PROPERTY_TYPE_CODES: readonly PropertyTypeCode[] = Object.values(PROPERTY_TYPES);
export const OPERATION_CODES: readonly OperationCode[] = ["SELL", "RENT"];

/**
 * Comunas y corregimientos: slug → `codigo_comuna` + `commune_calculated`.
 * La correspondencia código ↔ nombre es 1:1 en la fuente (verificado con groupBy).
 * `name` es solo el nombre legible para mostrar.
 */
export const COMMUNES = {
  popular: { code: "01", value: "POPULAR", name: "Popular" },
  "santa-cruz": { code: "02", value: "SANTA CRUZ", name: "Santa Cruz" },
  manrique: { code: "03", value: "MANRIQUE", name: "Manrique" },
  aranjuez: { code: "04", value: "ARANJUEZ", name: "Aranjuez" },
  castilla: { code: "05", value: "CASTILLA", name: "Castilla" },
  "doce-de-octubre": { code: "06", value: "DOCE DE OCTUBRE", name: "Doce de Octubre" },
  robledo: { code: "07", value: "ROBLEDO", name: "Robledo" },
  "villa-hermosa": { code: "08", value: "VILLA HERMOSA", name: "Villa Hermosa" },
  "buenos-aires": { code: "09", value: "BUENOS AIRES", name: "Buenos Aires" },
  "la-candelaria": { code: "10", value: "LA CANDELARIA", name: "La Candelaria" },
  laureles: { code: "11", value: "LAURELES", name: "Laureles" },
  "la-america": { code: "12", value: "LA AMERICA", name: "La América" },
  "san-javier": { code: "13", value: "SAN JAVIER", name: "San Javier" },
  "el-poblado": { code: "14", value: "EL POBLADO", name: "El Poblado" },
  guayabal: { code: "15", value: "GUAYABAL", name: "Guayabal" },
  belen: { code: "16", value: "BELEN", name: "Belén" },
  palmitas: { code: "50", value: "PALMITAS", name: "Palmitas" },
  "san-cristobal": { code: "60", value: "SAN CRISTOBAL", name: "San Cristóbal" },
  altavista: { code: "70", value: "ALTAVISTA", name: "Altavista" },
  "san-antonio-de-prado": { code: "80", value: "SAN ANTONIO DE PRADO", name: "San Antonio de Prado" },
  "santa-elena": { code: "90", value: "SANTA ELENA", name: "Santa Elena" },
} as const satisfies Record<string, { code: string; value: string; name: string }>;

export type CommuneSlug = keyof typeof COMMUNES;

export function findCommuneByCode(code: string): { slug: CommuneSlug; name: string } | null {
  for (const [slug, commune] of Object.entries(COMMUNES)) {
    if (commune.code === code) return { slug: slug as CommuneSlug, name: commune.name };
  }
  return null;
}

/** Área reportada: la fuente usa 0 y 1 como "sin dato" (ver data-policy.ts). */
export const AREA_KNOWN_SQL = "(private_area_m2 IS NOT NULL AND private_area_m2 > 1)";

/**
 * Ordenamientos permitidos → `orderByFields` de ArcGIS.
 * - `objectid ASC` siempre va al final como desempate para que la paginación sea estable.
 * - Por área y precio/m², los registros sin área reportada van siempre al final
 *   (primera clave CASE) y el CASE evita la división por cero. Verificado contra ArcGIS.
 */
const UNKNOWN_AREA_LAST = `CASE WHEN ${AREA_KNOWN_SQL} THEN 0 ELSE 1 END ASC`;
const PRICE_PER_M2 = `CASE WHEN ${AREA_KNOWN_SQL} THEN price / private_area_m2 ELSE 0 END`;

export const SORTS = {
  default: "objectid ASC",
  price_asc: "price ASC, objectid ASC",
  price_desc: "price DESC, objectid ASC",
  area_asc: `${UNKNOWN_AREA_LAST}, private_area_m2 ASC, objectid ASC`,
  area_desc: `${UNKNOWN_AREA_LAST}, private_area_m2 DESC, objectid ASC`,
  price_m2_asc: `${UNKNOWN_AREA_LAST}, ${PRICE_PER_M2} ASC, objectid ASC`,
  price_m2_desc: `${UNKNOWN_AREA_LAST}, ${PRICE_PER_M2} DESC, objectid ASC`,
} as const satisfies Record<SortOption, string>;

export const PAGE_SIZES: readonly PageSize[] = [12, 24, 48];

export const PAGINATION = {
  defaultLimit: 24 satisfies PageSize,
  /**
   * Cota sintáctica de `page` (evita offsets absurdos). Cualquier página mayor que
   * `totalPages` responde 200 con `pageOutOfRange: true`.
   */
  maxPage: 100_000,
} as const;

/** Estratos del filtro convencional. 0 y 7 existen en la fuente pero no se ofrecen. */
export const FILTER_STRATA = [1, 2, 3, 4, 5, 6] as const;

export function isSortOption(value: string): value is SortOption {
  return Object.hasOwn(SORTS, value);
}

export function isPageSize(value: number): value is PageSize {
  return (PAGE_SIZES as readonly number[]).includes(value);
}
