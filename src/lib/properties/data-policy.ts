/**
 * Política de calidad de datos aplicada a TODAS las consultas (listado y facetas).
 *
 * Diseño declarativo: cada regla define la condición SQL que la INCUMPLE. La cláusula de
 * inclusión es `NOT (regla1 OR regla2 OR ...)`, y los conteos publicados en
 * `meta.exclusionPolicy` se calculan con esas mismas condiciones, de modo que reglas,
 * filtro y cifras no pueden divergir. Todas las cláusulas son constantes (sin datos del usuario).
 *
 * Decisiones (auditoría de nov. 2026, ver CLAUDE.md §3.1):
 * - Área 0 o 1 m² = "no reportada": el registro se CONSERVA con `areaM2: null` y no participa
 *   en filtros ni ordenamientos por área o precio/m² (28 registros, sobre todo lotes).
 * - Locales en arriendo de menos de 10 m² (módulos, kioscos) no se someten al límite de precio/m².
 * - Precios de relleno: solo repunits (111.111 … 111.111.111.111). Son los únicos valores de dígitos
 *   repetidos que existen en la fuente (34 arriendos de apartamentos). No se excluyen otros patrones
 *   como 2.222.222 para no descartar precios legítimos por coincidencia.
 * - Ventas: se mantiene provisionalmente el máximo de 100 M/m². Por encima de 30 M/m² solo se marca
 *   el indicador HIGH_SALE_PRICE_PER_M2 para revisión, sin excluir.
 * - Comparaciones de precio/m² con multiplicación (price > X * área) para evitar dividir por cero.
 */
import type { QualityFlag } from "@/types/property";

import { AREA_KNOWN_SQL, PROPERTY_TYPE_CODES } from "./catalog";

export const DATA_PERIOD = "2023-08";

export const DATA_DISCLAIMER =
  "Ofertas históricas publicadas en portales inmobiliarios en agosto de 2023 y recopiladas por la Alcaldía de Medellín. No representan disponibilidad ni precios actuales.";

/** Repunits de 6 a 12 dígitos: 111.111, 1.111.111, …, 111.111.111.111. */
export const PLACEHOLDER_PRICES: readonly number[] = Array.from({ length: 7 }, (_, i) =>
  Number("1".repeat(i + 6)),
);

export const SALE_MIN_PRICE = 20_000_000;
export const SALE_MAX_PRICE_PER_M2 = 100_000_000;
export const SALE_REVIEW_PRICE_PER_M2 = 30_000_000;
export const RENT_MIN_PRICE = 300_000;
export const RENT_MAX_PRICE_PER_M2 = 500_000;
export const SMALL_COMMERCIAL_UNIT_M2 = 10;
export const MAX_AREA_M2 = 100_000;

interface PolicyRule {
  id: string;
  description: string;
  /** Condición SQL que cumple un registro que INCUMPLE la regla. */
  violation: string;
}

const SMALL_LOCAL_SQL = `(type = 'LOCAL' AND private_area_m2 < ${SMALL_COMMERCIAL_UNIT_M2})`;

export const EXCLUSION_RULES: readonly PolicyRule[] = [
  {
    id: "missing-required-fields",
    description:
      "Se excluyen registros sin precio válido o con operación o tipo de inmueble fuera de los valores conocidos.",
    violation: [
      "price IS NULL",
      "price <= 0",
      "commercial_type IS NULL",
      "commercial_type NOT IN ('SELL', 'RENT')",
      "type IS NULL",
      `type NOT IN (${PROPERTY_TYPE_CODES.map((t) => `'${t}'`).join(", ")})`,
    ].join(" OR "),
  },
  {
    id: "placeholder-price",
    description:
      "Se excluyen precios de relleno formados solo por unos (111.111, 1.111.111, 11.111.111, …).",
    violation: `price IN (${PLACEHOLDER_PRICES.join(", ")})`,
  },
  {
    id: "area-max",
    description: `Se excluyen registros con área privada mayor de ${MAX_AREA_M2.toLocaleString("es-CO")} m².`,
    violation: `private_area_m2 IS NOT NULL AND private_area_m2 > ${MAX_AREA_M2}`,
  },
  {
    id: "sale-min-price",
    description: "Se excluyen ventas con precio menor de $20.000.000.",
    violation: `commercial_type = 'SELL' AND price < ${SALE_MIN_PRICE}`,
  },
  {
    id: "sale-max-price-per-m2",
    description:
      "Se excluyen ventas con precio mayor de $100.000.000 por m² (solo si el área está reportada).",
    violation: `commercial_type = 'SELL' AND ${AREA_KNOWN_SQL} AND price > ${SALE_MAX_PRICE_PER_M2} * private_area_m2`,
  },
  {
    id: "rent-min-price",
    description: "Se excluyen arriendos con precio menor de $300.000.",
    violation: `commercial_type = 'RENT' AND price < ${RENT_MIN_PRICE}`,
  },
  {
    id: "rent-max-price-per-m2",
    description:
      "Se excluyen arriendos con precio mayor de $500.000 por m² (solo si el área está reportada; no aplica a locales de menos de 10 m²).",
    violation: `commercial_type = 'RENT' AND ${AREA_KNOWN_SQL} AND NOT ${SMALL_LOCAL_SQL} AND price > ${RENT_MAX_PRICE_PER_M2} * private_area_m2`,
  },
];

/** Cláusula de inclusión: ninguna regla incumplida. */
export const DATA_POLICY_WHERE = `NOT (${EXCLUSION_RULES.map((r) => `(${r.violation})`).join(" OR ")})`;

interface QualityFlagRule {
  id: QualityFlag;
  description: string;
  /** Condición SQL equivalente a la que aplica `normalize.ts`. */
  condition: string;
}

export const QUALITY_FLAG_RULES: readonly QualityFlagRule[] = [
  {
    id: "AREA_NOT_REPORTED",
    description: "Área privada publicada como 0 o 1 m²: se muestra como «Área no reportada».",
    condition: `NOT ${AREA_KNOWN_SQL}`,
  },
  {
    id: "HIGH_SALE_PRICE_PER_M2",
    description: "Venta con precio superior a $30.000.000 por m²: se conserva, pendiente de revisión.",
    condition: `commercial_type = 'SELL' AND ${AREA_KNOWN_SQL} AND price > ${SALE_REVIEW_PRICE_PER_M2} * private_area_m2`,
  },
  {
    id: "PRICE_PER_M2_CHECK_EXEMPT",
    description:
      "Local en arriendo de menos de 10 m² que supera $500.000 por m²: se conserva por ser un formato comercial legítimo (módulo o kiosco).",
    condition: `commercial_type = 'RENT' AND ${AREA_KNOWN_SQL} AND ${SMALL_LOCAL_SQL} AND price > ${RENT_MAX_PRICE_PER_M2} * private_area_m2`,
  },
];
