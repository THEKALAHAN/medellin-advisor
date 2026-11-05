"use client";

import { LeafletContext, createLeafletContext, type LeafletContextInterface } from "@react-leaflet/core";
import { Map as LeafletMap, type LatLngExpression, type MapOptions } from "leaflet";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Contenedor de mapa compatible con `<Activity>` (sustituye a `MapContainer` de react-leaflet).
 *
 * Motivo: con Cache Components, Next.js no desmonta las páginas al navegar; las oculta con
 * `<Activity>`. Al ocultarse se ejecutan las limpiezas de los efectos y al volver a mostrarse los
 * efectos se ejecutan de nuevo, pero el estado se conserva. `MapContainer` crea el mapa en un
 * ref callback y lo destruye (`map.remove()`) en la limpieza de un efecto: al volver a la página
 * conservaba en su estado el mapa ya destruido y `TileLayer` intentaba añadirse a él
 * («Cannot read properties of undefined (reading 'appendChild')»: `getPane()` es undefined).
 *
 * Aquí el ciclo de vida del mapa coincide con el del efecto:
 * - Montaje o reaparición: se crea un mapa nuevo sobre el nodo y se publica su contexto cuando
 *   está listo (`whenReady`).
 * - Ocultación o desmontaje: se destruye el mapa; su evento `unload` retira el contexto, de modo
 *   que las capas hijas nunca reciben un mapa destruido.
 * Las capas (TileLayer, Marker…) y `useMap` de react-leaflet funcionan igual con este contexto.
 */
export function LeafletMapContainer({
  center,
  zoom,
  options,
  className,
  ariaLabel,
  children,
}: {
  /** Vista inicial; los cambios posteriores de vista los gestionan los hijos con `useMap`. */
  center: LatLngExpression;
  zoom: number;
  options?: Omit<MapOptions, "center" | "zoom">;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const initialView = useRef({ center, zoom, options });
  const [context, setContext] = useState<LeafletContextInterface | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const { center: initialCenter, zoom: initialZoom, options: mapOptions } = initialView.current;
    const map = new LeafletMap(node, { ...mapOptions, center: initialCenter, zoom: initialZoom });
    const publish = () => setContext(createLeafletContext(map));
    const retract = () => setContext((current) => (current?.map === map ? null : current));
    map.whenReady(publish);
    map.on("unload", retract);
    return () => {
      map.remove(); // dispara «unload» → retira el contexto antes de cualquier nuevo montaje
      map.off("unload", retract);
    };
  }, []);

  return (
    <div ref={nodeRef} className={className} aria-label={ariaLabel} role="region">
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}
