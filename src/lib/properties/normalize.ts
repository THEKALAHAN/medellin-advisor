/**
 * Normalización de registros crudos de ArcGIS a `Property`.
 * - Cada campo se valida por tipo; un valor con tipo inesperado se trata como no reportado (null).
 * - Si faltan los campos obligatorios (objectid, price, commercial_type, type), el registro
 *   se rechaza y se contabiliza; nunca se rellena con valores inventados.
 * - null se conserva como null; 0 se conserva como 0 (excepto el área: 0 y 1 m² son
 *   "no reportada" por decisión de producto, ver data-policy.ts).
 * - Los indicadores de calidad replican exactamente las condiciones SQL de QUALITY_FLAG_RULES.
 */
import type { ArcGisFeature } from "@/lib/arcgis/client";
import type {
  AmenityCode,
  OperationCode,
  Property,
  PropertyDetail,
  PropertyTypeCode,
  QualityFlag,
} from "@/types/property";

import { OPERATION_CODES, PROPERTY_TYPE_CODES } from "./catalog";
import {
  RENT_MAX_PRICE_PER_M2,
  SALE_REVIEW_PRICE_PER_M2,
  SMALL_COMMERCIAL_UNIT_M2,
} from "./data-policy";
import { cleanText } from "./slug";

const OPERATION_FALLBACK_LABELS: Record<OperationCode, string> = {
  SELL: "Venta",
  RENT: "Arriendo",
};

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function int(value: unknown): number | null {
  const n = num(value);
  return n !== null && Number.isInteger(n) ? n : null;
}

/** Texto sin espacios sobrantes; vacío → null. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = cleanText(value);
  return cleaned === "" ? null : cleaned;
}

/** Texto libre (descripciones, direcciones): solo se recorta. */
function rawText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Fechas de ArcGIS: milisegundos desde epoch. */
function isoDate(value: unknown): string | null {
  const ms = num(value);
  if (ms === null) return null;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function webUrl(value: unknown): string | null {
  const raw = text(value);
  if (raw === null) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isOperationCode(value: string): value is OperationCode {
  return (OPERATION_CODES as readonly string[]).includes(value);
}

function isPropertyTypeCode(value: string): value is PropertyTypeCode {
  return (PROPERTY_TYPE_CODES as readonly string[]).includes(value);
}

/** Devuelve la propiedad normalizada o null si el registro no cumple el esquema mínimo. */
export function normalizeProperty(feature: ArcGisFeature): Property | null {
  const a = feature.attributes;

  const id = int(a.objectid);
  const price = num(a.price);
  const operationCode = text(a.commercial_type);
  const typeCode = text(a.type);
  if (
    id === null ||
    price === null ||
    operationCode === null ||
    !isOperationCode(operationCode) ||
    typeCode === null ||
    !isPropertyTypeCode(typeCode)
  ) {
    return null;
  }

  // 0 y 1 m² son "área no reportada" (misma condición que AREA_KNOWN_SQL: área > 1).
  const rawArea = num(a.private_area_m2);
  const knownArea = rawArea !== null && rawArea > 1 ? rawArea : null;
  const areaM2 = knownArea !== null ? round(knownArea, 2) : null;

  const qualityFlags: QualityFlag[] = [];
  if (knownArea === null) qualityFlags.push("AREA_NOT_REPORTED");
  if (
    operationCode === "SELL" &&
    knownArea !== null &&
    price > SALE_REVIEW_PRICE_PER_M2 * knownArea
  ) {
    qualityFlags.push("HIGH_SALE_PRICE_PER_M2");
  }
  if (
    operationCode === "RENT" &&
    typeCode === "LOCAL" &&
    knownArea !== null &&
    knownArea < SMALL_COMMERCIAL_UNIT_M2 &&
    price > RENT_MAX_PRICE_PER_M2 * knownArea
  ) {
    qualityFlags.push("PRICE_PER_M2_CHECK_EXEMPT");
  }

  const communeCode = text(a.codigo_comuna);
  const neighborhoodCode = text(a.codigo_barrio);

  const { geometry } = feature;
  const coordinates =
    geometry && geometry.y >= -90 && geometry.y <= 90 && geometry.x >= -180 && geometry.x <= 180
      ? { lat: round(geometry.y, 6), lng: round(geometry.x, 6) }
      : null;

  return {
    id,
    sourceCode: text(a.code),
    operation: {
      code: operationCode,
      label: text(a.tipo_comercio) ?? OPERATION_FALLBACK_LABELS[operationCode],
    },
    propertyType: { code: typeCode, label: text(a.tipo_inmueble) ?? typeCode },
    category: text(a.category),
    price,
    areaM2,
    pricePerM2: knownArea !== null ? Math.round(price / knownArea) : null,
    bedrooms: int(a.bedrooms_number),
    bathrooms: int(a.bathrooms_number),
    garages: int(a.garages_number),
    stratum: int(a.stratum),
    location: {
      commune: text(a.commune_calculated),
      communeCode,
      neighborhood: text(a.neighborhood_calculated),
      neighborhoodId:
        communeCode !== null && neighborhoodCode !== null
          ? `${communeCode}-${neighborhoodCode}`
          : null,
      originalAddress: rawText(a.original_address),
      coordinates,
    },
    age: text(a.age),
    floor: int(a.floor_number),
    sourceUrl: webUrl(a.link),
    publishedAt: isoDate(a.created_at),
    updatedAt: isoDate(a.updated_at),
    qualityFlags,
  };
}

/**
 * Ficha individual: los mismos campos normalizados que el listado más las amenidades
 * reportadas. Solo el valor 1 (o `true`) cuenta como reportada; null significa «no reportada».
 */
export function normalizePropertyDetail(
  feature: ArcGisFeature,
  amenityFields: readonly AmenityCode[],
): PropertyDetail | null {
  const property = normalizeProperty(feature);
  if (!property) return null;
  const amenities = amenityFields.filter((field) => {
    const value = feature.attributes[field];
    return value === 1 || value === true;
  });
  return { ...property, amenities };
}
