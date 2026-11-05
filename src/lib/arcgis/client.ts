import "server-only";

import { ARCGIS_QUERY_URL, getArcGisTimeoutMs } from "./config";

export type ArcGisErrorKind = "timeout" | "network" | "http" | "upstream" | "invalid_response";

export class ArcGisError extends Error {
  readonly kind: ArcGisErrorKind;

  constructor(kind: ArcGisErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ArcGisError";
    this.kind = kind;
  }
}

/** Atributos crudos de un registro. Se validan campo a campo en la normalización. */
export type ArcGisAttributes = Record<string, unknown>;

export interface ArcGisFeature {
  attributes: ArcGisAttributes;
  geometry: { x: number; y: number } | null;
}

/** Parámetros admitidos por el cliente. Los valores ya vienen construidos por código propio. */
export interface ArcGisQueryParams {
  where: string;
  outFields?: string;
  orderByFields?: string;
  resultOffset?: number;
  resultRecordCount?: number;
  returnGeometry?: boolean;
  returnCountOnly?: boolean;
  /** JSON de `outStatistics` (consultas estadísticas). */
  outStatistics?: string;
  groupByFieldsForStatistics?: string;
}

/** Definición de una estadística de ArcGIS. `onStatisticField` puede ser una expresión SQL. */
export interface StatisticDefinition {
  statisticType: "count" | "sum" | "min" | "max" | "avg";
  onStatisticField: string;
  /** ArcGIS devuelve los alias en minúsculas: usar solo minúsculas y guiones bajos. */
  outStatisticFieldName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Las consultas se envían por POST (form-urlencoded): las cláusulas de la política de calidad
 * y las estadísticas generan cuerpos largos que podrían exceder límites de longitud de URL.
 * ArcGIS acepta POST en /query (verificado).
 */
async function requestJson(params: ArcGisQueryParams): Promise<Record<string, unknown>> {
  const form = new URLSearchParams({ f: "json", where: params.where });
  if (params.outFields) form.set("outFields", params.outFields);
  if (params.orderByFields) form.set("orderByFields", params.orderByFields);
  if (params.resultOffset !== undefined) form.set("resultOffset", String(params.resultOffset));
  if (params.resultRecordCount !== undefined) {
    form.set("resultRecordCount", String(params.resultRecordCount));
  }
  if (params.returnCountOnly) form.set("returnCountOnly", "true");
  if (params.returnGeometry !== undefined) {
    form.set("returnGeometry", String(params.returnGeometry));
    if (params.returnGeometry) form.set("outSR", "4326");
  }
  if (params.outStatistics) form.set("outStatistics", params.outStatistics);
  if (params.groupByFieldsForStatistics) {
    form.set("groupByFieldsForStatistics", params.groupByFieldsForStatistics);
  }
  const timeoutMs = getArcGisTimeoutMs();

  let response: Response;
  try {
    response = await fetch(ARCGIS_QUERY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ArcGisError("timeout", `ArcGIS no respondió en ${timeoutMs} ms`, {
        cause: error,
      });
    }
    throw new ArcGisError("network", "No fue posible conectar con ArcGIS", { cause: error });
  }

  if (!response.ok) {
    throw new ArcGisError("http", `ArcGIS respondió HTTP ${response.status}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ArcGisError("timeout", `ArcGIS no respondió en ${timeoutMs} ms`, {
        cause: error,
      });
    }
    throw new ArcGisError("invalid_response", "ArcGIS devolvió un cuerpo que no es JSON", {
      cause: error,
    });
  }

  if (!isRecord(body)) {
    throw new ArcGisError("invalid_response", "ArcGIS devolvió una respuesta inesperada");
  }
  // ArcGIS puede responder HTTP 200 con un objeto `error` en el cuerpo.
  if (isRecord(body.error)) {
    const code = typeof body.error.code === "number" ? body.error.code : "desconocido";
    const message = typeof body.error.message === "string" ? body.error.message : "";
    throw new ArcGisError("upstream", `ArcGIS error ${code}: ${message}`.trim());
  }
  return body;
}

export async function queryCount(where: string): Promise<number> {
  const body = await requestJson({ where, returnCountOnly: true });
  if (typeof body.count !== "number" || !Number.isInteger(body.count) || body.count < 0) {
    throw new ArcGisError("invalid_response", "La respuesta de conteo no contiene `count`");
  }
  return body.count;
}

export async function queryFeatures(params: ArcGisQueryParams): Promise<ArcGisFeature[]> {
  const body = await requestJson({ ...params, returnCountOnly: false });
  if (!Array.isArray(body.features)) {
    throw new ArcGisError("invalid_response", "La respuesta no contiene `features`");
  }
  // Un feature mal formado se conserva con atributos vacíos para que la normalización
  // lo rechace y lo contabilice, en lugar de descartarlo silenciosamente aquí.
  return body.features.map((feature: unknown): ArcGisFeature => {
    if (!isRecord(feature)) return { attributes: {}, geometry: null };
    const { attributes, geometry } = feature;
    const point =
      isRecord(geometry) && typeof geometry.x === "number" && typeof geometry.y === "number"
        ? { x: geometry.x, y: geometry.y }
        : null;
    return { attributes: isRecord(attributes) ? attributes : {}, geometry: point };
  });
}

/**
 * Consulta estadística (`outStatistics`, opcionalmente agrupada).
 * Devuelve las filas de atributos; cada consumidor valida los campos que espera.
 */
export async function queryStatistics(
  where: string,
  statistics: readonly StatisticDefinition[],
  groupByFields?: readonly string[],
): Promise<Record<string, unknown>[]> {
  const body = await requestJson({
    where,
    outStatistics: JSON.stringify(statistics),
    groupByFieldsForStatistics: groupByFields?.join(","),
    returnGeometry: false,
  });
  if (!Array.isArray(body.features)) {
    throw new ArcGisError("invalid_response", "La respuesta estadística no contiene `features`");
  }
  return body.features.map((feature: unknown) =>
    isRecord(feature) && isRecord(feature.attributes) ? feature.attributes : {},
  );
}
