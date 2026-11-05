/** Formato de presentación (es-CO). No contiene reglas de negocio. */

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const areaFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const monthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

/** "$ 585.000.000" */
export function formatCOP(value: number): string {
  return copFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** "114 m²" */
export function formatArea(value: number): string {
  return `${areaFormatter.format(value)} m²`;
}

/** "agosto de 2023" a partir de una fecha ISO; null si no es válida. */
export function formatMonth(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : monthFormatter.format(date);
}

const millionsShort = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const millionsLong = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Precio compacto para marcadores: "$850 mil", "$4,4 M", "$585 M", "$1.300 M". */
export function formatCompactCOP(value: number): string {
  const millions = value / 1_000_000;
  if (millions < 1) return `$${formatNumber(Math.round(value / 1000))} mil`;
  return `$${(millions < 10 ? millionsShort : millionsLong).format(millions)} M`;
}

/** "Casa Lote" a partir de "CASA_LOTE" (respaldo cuando la fuente no trae etiqueta). */
export function humanizeCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
