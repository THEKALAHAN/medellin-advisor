import type { Metadata } from "next";

/**
 * Identidad y URL pública del sitio, usadas en metadatos, canonical, sitemap y robots.
 *
 * Origen de la URL, por orden de prioridad:
 * 1. `SITE_URL` (dominio definitivo, p. ej. https://www.ejemplo.com).
 * 2. `VERCEL_PROJECT_PRODUCTION_URL`, que Vercel define automáticamente con el dominio de producción.
 * 3. `http://localhost:<PORT>` en desarrollo o en ejecución local.
 * Un valor mal formado en `SITE_URL` detiene la compilación en lugar de publicar URLs incorrectas.
 */
function resolveSiteUrl(): URL {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) {
    const url = new URL(explicit);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`SITE_URL debe usar http o https: ${explicit}`);
    }
    return new URL(url.origin);
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);
  return new URL(`http://localhost:${process.env.PORT ?? 3000}`);
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Medellin Advisors";
export const SITE_DESCRIPTION =
  "Explora ofertas inmobiliarias de venta y arriendo en Medellín por comuna, tipo de inmueble y precio, con datos públicos de la Alcaldía de Medellín.";

/** URL absoluta de una ruta del sitio. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Campos de Open Graph compartidos. Next.js combina los metadatos de forma superficial: una
 * página que define `openGraph` sustituye el objeto completo del layout, por eso las páginas
 * deben partir de esta base.
 */
export const BASE_OPEN_GRAPH = {
  type: "website",
  locale: "es_CO",
  siteName: SITE_NAME,
} as const satisfies Metadata["openGraph"];

/**
 * Imagen institucional para redes sociales (1200×630, logotipo, tipografías y paleta del sitio).
 * Se declara explícitamente en cada página: con la convención de archivo `opengraph-image`, una
 * página que define su propio `openGraph` perdía la imagen (combinación superficial).
 */
const SOCIAL_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} · Bienes raíces en Medellín`,
};

/** Título, descripción e imagen coherentes en Open Graph y Twitter Cards. */
export function socialMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Se omite en el layout: una URL fija se heredaría en páginas que no la corresponden. */
  path?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { ...BASE_OPEN_GRAPH, title, description, images: [SOCIAL_IMAGE], ...(path ? { url: path } : {}) },
    twitter: { card: "summary_large_image", title, description, images: [SOCIAL_IMAGE] },
  };
}
