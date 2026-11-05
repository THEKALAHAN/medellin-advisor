import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { PropertyLocationMap } from "@/components/map/PropertyLocationMap";
import { toMapPoints } from "@/components/map/points";
import { BackToResults } from "@/components/property/BackToResults";
import { AMENITY_LABELS, CATEGORY_LABELS } from "@/components/property/labels";
import { PriceTag } from "@/components/property/PriceTag";
import { PropertyFacts } from "@/components/property/PropertyFacts";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { PropertyNotFound } from "@/components/property/PropertyNotFound";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { DataNotice } from "@/components/ui/DataNotice";
import { IconPin } from "@/components/ui/icons";
import { ArcGisError } from "@/lib/arcgis/client";
import { formatArea, formatCOP, formatMonth, humanizeCode } from "@/lib/format";
import { FILTER_STRATA, findCommuneByCode } from "@/lib/properties/catalog";
import { QUALITY_FLAG_RULES } from "@/lib/properties/data-policy";
import { parsePropertyId } from "@/lib/properties/query-params";
import { getPropertyById } from "@/lib/properties/service";
import { socialMetadata } from "@/lib/site";
import type { PropertyDetail } from "@/types/property";

type LoadResult =
  | { kind: "ok"; property: PropertyDetail }
  | { kind: "not-found" }
  | { kind: "upstream-error" };

/**
 * Estados de la ficha:
 * - Identificador mal formado: el Proxy ya responde 404 real antes de llegar aquí; se mantiene
 *   la comprobación como defensa.
 * - Inexistente o excluido por la política de calidad: «no encontrada» renderizado en el servidor
 *   con `noindex`. Con Partial Prefetching el estado HTTP ya se envió como 200 (ver proxy.ts);
 *   `notFound()` aquí solo se dibujaría en el cliente, por eso se renderiza el estado en línea.
 */
async function loadProperty(rawId: string): Promise<LoadResult> {
  const id = parsePropertyId(rawId);
  if (id === null) return { kind: "not-found" };
  try {
    const property = await getPropertyById(id);
    return property ? { kind: "ok", property } : { kind: "not-found" };
  } catch (error) {
    if (!(error instanceof ArcGisError)) throw error;
    console.error(`[propiedades/${id}] ${error.kind}: ${error.message}`);
    return { kind: "upstream-error" };
  }
}

function communeName(property: PropertyDetail): string | null {
  const { communeCode, commune } = property.location;
  return (communeCode ? findCommuneByCode(communeCode)?.name : null) ?? commune;
}

/** Título descriptivo construido solo con datos reales: «Apartamento en arriendo en Laureles». */
function buildTitle(property: PropertyDetail): string {
  const place = property.location.neighborhood ?? communeName(property);
  const base = `${property.propertyType.label} en ${property.operation.label.toLowerCase()}`;
  return place ? `${base} en ${place}` : base;
}

const NOT_FOUND_METADATA: Metadata = {
  title: "Propiedad no encontrada",
  robots: { index: false, follow: true },
};

