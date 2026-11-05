/** Navegación principal: todos los destinos existen (página o sección real). */
export const MAIN_NAV = [
  { href: "/propiedades", label: "Buscar propiedades" },
  { href: "/#nosotros", label: "Acerca de nosotros" },
  // El pie de página (con id="contacto") está presente en todas las páginas.
  { href: "#contacto", label: "Contacto" },
] as const;
