"use client";

import L from "leaflet";
import { Marker } from "react-leaflet";

import { formatCompactCOP, formatCOP } from "@/lib/format";

import { pointTitle, type MapGroup } from "./points";

export type MarkerState = "default" | "highlight" | "selected";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Marcador personalizado (DivIcon): una píldora con el precio, o con el número de ofertas
 * cuando varias comparten exactamente las mismas coordenadas. Al ser HTML/CSS no depende de
 * las imágenes por defecto de Leaflet (evita el problema de rutas de iconos con el bundler).
 */
const iconCache = new Map<string, L.DivIcon>();

function markerIcon(groupKey: string, label: string, state: MarkerState, isGroup: boolean): L.DivIcon {
  const cacheKey = `${groupKey}|${label}|${state}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;
  const icon = L.divIcon({
    className: "ma-marker",
    // data-group permite activar el marcador con teclado (Enter/Espacio) desde MapView.
    html: `<span class="ma-pin ma-pin--${state}${isGroup ? " ma-pin--group" : ""}" data-group="${escapeHtml(groupKey)}">${escapeHtml(label)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

function describe(group: MapGroup): string {
  if (group.points.length > 1) return `${group.points.length} ofertas en esta ubicación`;
  const [p] = group.points;
  const price = `${formatCOP(p.price)}${p.operation === "RENT" ? " al mes" : ""}`;
  return `${p.typeLabel} en ${p.operationLabel.toLowerCase()}, ${pointTitle(p)}, ${price}`;
}

export function PropertyMarker({
  group,
  state,
  onSelect,
}: {
  group: MapGroup;
  state: MarkerState;
  onSelect: (groupKey: string) => void;
}) {
  const isGroup = group.points.length > 1;
  const label = isGroup ? `${group.points.length} ofertas` : formatCompactCOP(group.points[0].price);

  return (
    <Marker
      position={[group.lat, group.lng]}
      icon={markerIcon(group.key, label, state, isGroup)}
      title={describe(group)}
      keyboard
      riseOnHover
      zIndexOffset={state === "selected" ? 1000 : state === "highlight" ? 500 : 0}
      eventHandlers={{ click: () => onSelect(group.key) }}
    />
  );
}
