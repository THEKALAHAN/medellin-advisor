import "server-only";

import type { AmenityCode } from "@/types/property";

export const ARCGIS_LAYER_URL =
  "https://www.medellin.gov.co/servidormapas/rest/services/vivienda_ciudad_terri/VM_Oferta_Comercial_Oime/MapServer/1";

export const ARCGIS_QUERY_URL = `${ARCGIS_LAYER_URL}/query`;

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Tiempo máximo por petición a ArcGIS. Medido: 70–330 ms habituales, con picos
 * ocasionales de más de 10 s en frío. Configurable con ARCGIS_TIMEOUT_MS (1–60000 ms).
 */
export function getArcGisTimeoutMs(): number {
  const raw = process.env.ARCGIS_TIMEOUT_MS;
  if (raw === undefined || raw === "") return DEFAULT_TIMEOUT_MS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 60_000) {
    console.warn(`[arcgis] ARCGIS_TIMEOUT_MS inválido ("${raw}"); se usa ${DEFAULT_TIMEOUT_MS} ms`);
    return DEFAULT_TIMEOUT_MS;
  }
  return value;
}

/**
 * Campos solicitados explícitamente (nunca `outFields=*`).
 * Excluidos a propósito: `phone` y `agency` (datos de contacto), `parking_number`
 * (100 % nulo), `description` y amenidades (se reservan para la vista de detalle).
 */
export const PROPERTY_LIST_FIELDS = [
  "objectid",
  "code",
  "commercial_type",
  "tipo_comercio",
  "type",
  "tipo_inmueble",
  "category",
  "price",
  "private_area_m2",
  "bedrooms_number",
  "bathrooms_number",
  "garages_number",
  "stratum",
  "commune_calculated",
  "codigo_comuna",
  "codigo_barrio",
  "neighborhood_calculated",
  "original_address",
  "age",
  "floor_number",
  "link",
  "created_at",
  "updated_at",
] as const;

export type PropertyListField = (typeof PROPERTY_LIST_FIELDS)[number];

/**
 * Campos de amenidades para la ficha individual (solo lectura).
 * Nota: aunque ArcGIS los declara SmallInteger, en la base de datos son booleanos:
 * en un `where` hay que usar `campo = true` (`campo = 1` devuelve error 400). Se leen como 1/null.
 */
export const PROPERTY_AMENITY_FIELDS = [
  "swimming_pool",
  "gym",
  "elevator",
  "sauna",
  "turkish",
  "jacuzzi",
  "bbq",
  "balcony",
  "green_area",
  "garden",
  "childrens_area",
  "sports_fields",
  "communal_hall",
  "coworking",
  "air_conditioning",
  "furnished",
  "laundry_area",
  "servant_room",
  "storage_room",
  "guest_parking",
  "covered_parking",
  "frontdesk",
  "cctv",
] as const satisfies readonly AmenityCode[];

/** Ficha individual: campos del listado + amenidades. Nunca `description`, `phone` ni `agency`. */
export const PROPERTY_DETAIL_FIELDS = [...PROPERTY_LIST_FIELDS, ...PROPERTY_AMENITY_FIELDS] as const;
