import Image from "next/image";
import type { ReactNode } from "react";

import { HeroArtwork } from "./HeroArtwork";

export interface HeroImage {
  /** Ruta en /public o importación estática. */
  src: string;
  alt: string;
}

/**
 * Hero editorial. `image` es opcional: cuando exista una fotografía arquitectónica con
 * licencia (p. ej. /public/images/hero-medellin.jpg) basta con pasarla aquí. Mientras tanto
 * se muestra una ilustración vectorial identificada como tal.
 * La altura es mínima y fluida (nunca rígida): el contenido y el buscador nunca se cortan.
 */
export function Hero({ image, search }: { image?: HeroImage; search: ReactNode }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[clamp(36rem,88svh,56rem)] flex-col justify-end overflow-hidden bg-forest text-ivory"
    >
      {image ? (
        <Image src={image.src} alt={image.alt} fill priority sizes="100vw" className="-z-20 object-cover" />
      ) : (
        <div className="absolute inset-0 -z-20">
          <HeroArtwork />
        </div>
      )}
      {/* Overlay para garantizar la legibilidad del texto sobre la imagen */}
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(15,31,26,0.55)_0%,rgba(15,31,26,0.25)_38%,rgba(15,31,26,0.8)_100%)]"
        aria-hidden="true"
      />
      {!image && (
        <span className="absolute top-4 right-4 text-[0.6875rem] font-semibold tracking-[0.2em] text-ivory/70 uppercase sm:right-6">
          Ilustración
        </span>
      )}

      <div className="container-editorial pt-24 pb-8 sm:pt-28 md:pb-12 lg:pb-16">
        <div className="max-w-3xl">
          <p className="eyebrow reveal flex items-center gap-4 text-champagne">
            <span className="rule-gold" aria-hidden="true" />
            Bienes raíces en Medellín
          </p>
          <h1 id="hero-title" className="text-display reveal reveal-delay mt-6 text-ivory">
            Espacios extraordinarios.
            <br />
            <em className="font-normal text-champagne">Oportunidades excepcionales.</em>
          </h1>
          <p className="text-lead reveal reveal-delay mt-6 max-w-xl text-ivory/85">
            Descubre las mejores propiedades en Medellín, con el respaldo y la experiencia de
            Medellin Advisors.
          </p>
        </div>

        <div className="reveal reveal-delay mt-10 md:mt-14">{search}</div>
      </div>
    </section>
  );
}
