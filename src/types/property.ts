/**
 * Tipos del dominio inmobiliario.
 *
 * Fuente: capa "Investigaciones Internet" (ID 1) del servicio ArcGIS
 * VM_Oferta_Comercial_Oime de la Alcaldía de Medellín.
 *
 * Regla general: `null` significa "dato no reportado por la fuente" y nunca
 * se convierte en 0. Un 0 solo aparece si la fuente lo publica como 0.
 */

/** Códigos reales de `commercial_type`. */
export type OperationCode = "SELL" | "RENT";

/** Códigos reales de `type` (10 valores verificados con groupBy). */
export type PropertyTypeCode =
  | "APARTAMENTO"
  | "CASA"
  | "OFICINA"
  | "LOCAL"
  | "BODEGA"
  | "CONSULTORIO"
  | "LOTE"
  | "ESTUDIO"
  | "CASA_LOTE"
  | "HABITACION";

export type PageSize = 12 | 24 | 48;

/**
 * Indicadores de calidad: el registro se conserva, pero conviene revisarlo o
 * mostrarlo con cuidado. Ver `src/lib/properties/data-policy.ts`.
 */
export type QualityFlag =
  /** `private_area_m2` es 0 o 1 en la fuente: se publica como `areaM2: null`. */
  | "AREA_NOT_REPORTED"
  /** Venta con precio superior a 30 millones por m². */
  | "HIGH_SALE_PRICE_PER_M2"
  /** Local en arriendo de menos de 10 m² que superaría el límite de 500.000/m². */
  | "PRICE_PER_M2_CHECK_EXEMPT";

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Identificador estable de barrio: `codigo_comuna` + `codigo_barrio`. */
export interface NeighborhoodId {
  communeCode: string;
  neighborhoodCode: string;
}

/** Propiedad normalizada que expone la aplicación (sin `phone` ni `agency`). */
export interface Property {
  /** `objectid` de ArcGIS. */
  id: number;
  /** `code`: identificador del anuncio en el portal de origen. */
  sourceCode: string | null;
  operation: { code: OperationCode; label: string };
  propertyType: { code: PropertyTypeCode; label: string };
  /** `category`: RESIDENCIAL, COMERCIAL, OFICINA_CONSULTORIO, INDUSTRIAL, LOTE. */
  category: string | null;
  /** `price` en pesos colombianos (COP). Mensual si la operación es RENT. */
  price: number;
  /**
   * `private_area_m2` redondeada a 2 decimales (la fuente es float32).
   * `null` si la fuente publica 0 o 1 m² ("Área no reportada").
   */
  areaM2: number | null;
  /** price / private_area_m2, redondeado. `null` si el área no está reportada. */
  pricePerM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  /** `garages_number` (`parking_number` está vacío en el 100 % de los registros). */
  garages: number | null;
  /** `stratum` tal como lo publica la fuente (0–7). 0 y 7 no están documentados. */
  stratum: number | null;
  location: {
    /** `commune_calculated` tal como lo publica la fuente (mayúsculas). */
    commune: string | null;
    /** `codigo_comuna`. */
    communeCode: string | null;
    /** `neighborhood_calculated` sin espacios sobrantes. */
    neighborhood: string | null;
    /** `codigo_comuna` + `codigo_barrio` en formato "CC-BB" (p. ej. "10-14"). */
    neighborhoodId: string | null;
    /** `original_address`: texto libre del anuncio, generalmente el nombre del sector. */
    originalAddress: string | null;
    /** Tomadas de la geometría (doble precisión). */
    coordinates: Coordinates | null;
  };
  /** `age`: rango de antigüedad en texto (p. ej. "Entre 5 y 10 años"). */
  age: string | null;
  /** `floor_number`. */
  floor: number | null;
  /** `link`: anuncio original en el portal de origen (puede ya no estar disponible). */
  sourceUrl: string | null;
  /** `created_at` en ISO 8601. */
  publishedAt: string | null;
  /** `updated_at` en ISO 8601. */
  updatedAt: string | null;
  qualityFlags: QualityFlag[];
}

/**
 * Amenidades con significado inequívoco por el nombre del campo de la fuente (nombres originales).
 * Valores verificados en la fuente: solo 1 (reportada) o null (no reportada); nunca 0.
 * Se excluyen campos ambiguos (studio, steam_room, bedroom_hall, external_view, …).
 */
export type AmenityCode =
  | "swimming_pool"
  | "gym"
  | "elevator"
  | "sauna"
  | "turkish"
  | "jacuzzi"
  | "bbq"
  | "balcony"
  | "green_area"
  | "garden"
  | "childrens_area"
  | "sports_fields"
  | "communal_hall"
  | "coworking"
  | "air_conditioning"
  | "furnished"
  | "laundry_area"
  | "servant_room"
  | "storage_room"
  | "guest_parking"
  | "covered_parking"
  | "frontdesk"
  | "cctv";

