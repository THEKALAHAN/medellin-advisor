import type { PropertyTypeCode } from "@/types/property";

/**
 * Ilustración lineal por familia de inmueble. La fuente pública no tiene fotografías y no se
 * inventan imágenes: esta pieza es explícitamente ilustrativa (lleva la etiqueta «Ilustración»)
 * y no representa el inmueble anunciado.
 */
type Family = "tower" | "house" | "office" | "retail" | "warehouse" | "land";

const FAMILY: Record<PropertyTypeCode, Family> = {
  APARTAMENTO: "tower",
  ESTUDIO: "tower",
  HABITACION: "tower",
  CASA: "house",
  CASA_LOTE: "house",
  OFICINA: "office",
  CONSULTORIO: "office",
  LOCAL: "retail",
  BODEGA: "warehouse",
  LOTE: "land",
};

function Building({ family }: { family: Family }) {
  switch (family) {
    case "tower":
      return (
        <g>
          <path d="M150 230V62h70v168M220 230V96h46v134" />
          <path d="M165 82h40M165 104h40M165 126h40M165 148h40M165 170h40M165 192h40M232 116h22M232 140h22M232 164h22M232 188h22" opacity=".7" />
          <path d="M185 230v-22h20v22" />
        </g>
      );
    case "house":
      return (
        <g>
          <path d="M120 230v-88l80-52 80 52v88" />
          <path d="M104 152 200 88l96 64" />
          <path d="M184 230v-46h32v46M138 166h30v26h-30zM232 166h30v26h-30z" opacity=".8" />
        </g>
      );
    case "office":
      return (
        <g>
          <path d="M140 230V70h120v160M140 70l20-14h80l20 14" />
          <path d="M160 92v120M180 92v120M200 92v120M220 92v120M240 92v120" opacity=".55" />
          <path d="M140 112h120M140 152h120M140 192h120" opacity=".8" />
        </g>
      );
    case "retail":
      return (
        <g>
          <path d="M116 230V130h168v100M108 130h184l-12-30H120z" />
          <path d="M136 230v-72h52v72M206 158h58v44h-58z" opacity=".8" />
          <path d="M120 100v-10h160v10" opacity=".6" />
        </g>
      );
    case "warehouse":
      return (
        <g>
          <path d="M96 230V128l104-46 104 46v102" />
          <path d="M144 230v-64h112v64M144 182h112M144 198h112M144 214h112" opacity=".75" />
        </g>
      );
    case "land":
      return (
        <g>
          <path d="M84 214 140 170l44 18 52-40 80 66" />
          <path d="M150 128v-20M150 108l-14 16M150 108l14 16" opacity=".8" />
          <path d="M96 230h208" strokeDasharray="6 8" opacity=".7" />
        </g>
      );
  }
}

export function PropertyArtwork({
  type,
  className = "aspect-[16/10]",
}: {
  type: PropertyTypeCode;
  /** Proporción u otras clases del contenedor (por defecto 16:10, la de las tarjetas). */
  className?: string;
}) {
  return (
    <div className={`relative w-full overflow-hidden bg-forest ${className}`}>
      <svg
        viewBox="0 0 400 250"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="400" height="250" fill="#1f3b33" />
        {/* Cordillera del Valle de Aburrá */}
        <path
          d="M0 170 46 132l38 22 54-56 48 40 40-30 58 48 44-28 72 52v90H0Z"
          fill="#1d3a32"
          opacity=".9"
        />
        <g fill="none" stroke="#c6a36a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <Building family={FAMILY[type]} />
          <path d="M40 230h320" opacity=".9" />
        </g>
        <circle cx="318" cy="64" r="16" fill="none" stroke="#c6a36a" strokeWidth="1" opacity=".55" />
      </svg>
      <span className="absolute right-3 bottom-2 text-[0.6875rem] font-semibold tracking-[0.18em] text-ivory/70 uppercase">
        Ilustración
      </span>
    </div>
  );
}
