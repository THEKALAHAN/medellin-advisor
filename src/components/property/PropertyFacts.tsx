import type { ReactNode } from "react";

import { IconArea, IconBath, IconBed, IconCar } from "@/components/ui/icons";
import { formatArea } from "@/lib/format";
import type { Property } from "@/types/property";

/**
 * Características principales. Los datos nulos no se muestran (no se convierten en 0),
 * salvo el área, que se indica expresamente como «Área no reportada».
 */
export function PropertyFacts({ property }: { property: Property }) {
  const facts: { key: string; icon: ReactNode; label: string; srLabel: string }[] = [];

  if (property.bedrooms !== null) {
    facts.push({
      key: "bedrooms",
      icon: <IconBed size={18} />,
      label: String(property.bedrooms),
      srLabel: property.bedrooms === 1 ? "habitación" : "habitaciones",
    });
  }
  if (property.bathrooms !== null) {
    facts.push({
      key: "bathrooms",
      icon: <IconBath size={18} />,
      label: String(property.bathrooms),
      srLabel: property.bathrooms === 1 ? "baño" : "baños",
    });
  }
  if (property.garages !== null) {
    facts.push({
      key: "garages",
      icon: <IconCar size={18} />,
      label: String(property.garages),
      srLabel: property.garages === 1 ? "garaje" : "garajes",
    });
  }
  facts.push({
    key: "area",
    icon: <IconArea size={18} />,
    label: property.areaM2 !== null ? formatArea(property.areaM2) : "Área no reportada",
    srLabel: property.areaM2 !== null ? "de área privada" : "",
  });

  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-charcoal">
      {facts.map((fact) => (
        <li key={fact.key} className="inline-flex items-center gap-1.5">
          <span className="text-champagne-deep">{fact.icon}</span>
          <span>
            {fact.label}
            {fact.srLabel && <span className="sr-only"> {fact.srLabel}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
