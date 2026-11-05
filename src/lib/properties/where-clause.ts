/**
 * Construcción de la cláusula `where` de ArcGIS a partir de una consulta YA validada y resuelta.
 * Nunca recibe SQL del usuario: los nombres de campo son constantes de este archivo,
 * los valores enumerados vienen de listas blancas, los numéricos son `number` validados
 * y los códigos de comuna/barrio son cadenas de dígitos (validadas con NEIGHBORHOOD_ID_PATTERN
 * o tomadas de la lista blanca), que además se escapan como literales.
 */
import type { PropertySearchQuery } from "@/types/property";

import { AREA_KNOWN_SQL } from "./catalog";
import { DATA_POLICY_WHERE } from "./data-policy";

/** Literal de texto SQL estándar: comillas simples duplicadas. */
export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNumber(value: number): string {
  if (!Number.isFinite(value)) throw new RangeError("Valor numérico no finito en la consulta");
  return String(value);
}

export function buildWhereClause(query: PropertySearchQuery): string {
  const conditions: string[] = [`(${DATA_POLICY_WHERE})`];

  if (query.operation) conditions.push(`commercial_type = ${sqlString(query.operation)}`);
  if (query.type) conditions.push(`type = ${sqlString(query.type)}`);
  if (query.communeCode) conditions.push(`codigo_comuna = ${sqlString(query.communeCode)}`);
  if (query.neighborhood) {
    // Identificador estable: el nombre del barrio tiene espacios sobrantes y repeticiones.
    conditions.push(`codigo_comuna = ${sqlString(query.neighborhood.communeCode)}`);
    conditions.push(`codigo_barrio = ${sqlString(query.neighborhood.neighborhoodCode)}`);
  }
  if (query.stratum !== null) conditions.push(`stratum = ${sqlNumber(query.stratum)}`);
  if (query.minPrice !== null) conditions.push(`price >= ${sqlNumber(query.minPrice)}`);
  if (query.maxPrice !== null) conditions.push(`price <= ${sqlNumber(query.maxPrice)}`);
  if (query.minArea !== null || query.maxArea !== null) {
    // Los registros con área no reportada (0 o 1 m²) no participan en filtros de área.
    conditions.push(AREA_KNOWN_SQL);
    if (query.minArea !== null) conditions.push(`private_area_m2 >= ${sqlNumber(query.minArea)}`);
    if (query.maxArea !== null) conditions.push(`private_area_m2 <= ${sqlNumber(query.maxArea)}`);
  }
  // ">=" sobre una columna con NULL excluye esos registros: un dato no reportado
  // no se interpreta como 0 ni como cumplimiento del filtro.
  if (query.bedrooms !== null) conditions.push(`bedrooms_number >= ${sqlNumber(query.bedrooms)}`);
  if (query.bathrooms !== null) {
    conditions.push(`bathrooms_number >= ${sqlNumber(query.bathrooms)}`);
  }

  return conditions.join(" AND ");
}
