import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * Todo el sitio es rastreable salvo la API interna (JSON para la interfaz, sin valor para
 * buscadores). Las búsquedas no indexables se controlan con `noindex` en cada página, no aquí:
 * bloquearlas en robots.txt impediría que los buscadores vieran esa directiva.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
