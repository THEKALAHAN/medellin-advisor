import type { Property } from "@/types/property";

import { PropertyCard } from "./PropertyCard";

/**
 * Rejillas de tarjetas:
 * - `full`: ancho completo (1 → 2 → 3 columnas según el viewport).
 * - `split`: columna junto al mapa; usa container queries (requiere un ancestro `@container`):
 *   1 columna en contenedores estrechos y 2 a partir de 36rem.
 */
export const PROPERTY_GRID_CLASSES = {
  full: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8",
  split: "grid gap-6 @xl:grid-cols-2",
} as const;

/** Una columna en móvil, dos en tablet y tres en escritorio. */
export function PropertyGrid({ properties }: { properties: Property[] }) {
  return (
    <ul className={PROPERTY_GRID_CLASSES.full}>
      {properties.map((property) => (
        <li key={property.id}>
          <PropertyCard property={property} />
        </li>
      ))}
    </ul>
  );
}

/** Esqueleto con las mismas proporciones que las tarjetas (evita saltos de diseño). */
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className={PROPERTY_GRID_CLASSES.full} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="animate-pulse bg-surface ring-1 ring-line/70">
          <div className="aspect-[16/10] bg-forest/15" />
          <div className="space-y-4 p-6">
            <div className="h-3 w-24 bg-line" />
            <div className="h-6 w-3/4 bg-line" />
            <div className="h-7 w-1/2 bg-line" />
            <div className="h-4 w-2/3 bg-line" />
          </div>
        </li>
      ))}
    </ul>
  );
}
