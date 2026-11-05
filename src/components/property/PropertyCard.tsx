import Link from "next/link";

import { IconPin } from "@/components/ui/icons";
import { FILTER_STRATA, findCommuneByCode } from "@/lib/properties/catalog";
import { formatMonth } from "@/lib/format";
import type { Property } from "@/types/property";

import { PriceTag } from "./PriceTag";
import { PropertyArtwork } from "./PropertyArtwork";
import { PropertyFacts } from "./PropertyFacts";

function communeName(property: Property): string | null {
  const { communeCode, commune } = property.location;
  if (communeCode) {
    const known = findCommuneByCode(communeCode);
    if (known) return known.name;
  }
  return commune;
}

/**
 * Tarjeta de una oferta real de la fuente pública. Toda la tarjeta enlaza a la ficha
 * `/propiedades/[objectid]` (enlace «estirado» desde el título); los controles superpuestos
 * conservan su propia acción. No se enlaza al anuncio original: es demostrativo y el enlace
 * de 2023 puede ya no existir.
 */
export function PropertyCard({ property }: { property: Property }) {
  const commune = communeName(property);
  const neighborhood = property.location.neighborhood;
  const title = neighborhood ?? commune ?? "Ubicación no reportada";
  const subtitle = neighborhood && commune ? commune : null;
  const published = formatMonth(property.publishedAt);
  // Solo se muestran los estratos convencionales 1–6; 0 y 7 no están documentados por la fuente.
  const stratum =
    property.stratum !== null && (FILTER_STRATA as readonly number[]).includes(property.stratum)
      ? property.stratum
      : null;

  return (
    <article className="group relative flex h-full flex-col bg-surface shadow-[0_1px_0_rgba(41,40,35,0.06)] ring-1 ring-line/70 transition-shadow duration-500 hover:shadow-[0_28px_50px_-30px_rgba(23,45,37,0.45)]">
      <div className="relative">
        <PropertyArtwork type={property.propertyType.code} />
        <span className="absolute top-4 left-4 bg-ivory px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.18em] text-forest uppercase">
          {property.operation.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div>
          <p className="eyebrow text-champagne-deep">{property.propertyType.label}</p>
          <h3 className="mt-2 text-[1.5rem] wrap-anywhere text-forest">
            <Link
              href={`/propiedades/${property.id}`}
              className="underline-offset-4 after:absolute after:inset-0 after:content-[''] group-hover:underline focus-visible:underline"
            >
              {title}
              <span className="sr-only">
                {" "}
                · {property.propertyType.label} en {property.operation.label.toLowerCase()}, ver ficha
              </span>
            </Link>
          </h3>
          {subtitle && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted">
              <IconPin size={16} className="text-champagne-deep" />
              {subtitle}
            </p>
          )}
        </div>

        <PriceTag price={property.price} operation={property.operation.code} />
        <PropertyFacts property={property} />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-4 text-xs text-muted">
          <span>
            {stratum !== null && <>Estrato {stratum} · </>}
            {published ? `Publicado en ${published}` : "Fecha no reportada"}
          </span>
        </div>
      </div>
    </article>
  );
}