export async function generateMetadata(props: PageProps<"/propiedades/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const result = await loadProperty(id);
  if (result.kind === "not-found") return NOT_FOUND_METADATA;
  if (result.kind === "upstream-error") return { title: "Ficha de propiedad", robots: { index: false } };
  const { property } = result;

  const commune = communeName(property);
  const facts = [
    `${formatCOP(property.price)}${property.operation.code === "RENT" ? " al mes" : ""}`,
    property.bedrooms !== null ? `${property.bedrooms} habitaciones` : null,
    property.bathrooms !== null ? `${property.bathrooms} baños` : null,
    property.areaM2 !== null ? formatArea(property.areaM2) : null,
  ].filter(Boolean);
  const where = [property.location.neighborhood, commune].filter(Boolean).join(", ");
  const title = buildTitle(property);
  const description = `${property.propertyType.label} en ${property.operation.label.toLowerCase()}${where ? ` en ${where}, Medellín` : " en Medellín"}: ${facts.join(", ")}. Oferta histórica publicada en agosto de 2023.`;
  const path = `/propiedades/${property.id}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...socialMetadata({ title, description, path }),
  };
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-8">
      <h2 id={id} className="text-[1.9rem] text-forest">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Lista de pares dato–valor; los valores nulos no se pasan (no se muestran como 0). */
function FactList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:gap-x-8 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 border-b border-line pb-3">
          <dt className="field-label">{item.label}</dt>
          <dd className="mt-1 font-medium wrap-anywhere text-charcoal">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PropertyView({ property }: { property: PropertyDetail }) {
  const commune = communeName(property);
  const neighborhood = property.location.neighborhood;
  const title = buildTitle(property);
  const stratum =
    property.stratum !== null && (FILTER_STRATA as readonly number[]).includes(property.stratum)
      ? property.stratum
      : null;
  const published = formatMonth(property.publishedAt);
  const updated = formatMonth(property.updatedAt);
  const [point] = toMapPoints([property]);
  const flags = QUALITY_FLAG_RULES.filter((rule) => property.qualityFlags.includes(rule.id));

  const mainFacts: { label: string; value: ReactNode }[] = [
    { label: "Tipo de inmueble", value: property.propertyType.label },
    { label: "Operación", value: property.operation.label },
    { label: "Área privada", value: property.areaM2 !== null ? formatArea(property.areaM2) : "No reportada" },
  ];
  if (property.bedrooms !== null) mainFacts.push({ label: "Habitaciones", value: property.bedrooms });
  if (property.bathrooms !== null) mainFacts.push({ label: "Baños", value: property.bathrooms });
  if (property.garages !== null) mainFacts.push({ label: "Garajes", value: property.garages });
  if (stratum !== null) mainFacts.push({ label: "Estrato", value: stratum });
  if (property.pricePerM2 !== null) {
    mainFacts.push({ label: "Precio por m²", value: formatCOP(property.pricePerM2) });
  }

  const extraFacts: { label: string; value: ReactNode }[] = [];
  if (property.category) {
    extraFacts.push({ label: "Categoría", value: CATEGORY_LABELS[property.category] ?? humanizeCode(property.category) });
  }
  if (property.age) extraFacts.push({ label: "Antigüedad", value: property.age });
  if (property.floor !== null) extraFacts.push({ label: "Piso", value: property.floor });
  if (property.location.originalAddress) {
    extraFacts.push({ label: "Sector indicado en el anuncio", value: property.location.originalAddress });
  }
  if (property.sourceCode) extraFacts.push({ label: "Código del anuncio", value: property.sourceCode });
  if (published) extraFacts.push({ label: "Publicado", value: published });
  if (updated && updated !== published) extraFacts.push({ label: "Actualizado", value: updated });

  // Presentación informativa construida solo con datos reales (sin afirmaciones comerciales).
  const location = [neighborhood && `el barrio ${neighborhood}`, commune && `la comuna ${commune}`]
    .filter(Boolean)
    .join(", ");
  const features = [
    property.bedrooms !== null && `${property.bedrooms} ${property.bedrooms === 1 ? "habitación" : "habitaciones"}`,
    property.bathrooms !== null && `${property.bathrooms} ${property.bathrooms === 1 ? "baño" : "baños"}`,
    property.areaM2 !== null && `${formatArea(property.areaM2)} de área privada`,
  ].filter(Boolean) as string[];
  const featureText =
    features.length > 1 ? `${features.slice(0, -1).join(", ")} y ${features.at(-1)}` : features[0];

  return (
    <article className="container-editorial py-10 lg:py-14">
      <BreadcrumbJsonLd
        items={[
          { name: "Inicio", path: "/" },
          { name: "Propiedades", path: "/propiedades" },
          { name: title, path: `/propiedades/${property.id}` },
        ]}
      />
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <BackToResults />
        <span className="hidden text-muted sm:inline" aria-hidden="true">/</span>
        <span className="hidden text-sm text-muted sm:inline">Ficha de la propiedad</span>
      </nav>

      <header className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-4 text-champagne-deep">
            <span className="rule-gold" aria-hidden="true" />
            {property.propertyType.label} · {property.operation.label}
          </p>
          <h1 className="text-title mt-4 wrap-anywhere text-forest">{title}</h1>
          {(neighborhood || commune) && (
            <p className="mt-3 inline-flex items-center gap-2 text-muted">
              <IconPin size={18} className="shrink-0 text-champagne-deep" />
              {[neighborhood, commune].filter(Boolean).join(" · ")}
              <span className="sr-only">, Medellín</span>
            </p>
          )}
        </div>
        <div className="lg:text-right">
          <p className="field-label">{property.operation.code === "RENT" ? "Canon mensual publicado" : "Precio publicado"}</p>
          <PriceTag price={property.price} operation={property.operation.code} className="mt-1 lg:justify-end [&>span:first-child]:text-[2.1rem]" />
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0 space-y-10">
          <PropertyGallery type={property.propertyType.code} typeLabel={property.propertyType.label} />

          <div className="bg-surface p-5 ring-1 ring-line sm:p-6">
            <PropertyFacts property={property} />
          </div>

          <Section id="caracteristicas" title="Características">
            <FactList items={mainFacts} />
          </Section>

          <Section id="presentacion" title="Presentación">
            <p className="text-lead max-w-2xl text-charcoal">
              {property.propertyType.label} en {property.operation.label.toLowerCase()}
              {location ? ` ubicado en ${location}, Medellín` : " en Medellín"}.
              {featureText ? ` Según la oferta publicada, cuenta con ${featureText}.` : ""}
            </p>
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Texto generado a partir de los datos estructurados de la fuente. No se muestra la
              descripción original del anuncio.
            </p>
          </Section>

          <Section id="amenidades" title="Amenidades reportadas">
            {property.amenities.length > 0 ? (
              <ul className="grid grid-cols-2 gap-x-5 gap-y-2 sm:gap-x-6 lg:grid-cols-3">
                {property.amenities.map((amenity) => (
                  <li key={amenity} className="flex min-h-11 min-w-0 items-center gap-2.5 border-b border-line text-[0.9375rem] sm:gap-3 sm:text-base">
                    <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-champagne" aria-hidden="true" />
                    {AMENITY_LABELS[amenity]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">La oferta original no reporta amenidades.</p>
            )}
            <p className="mt-4 max-w-2xl text-sm text-muted">
              Solo se listan las amenidades reportadas en la oferta original. Que una amenidad no
              aparezca no significa que el inmueble no la tenga.
            </p>
          </Section>

          {extraFacts.length > 0 && (
            <Section id="informacion-adicional" title="Información adicional">
              <FactList items={extraFacts} />
            </Section>
          )}
        </div>

        <aside className="min-w-0 space-y-8 lg:sticky lg:top-28 lg:self-start" aria-label="Ubicación y fuente">
          <section aria-labelledby="ubicacion" className="bg-surface p-5 ring-1 ring-line sm:p-6">
            <h2 id="ubicacion" className="text-[1.7rem] text-forest">
              Ubicación
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              {commune && (
                <div>
                  <dt className="field-label">Comuna</dt>
                  <dd className="mt-0.5 font-medium">{commune}</dd>
                </div>
              )}
              {neighborhood && (
                <div>
                  <dt className="field-label">Barrio</dt>
                  <dd className="mt-0.5 font-medium">{neighborhood}</dd>
                </div>
              )}
              {point ? (
                <div>
                  <dt className="field-label">Coordenadas (WGS84)</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="field-label">Coordenadas</dt>
                  <dd className="mt-0.5 font-medium">No reportadas</dd>
                </div>
              )}
            </dl>
            {point && (
              <div className="mt-5">
                <PropertyLocationMap point={point} />
                <p className="mt-2 text-xs text-muted">
                  Ubicación tal como la publica la fuente. No se muestra una dirección exacta.
                </p>
              </div>
            )}
          </section>

          <section aria-labelledby="fuente" className="space-y-4">
            <h2 id="fuente" className="sr-only">
              Fuente de los datos
            </h2>
            <DataNotice />
            {flags.length > 0 && (
              <ul className="space-y-2 text-sm text-muted">
                {flags.map((flag) => (
                  <li key={flag.id} className="border-l-2 border-line pl-3">
                    {flag.description}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}

function UpstreamError({ id }: { id: string }) {
  return (
    <div className="container-editorial py-16">
      <BackToResults />
      <div role="status" className="mt-8 border border-line bg-surface px-6 py-12 text-center sm:px-10">
        <h1 className="text-[2rem] text-forest">La fuente de datos no respondió</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          El servicio público de la Alcaldía de Medellín no está disponible en este momento o tardó
          demasiado en responder. Inténtalo de nuevo en unos segundos.
        </p>
        <a href={`/propiedades/${id}`} className="btn btn-primary mt-8">
          Reintentar
        </a>
      </div>
    </div>
  );
}

/** Esqueleto de la ficha (mismas proporciones, sin datos ficticios). */
function PropertySkeleton() {
  return (
    <div className="container-editorial py-10 lg:py-14" aria-busy="true" aria-label="Cargando la ficha de la propiedad">
      <div className="h-11 w-56 animate-pulse bg-line/70" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-4">
          <div className="h-3 w-40 animate-pulse bg-line" />
          <div className="h-12 w-full max-w-2xl animate-pulse bg-line" />
          <div className="h-4 w-56 animate-pulse bg-line" />
        </div>
        <div className="h-10 w-48 animate-pulse bg-line" />
      </div>
      <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
        <div className="space-y-10">
          <div className="aspect-[16/10] w-full animate-pulse bg-forest/15 lg:aspect-[16/9]" />
          <div className="h-16 animate-pulse bg-surface ring-1 ring-line" />
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse bg-line/70" />
            ))}
          </div>
        </div>
        <div className="h-96 animate-pulse bg-surface ring-1 ring-line" />
      </div>
    </div>
  );
}

/**
 * Lee `params` y consulta la propiedad dentro de `<Suspense>`: los datos de la URL son datos de
 * petición, y leerlos fuera de un límite Suspense bloquea la navegación instantánea (advertencia
 * «Next.js encountered URL data outside of Suspense»). El App Shell y el esqueleto se muestran
 * al instante; la ficha se transmite cuando resuelve.
 */
async function PropertyContent({ params }: { params: PageProps<"/propiedades/[id]">["params"] }) {
  const { id } = await params;
  const result = await loadProperty(id);
  if (result.kind === "not-found") return <PropertyNotFound />;
  if (result.kind === "upstream-error") return <UpstreamError id={id} />;
  return <PropertyView property={result.property} />;
}

export default function PropertyPage(props: PageProps<"/propiedades/[id]">) {
  return (
    <Suspense fallback={<PropertySkeleton />}>
      <PropertyContent params={props.params} />
    </Suspense>
  );
}

