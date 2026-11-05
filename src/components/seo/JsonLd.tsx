import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * Datos estructurados JSON-LD. Solo tipos que describen el sitio y su navegación (WebSite,
 * BreadcrumbList): nunca `Offer` ni `RealEstateListing`, que presentarían ofertas históricas
 * (agosto de 2023) como disponibles.
 * `<` se escapa para que el contenido no pueda cerrar la etiqueta <script>.
 */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description: SITE_DESCRIPTION,
        inLanguage: "es-CO",
      }}
    />
  );
}

/** Ruta de navegación; el último elemento es la página actual. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      }}
    />
  );
}
