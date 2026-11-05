/**
 * Iconografía lineal propia (SVG en línea). `lucide-react` no está instalado y la
 * instrucción del proyecto es no añadir dependencias sin autorización.
 * Todos los iconos son decorativos por defecto (aria-hidden); el texto accesible
 * lo aporta el contexto.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconBed = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 18V6M21 18v-5a3 3 0 0 0-3-3h-8v5M3 13h18M3 18h18" />
    <circle cx="6.5" cy="10.5" r="1.5" />
  </Svg>
);

export const IconBath = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2ZM6 12V5.5A1.5 1.5 0 0 1 9 5.5M7 19l-1 2M17 19l1 2" />
  </Svg>
);

export const IconArea = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </Svg>
);

export const IconCar = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 16V11l1.8-4.2A2 2 0 0 1 8.6 5.5h6.8a2 2 0 0 1 1.8 1.3L19 11v5M5 16h14M5 16v2M19 16v2M3 11h18" />
    <circle cx="8" cy="13.5" r=".6" />
    <circle cx="16" cy="13.5" r=".6" />
  </Svg>
);

export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const IconFilters = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
);

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);

/* Iconos de la sección institucional */

export const IconExperience = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h16M6 20V10M10 20V6M14 20v-8M18 20V4" />
  </Svg>
);

export const IconAdvisory = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 11l1.8 1.8L21 9.5" />
  </Svg>
);

export const IconCity = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 20h18M5 20V11l4-2v11M9 20V5l6 3v12M15 20v-8l4 1.5V20M12 10h.01M12 13h.01M12 16h.01" />
  </Svg>
);

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5.5c0 4.3 3 8 7 9.5 4-1.5 7-5.2 7-9.5V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Svg>
);
