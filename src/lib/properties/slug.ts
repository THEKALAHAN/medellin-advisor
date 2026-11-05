/** Slug ASCII en minúsculas: "Los Balsos No.1" → "los-balsos-no-1". */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Identificador de barrio "CC-BB" (solo dígitos: seguro para SQL). */
export const NEIGHBORHOOD_ID_PATTERN = /^(\d{1,4})-(\d{1,4})$/;

/** Colapsa espacios repetidos y recorta: "B. Cerro  El Volador" → "B. Cerro El Volador". */
export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
