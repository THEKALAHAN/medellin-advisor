"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import type { MapPoint } from "./points";
import { groupMapPoints } from "./points";

function MapPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#e9e3d7] text-sm text-muted">
      Cargando mapa…
    </div>
  );
}

/** Reutiliza MapView (Leaflet, solo cliente) para mostrar la ubicación de una sola propiedad. */
const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: MapPlaceholder,
});

const noop = () => {};

/**
 * Mapa de ubicación de la ficha. En móvil está muy por debajo del primer pantallazo: Leaflet
 * (fragmento aparte) solo se descarga e inicializa cuando el contenedor se acerca a la ventana,
 * para no competir con la carga inicial.
 */
export function PropertyLocationMap({ point }: { point: MapPoint }) {
  const groups = useMemo(() => groupMapPoints([point]), [point]);
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  return (
    <div ref={ref} className="relative isolate h-72 border border-line sm:h-80 lg:h-96">
      {near ? (
        <MapView
          groups={groups}
          selectedGroupKey={groups[0].key}
          highlightedGroupKey={null}
          focus={null}
          fitRequest={0}
          visible
          onSelectGroup={noop}
        />
      ) : (
        <MapPlaceholder />
      )}
    </div>
  );
}
