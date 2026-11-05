import type { MetadataRoute } from "next";

import { COMMUNES, OPERATIONS } from "@/lib/properties/catalog";
import { absoluteUrl } from "@/lib/site";

/**
 * Páginas principales y búsquedas indexables por operación y comuna (ver src/lib/seo/listing.ts).
 * Se generan desde las listas blancas del catálogo, sin consultar la fuente. Si una combinación
 * queda sin resultados, su página responde `noindex` y el buscador la descarta.
 * Las fichas individuales no se listan aquí (decisión pendiente, ver README): se descubren por
 * los enlaces del listado.
 * Sin `lastModified`: los datos son históricos (agosto de 2023) y el sitio no tiene una fecha de
 * modificación fiable que declarar.
 * Next.js no escapa `<loc>`: el `&` de las búsquedas se escapa aquí para que el XML sea válido.
 */
const escapeXml = (value: string) => value.replaceAll("&", "&amp;");

export default function sitemap(): MetadataRoute.Sitemap {
  const searches = Object.keys(OPERATIONS).flatMap((operation) => [
    `/propiedades?operation=${operation}`,
    ...Object.keys(COMMUNES).map((commune) => `/propiedades?operation=${operation}&commune=${commune}`),
  ]);
  return ["/", "/propiedades", ...searches].map((path) => ({ url: escapeXml(absoluteUrl(path)) }));
}
