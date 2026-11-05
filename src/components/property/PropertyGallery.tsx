import Image from "next/image";

import type { PropertyTypeCode } from "@/types/property";

import { PropertyArtwork } from "./PropertyArtwork";

export interface PropertyPhoto {
  src: string;
  alt: string;
}

/**
 * Recurso visual de la ficha. Preparado para fotografías reales (`photos`), que la fuente
 * pública no proporciona hoy: mientras tanto se muestra la ilustración del tipo de inmueble,
 * identificada como «Ilustración» y acompañada de una nota explícita.
 */
export function PropertyGallery({
  type,
  typeLabel,
  photos = [],
}: {
  type: PropertyTypeCode;
  typeLabel: string;
  photos?: PropertyPhoto[];
}) {
  if (photos.length > 0) {
    const [cover, ...rest] = photos;
    return (
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden bg-forest">
          <Image src={cover.src} alt={cover.alt} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" />
        </div>
        {rest.length > 0 && (
          <div className="hidden gap-2 sm:grid">
            {rest.slice(0, 2).map((photo) => (
              <div key={photo.src} className="relative overflow-hidden bg-forest">
                <Image src={photo.src} alt={photo.alt} fill sizes="30vw" className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <figure>
      <PropertyArtwork type={type} className="aspect-[16/10] lg:aspect-[16/9]" />
      <figcaption className="mt-2 text-xs text-muted">
        Ilustración de referencia para {typeLabel.toLowerCase()}. La fuente pública no incluye
        fotografías del inmueble.
      </figcaption>
    </figure>
  );
}
