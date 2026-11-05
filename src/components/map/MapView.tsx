"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useCallback, useEffect } from "react";
import { TileLayer, ZoomControl, useMap } from "react-leaflet";

import { LeafletMapContainer } from "./LeafletMapContainer";

import type { MapGroup } from "./points";
import { PropertyMarker, type MarkerState } from "./PropertyMarker";

/** Centro de Medellín: solo vista inicial antes de ajustar a los marcadores. */
const MEDELLIN_CENTER: [number, number] = [6.2442, -75.5812];

/**
 * Teselas estándar de OpenStreetMap con atribución visible. Su política de uso no admite
 * tráfico intensivo: en producción conviene un proveedor de teselas con acuerdo de uso.
 */
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores de OpenStreetMap</a>';

export interface FocusRequest {
  groupKey: string;
  nonce: number;
}

export interface MapViewProps {
  groups: MapGroup[];
  selectedGroupKey: string | null;
  highlightedGroupKey: string | null;
  focus: FocusRequest | null;
  /** Se incrementa para volver a encuadrar todos los marcadores. */
  fitRequest: number;
  /** false mientras el contenedor está oculto (modo Lista en móvil). */
  visible: boolean;
  onSelectGroup: (groupKey: string) => void;
}

function Controller({
  groups,
  focus,
  fitRequest,
  visible,
  onSelectGroup,
}: Pick<MapViewProps, "groups" | "focus" | "fitRequest" | "visible" | "onSelectGroup">) {
  const map = useMap();

  // Activación por teclado de los marcadores (role="button"): Enter y Espacio.
  // Leaflet solo atiende Enter mediante el evento heredado `keypress`.
  useEffect(() => {
    const container = map.getContainer();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains("leaflet-marker-icon")) return;
      const groupKey = target.querySelector<HTMLElement>("[data-group]")?.dataset.group;
      if (!groupKey) return;
      event.preventDefault();
      onSelectGroup(groupKey);
    };
    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [map, onSelectGroup]);

  const fitAll = useCallback(() => {
    if (groups.length === 0) return;
    if (groups.length === 1) {
      map.setView([groups[0].lat, groups[0].lng], 16);
      return;
    }
    const bounds = L.latLngBounds(groups.map((g) => [g.lat, g.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16 });
  }, [map, groups]);

  // Nuevos resultados, «Ver todas» o el mapa vuelve a ser visible: recalcular tamaño y encuadrar.
  useEffect(() => {
    if (!visible) return;
    map.invalidateSize();
    fitAll();
  }, [map, fitAll, fitRequest, visible]);

  // Selección desde una tarjeta: centrar el marcador correspondiente.
  useEffect(() => {
    if (!focus || !visible) return;
    const group = groups.find((g) => g.key === focus.groupKey);
    if (!group) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.setView([group.lat, group.lng], Math.max(map.getZoom(), 16), { animate: !reduceMotion });
  }, [map, groups, focus, visible]);

  return null;
}

export function MapView({
  groups,
  selectedGroupKey,
  highlightedGroupKey,
  focus,
  fitRequest,
  visible,
  onSelectGroup,
}: MapViewProps) {
  const stateOf = (key: string): MarkerState =>
    key === selectedGroupKey ? "selected" : key === highlightedGroupKey ? "highlight" : "default";

  return (
    <LeafletMapContainer
      center={MEDELLIN_CENTER}
      zoom={12}
      options={{ minZoom: 10, maxZoom: 19, scrollWheelZoom: true, zoomControl: false }}
      className="ma-map h-full w-full"
      ariaLabel="Mapa interactivo de las propiedades"
    >
      {/* Control de zoom con nombres accesibles en español (Leaflet los trae en inglés). */}
      <ZoomControl position="topleft" zoomInTitle="Acercar" zoomOutTitle="Alejar" />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      {groups.map((group) => (
        <PropertyMarker key={group.key} group={group} state={stateOf(group.key)} onSelect={onSelectGroup} />
      ))}
      <Controller
        groups={groups}
        focus={focus}
        fitRequest={fitRequest}
        visible={visible}
        onSelectGroup={onSelectGroup}
      />
    </LeafletMapContainer>
  );
}
