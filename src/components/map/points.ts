/**
 * Datos mínimos que el mapa necesita, derivados de `Property` en el servidor
 * (no se envían al cliente objetos completos). Sin dependencias de navegador.
 */
import { findCommuneByCode } from "@/lib/properties/catalog";
import type { OperationCode, Property } from "@/types/property";

export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  price: number;
  operation: OperationCode;
  operationLabel: string;
  typeLabel: string;
  neighborhood: string | null;
  commune: string | null;
  areaM2: number | null;
}

/** Varias ofertas pueden compartir exactamente las mismas coordenadas en la fuente. */
export interface MapGroup {
  key: string;
  lat: number;
  lng: number;
  points: MapPoint[];
}

/** Solo propiedades con coordenadas válidas; nunca se inventan ni aproximan ubicaciones. */
export function toMapPoints(properties: Property[]): MapPoint[] {
  return properties.flatMap((p) => {
    const c = p.location.coordinates;
    if (!c) return [];
    const commune = p.location.communeCode
      ? (findCommuneByCode(p.location.communeCode)?.name ?? p.location.commune)
      : p.location.commune;
    return [
      {
        id: p.id,
        lat: c.lat,
        lng: c.lng,
        price: p.price,
        operation: p.operation.code,
        operationLabel: p.operation.label,
        typeLabel: p.propertyType.label,
        neighborhood: p.location.neighborhood,
        commune,
        areaM2: p.areaM2,
      },
    ];
  });
}

/** Agrupa por coordenadas idénticas (no desplaza ni altera ninguna ubicación). */
export function groupMapPoints(points: MapPoint[]): MapGroup[] {
  const groups = new Map<string, MapGroup>();
  for (const point of points) {
    const key = `${point.lat},${point.lng}`;
    const group = groups.get(key) ?? { key, lat: point.lat, lng: point.lng, points: [] };
    group.points.push(point);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export function pointTitle(point: MapPoint): string {
  return point.neighborhood ?? point.commune ?? "Ubicación sin barrio reportado";
}
