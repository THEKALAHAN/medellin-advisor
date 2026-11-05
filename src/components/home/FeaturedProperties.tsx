import Link from "next/link";

import { PropertyGrid } from "@/components/property/PropertyGrid";
import { IconArrowRight } from "@/components/ui/icons";
import { parsePropertySearchParams } from "@/lib/properties/query-params";
import { resolveSearchQuery, searchProperties } from "@/lib/properties/service";
import type { Property } from "@/types/property";

/**
 * Criterio de selección (transparente y reproducible, sin elegir a mano ni inventar):
 * apartamentos de estrato 6, ordenados por el precio publicado más alto, en venta y en
 * arriendo. Se omiten los registros con indicadores de calidad, sin área, sin habitaciones
 * o sin barrio/comuna.
 * Las consultas pasan por el mismo validador y los mismos servicios que /api/properties.
 */
const FEATURED_QUERIES = [
  "operation=venta&type=apartamento&stratum=6&sort=price_desc&limit=12",
  "operation=arriendo&type=apartamento&stratum=6&sort=price_desc&limit=12",
] as const;
const PER_QUERY = 3;

async function loadFeatured(): Promise<Property[]> {
  const groups = await Promise.all(
    FEATURED_QUERIES.map(async (qs) => {
      const parsed = parsePropertySearchParams(new URLSearchParams(qs));
      if (!parsed.ok) throw new Error(`Consulta destacada inválida: ${qs}`);
      const resolved = await resolveSearchQuery(parsed.params);
      if (!resolved.ok) throw new Error(`Consulta destacada no resoluble: ${qs}`);
      const { data } = await searchProperties(resolved.query);
      return data
        .filter(
          (p) =>
            p.qualityFlags.length === 0 &&
            p.areaM2 !== null &&
            p.bedrooms !== null &&
            p.location.neighborhood !== null &&
            p.location.communeCode !== null,
        )
        .slice(0, PER_QUERY);
    }),
  );
  // Intercala venta y arriendo para una composición equilibrada.
  const [sale, rent] = groups;
  return Array.from({ length: PER_QUERY }, (_, i) => [sale[i], rent[i]]).flat().filter(
    (p): p is Property => p !== undefined,
  );
}

export async function FeaturedProperties() {
  let properties: Property[] | null = null;
  try {
    properties = await loadFeatured();
  } catch (error) {
    console.error("[home] No se pudieron cargar las propiedades destacadas", error);
  }

  if (!properties || properties.length === 0) {
    return (
      <p className="border border-line bg-surface p-6 text-muted">
        No fue posible cargar las propiedades en este momento.{" "}
        <Link href="/propiedades" className="font-semibold text-forest underline underline-offset-4">
          Ir al buscador
        </Link>
      </p>
    );
  }

  return (
    <>
      <PropertyGrid properties={properties} />
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Selección automática: apartamentos de estrato 6 con los precios publicados más altos, en
        venta y en arriendo, con ubicación y superficie reportadas. Ofertas registradas en agosto de 2023; no reflejan disponibilidad ni
        precios actuales.
      </p>
    </>
  );
}

export function FeaturedHeader() {
  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="eyebrow flex items-center gap-4 text-champagne-deep">
          <span className="rule-gold" aria-hidden="true" />
          Propiedades destacadas
        </p>
        <h2 id="destacadas-title" className="text-title mt-5 text-forest">
          Lo mejor de Medellín, en un solo lugar.
        </h2>
        <p className="text-lead mt-5 text-muted">
          Ofertas reales de venta y arriendo en las comunas de la ciudad, con su precio, superficie
          y características publicadas.
        </p>
      </div>
      <Link href="/propiedades" className="btn btn-outline shrink-0 self-start text-forest md:self-auto">
        Explorar propiedades
        <IconArrowRight size={18} />
      </Link>
    </div>
  );
}
