"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { formatNumber } from "@/lib/format";

import type { MapViewProps } from "./MapView";

/**
 * Leaflet usa `window`/`document`: el mapa se carga solo en el cliente, en un fragmento
 * aparte (no bloquea el listado ni se descarga en móvil hasta que se abre el modo Mapa).
 */
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <MapPlaceholder text="Cargando mapa…" />,
});

function MapPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#e9e3d7] text-sm text-muted">
      {text}
    </div>
  );
}

export function PropertyMap({
  mapProps,
  shownCount,
  total,
  withoutLocation,
  onShowAll,
  popup,
}: {
  mapProps: MapViewProps;
  shownCount: number;
  total: number;
  withoutLocation: number;
  onShowAll: () => void;
  popup: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2">
        <p className="min-w-0 text-xs leading-snug text-muted">
          <span className="font-semibold text-charcoal">Mapa de esta página:</span>{" "}
          {formatNumber(shownCount)} {shownCount === 1 ? "propiedad" : "propiedades"} de{" "}
          {formatNumber(total)} resultados
          {withoutLocation > 0 && ` · ${withoutLocation} sin ubicación`}. Ubicaciones publicadas por
          la fuente.
        </p>
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex min-h-11 items-center text-xs font-bold tracking-[0.12em] text-forest uppercase underline-offset-4 hover:underline"
        >
          Ver todas
        </button>
      </div>
      <div className="relative isolate min-h-0 flex-1">
        <noscript>
          <MapPlaceholder text="El mapa requiere JavaScript." />
        </noscript>
        <MapView {...mapProps} />
        {popup && (
          // Móvil: abajo (tarjeta compacta). Escritorio: arriba a la derecha, siempre visible
          // aunque el mapa sobrepase el borde inferior de la ventana.
          <div className="pointer-events-none absolute inset-x-3 bottom-8 z-1100 flex justify-center sm:justify-start lg:inset-x-auto lg:top-3 lg:right-3 lg:bottom-auto lg:w-[min(22rem,calc(100%-5.5rem))]">
            {popup}
          </div>
        )}
      </div>
    </div>
  );
}
