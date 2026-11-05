import { COMMUNES, OPERATIONS, PROPERTY_TYPES } from "@/lib/properties/catalog";
import { parsePropertySearchParams, type ParsedSearchParams } from "@/lib/properties/query-params";

/**
 * Política de indexación del listado /propiedades.
 *
 * Indexables: combinaciones de operación, tipo y comuna, con su paginación. Son búsquedas
 * con significado propio («Apartamentos en arriendo en Laureles») y un número acotado de URLs.
 * No indexables (`noindex, follow`): orden, tamaño de página, barrio, estrato, rangos de precio
 * o área y mínimos de habitaciones o baños. Multiplican las URLs sin aportar contenido distinto;
 * siguen siendo navegables y sus enlaces a fichas se pueden rastrear.
 * Los parámetros inválidos tampoco se indexan. Los resultados vacíos y las páginas fuera de rango
 * se resuelven en la página, porque requieren conocer los datos.
 */
const INDEXABLE_PARAMS = new Set(["operation", "type", "commune", "page"]);
const CANONICAL_ORDER = ["operation", "type", "commune"] as const;

const TYPE_PLURALS: Record<keyof typeof PROPERTY_TYPES, string> = {
  apartamento: "Apartamentos",
  casa: "Casas",
  oficina: "Oficinas",
  local: "Locales",
  bodega: "Bodegas",
  consultorio: "Consultorios",
  lote: "Lotes",
  estudio: "Estudios",
  "casa-lote": "Casas lote",
  habitacion: "Habitaciones",
};

export const DEFAULT_LISTING_TITLE = "Propiedades en venta y arriendo en Medellín";
export const DEFAULT_LISTING_DESCRIPTION =
  "Busca apartamentos, casas, oficinas, locales y lotes en Medellín por comuna, barrio, tipo de inmueble, precio y área.";

export interface ListingSeo {
  title: string;
  description: string;
  /** Ruta canónica (relativa a `metadataBase`) o null si la URL no se indexa. */
  canonical: string | null;
  indexable: boolean;
  /** Parámetros validados, para comprobar resultados; null si no son válidos. */
  parsed: ParsedSearchParams | null;
}

function lookup<T>(record: Record<string, T>, key: string | null): T | null {
  return key !== null && Object.hasOwn(record, key) ? record[key] : null;
}

export function listingSeo(params: URLSearchParams): ListingSeo {
  const result = parsePropertySearchParams(params);
  if (!result.ok) {
    return {
      title: DEFAULT_LISTING_TITLE,
      description: DEFAULT_LISTING_DESCRIPTION,
      canonical: null,
      indexable: false,
      parsed: null,
    };
  }

  const typePlural = lookup(TYPE_PLURALS, params.get("type"));
  const operation = lookup(OPERATIONS, params.get("operation"));
  const commune = lookup(COMMUNES, params.get("commune"));
  const page = result.params.page;

  const isDefault = !typePlural && !operation && !commune;
  const subject = typePlural ?? "Propiedades";
  const op = operation ? `en ${operation.label.toLowerCase()}` : "en venta y arriendo";
  const place = commune ? `en ${commune.name}, Medellín` : "en Medellín";
  const base = isDefault ? DEFAULT_LISTING_TITLE : `${subject} ${op} ${place}`;
  const title = page > 1 ? `${base} · Página ${page}` : base;
  const description = isDefault
    ? DEFAULT_LISTING_DESCRIPTION
    : `${subject} ${op} ${place}: precio, área, habitaciones y ubicación de ofertas históricas (agosto de 2023) publicadas por la Alcaldía de Medellín.`;

  // Los parámetros vacíos (envío sin JavaScript del formulario) no filtran: no cuentan.
  const indexable = [...params].every(([key, value]) => value === "" || INDEXABLE_PARAMS.has(key));
  let canonical: string | null = null;
  if (indexable) {
    const canonicalParams = new URLSearchParams();
    for (const key of CANONICAL_ORDER) {
      const value = params.get(key);
      if (value) canonicalParams.set(key, value);
    }
    if (page > 1) canonicalParams.set("page", String(page));
    const query = canonicalParams.toString();
    canonical = query ? `/propiedades?${query}` : "/propiedades";
  }

  return { title, description, canonical, indexable, parsed: result.params };
}