/** Propiedad con los datos adicionales de la ficha individual. */
export interface PropertyDetail extends Property {
  /**
   * Solo amenidades reportadas explícitamente (valor 1 en la fuente). Una amenidad ausente
   * de la lista significa «no reportada», nunca «no tiene».
   */
  amenities: AmenityCode[];
}

export type SortOption =
  | "default"
  | "price_asc"
  | "price_desc"
  | "area_asc"
  | "area_desc"
  | "price_m2_asc"
  | "price_m2_desc";

/** Parámetros de búsqueda ya validados y resueltos. Solo contienen valores de listas blancas o números. */
export interface PropertySearchQuery {
  page: number;
  limit: PageSize;
  operation: OperationCode | null;
  type: PropertyTypeCode | null;
  /** `codigo_comuna` (de la lista blanca de comunas). */
  communeCode: string | null;
  neighborhood: NeighborhoodId | null;
  /** Estrato exacto 1–6. Los valores 0 y 7 de la fuente no se ofrecen como filtro. */
  stratum: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  /** Filtros de área: solo consideran registros con área reportada. */
  minArea: number | null;
  maxArea: number | null;
  /** Mínimo de habitaciones (>=). Excluye registros con dato nulo. */
  bedrooms: number | null;
  /** Mínimo de baños (>=). Excluye registros con dato nulo. */
  bathrooms: number | null;
  sort: SortOption;
}

export interface Pagination {
  page: number;
  limit: PageSize;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  /** true si `page` es mayor que `totalPages` (o > 1 cuando no hay resultados). */
  pageOutOfRange: boolean;
}

export interface CountedRule {
  id: string;
  description: string;
  /** Registros de la capa que incumplen la regla (las reglas pueden solaparse). */
  records: number | null;
}

export interface DatasetMeta {
  source: { name: string; publisher: string; url: string };
  /** Periodo de los datos (verificado: updated_at entre 2023-08-18 y 2023-08-27). */
  dataPeriod: string;
  disclaimer: string;
  exclusionPolicy: {
    rules: CountedRule[];
    /** Registros que la política excluye en total (sin dobles conteos). null si no se pudo calcular. */
    excludedRecords: number | null;
    totalRecords: number | null;
    includedRecords: number | null;
  };
  /** Indicadores sobre registros incluidos, con su cantidad. */
  qualityFlags: CountedRule[];
  /** false si algún conteo no pudo calcularse (la respuesta no se cachea 24 h). */
  complete: boolean;
}

export interface PropertySearchResult {
  data: Property[];
  pagination: Pagination;
  /** Registros descartados por no cumplir el esquema esperado (tipos inválidos). */
  invalidRecordsSkipped: number;
}

/** Consulta tal como se devuelve al cliente: incluye identificadores legibles. */
export interface PropertySearchQueryEcho extends Omit<PropertySearchQuery, "neighborhood"> {
  /** "CC-BB" o null. */
  neighborhood: string | null;
}

export interface PropertySearchResponse extends PropertySearchResult {
  query: PropertySearchQueryEcho;
  meta: DatasetMeta;
}

// ---------------------------------------------------------------- Facetas

export interface FacetCounts {
  total: number;
  SELL: number;
  RENT: number;
}

export interface NumericRange {
  min: number | null;
  max: number | null;
}

export interface PropertyFacets {
  /** Registros incluidos por la política de calidad (mismo universo que /api/properties). */
  totals: FacetCounts;
  operations: { slug: string; code: OperationCode; label: string; count: number }[];
  types: { slug: string; code: PropertyTypeCode; label: string; counts: FacetCounts }[];
  communes: {
    /** `codigo_comuna`. */
    code: string;
    slug: string;
    name: string;
    /** Valor de `commune_calculated` en la fuente. */
    sourceName: string;
    counts: FacetCounts;
  }[];
  neighborhoods: {
    /** "CC-BB". */
    id: string;
    communeCode: string;
    neighborhoodCode: string;
    communeSlug: string;
    /** Nombre sin espacios sobrantes. */
    name: string;
    /** Slug único dentro de su comuna. */
    slug: string;
    counts: FacetCounts;
  }[];
  /** Registros incluidos sin comuna ni barrio asignados (no filtrables por ubicación). */
  withoutLocation: FacetCounts;
  /** Estratos 1–6 (filtro convencional). */
  strata: { value: number; counts: FacetCounts }[];
  /** Registros con estrato 0, 7 o nulo: se conservan pero no forman parte del filtro. */
  strataOutsideFilter: FacetCounts;
  priceRange: Record<OperationCode, NumericRange>;
  /** Solo registros con área reportada (> 1 m²). */
  areaRange: Record<OperationCode, NumericRange>;
}

export interface PropertyFacetsResponse {
  data: PropertyFacets;
  meta: DatasetMeta;
}
