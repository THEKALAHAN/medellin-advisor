import "server-only";

import { getPropertyFacets } from "@/lib/properties/facets";
import { COMMUNES, OPERATIONS, PROPERTY_TYPES } from "@/lib/properties/catalog";
import { humanizeCode } from "@/lib/format";
import type { PropertyFacets } from "@/types/property";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SearchOptions {
  operations: SelectOption[];
  types: SelectOption[];
  communes: SelectOption[];
  /** Barrios por slug de comuna (valor = slug del barrio, que la API resuelve con `commune`). */
  neighborhoodsByCommune: Record<string, SelectOption[]>;
  /** false si las facetas no estaban disponibles y se usaron solo las listas blancas. */
  fromFacets: boolean;
}

/**
 * Facetas sin romper la página: si ArcGIS falla, se devuelve null y los formularios usan
 * las listas blancas del catálogo (mismos valores que acepta la API).
 */
export async function loadFacetsSafely(): Promise<PropertyFacets | null> {
  try {
    return await getPropertyFacets();
  } catch (error) {
    console.error("[search] Facetas no disponibles; se usa el catálogo", error);
    return null;
  }
}

/** Opciones de búsqueda derivadas de las facetas (o del catálogo como respaldo). */
export function buildSearchOptions(facets: PropertyFacets | null): SearchOptions {
  const operations = Object.entries(OPERATIONS).map(([value, op]) => ({ value, label: op.label }));

  const typeLabels = new Map(facets?.types.map((t) => [t.slug, t.label]) ?? []);
  const typeOrder = facets?.types.map((t) => t.slug) ?? Object.keys(PROPERTY_TYPES);
  const types = typeOrder
    .filter((slug) => Object.hasOwn(PROPERTY_TYPES, slug))
    .map((slug) => ({
      value: slug,
      label:
        typeLabels.get(slug) ?? humanizeCode(PROPERTY_TYPES[slug as keyof typeof PROPERTY_TYPES]),
    }));

  const communes = facets
    ? facets.communes
        .filter((c) => Object.hasOwn(COMMUNES, c.slug))
        .map((c) => ({ value: c.slug, label: c.name }))
    : Object.entries(COMMUNES)
        .map(([value, c]) => ({ value, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "es"));

  const neighborhoodsByCommune: Record<string, SelectOption[]> = {};
  for (const n of facets?.neighborhoods ?? []) {
    (neighborhoodsByCommune[n.communeSlug] ??= []).push({ value: n.slug, label: n.name });
  }

  return { operations, types, communes, neighborhoodsByCommune, fromFacets: facets !== null };
}
