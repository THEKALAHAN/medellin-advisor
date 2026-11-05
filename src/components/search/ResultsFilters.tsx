import Link from "next/link";

import { IconFilters, IconSearch } from "@/components/ui/icons";
import { FILTER_STRATA } from "@/lib/properties/catalog";

import type { SearchOptions, SelectOption } from "./options";
import { SearchForm } from "./SearchForm";

const SORT_OPTIONS: SelectOption[] = [
  { value: "", label: "Predeterminado" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "area_desc", label: "Área: mayor a menor" },
  { value: "area_asc", label: "Área: menor a mayor" },
  { value: "price_m2_asc", label: "Precio por m²: menor a mayor" },
  { value: "price_m2_desc", label: "Precio por m²: mayor a menor" },
];

const ROOM_OPTIONS: SelectOption[] = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` }));

function Select({
  name,
  label,
  placeholder,
  options,
  value,
}: {
  name: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value: string;
}) {
  const id = `filter-${name}`;
  // Si la URL trae un valor que no está en la lista (p. ej. un barrio por id), se conserva.
  const known = value === "" || options.some((o) => o.value === value);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={value}
        className="field-control mt-1 border-b border-champagne-deep/70 font-medium"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {!known && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({ name, label, value, hint }: { name: string; label: string; value: string; hint: string }) {
  const id = `filter-${name}`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        defaultValue={value}
        placeholder={hint}
        className="field-control mt-1 border-b border-champagne-deep/70 font-medium placeholder:text-muted"
      />
    </div>
  );
}

/**
 * Filtros de resultados. Formulario GET con los parámetros exactos de la API.
 * Barra rápida siempre visible + «Más filtros» plegable (funciona sin JavaScript).
 * `key` fuerza a remontar el formulario cuando cambia la URL (valores por defecto actualizados).
 */
export function ResultsFilters({
  options,
  values,
}: {
  options: SearchOptions;
  values: URLSearchParams;
}) {
  const v = (name: string) => values.get(name) ?? "";
  const commune = v("commune");
  const neighborhoods = commune ? options.neighborhoodsByCommune[commune] ?? [] : [];
  const advanced = ["neighborhood", "minPrice", "maxPrice", "bedrooms", "bathrooms", "stratum"];
  const advancedActive = advanced.filter((name) => v(name) !== "").length;

  return (
    <SearchForm
      key={values.toString()}
      ariaLabel="Filtrar propiedades"
      className="@container border border-line bg-surface p-5 sm:p-6"
    >
      <div className="grid gap-5 @sm:grid-cols-2 @4xl:grid-cols-[1fr_1fr_1.2fr_1.3fr_auto] @4xl:items-end">
        <Select name="operation" label="Operación" placeholder="Venta o arriendo" options={options.operations} value={v("operation")} />
        <Select name="type" label="Tipo" placeholder="Todos los tipos" options={options.types} value={v("type")} />
        <Select name="commune" label="Comuna" placeholder="Todas las comunas" options={options.communes} value={commune} />
        <Select name="sort" label="Ordenar por" options={SORT_OPTIONS} value={v("sort")} />
        <button type="submit" className="btn btn-primary w-full @sm:col-span-2 @4xl:col-span-1">
          <IconSearch size={18} />
          Buscar
        </button>
      </div>

      <details className="group mt-5 border-t border-line pt-4" open={advancedActive > 0}>
        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-forest">
          <IconFilters size={18} className="text-champagne-deep" />
          Más filtros
          {advancedActive > 0 && (
            <span className="bg-forest px-2 py-0.5 text-xs text-ivory">{advancedActive}</span>
          )}
          <span className="text-muted group-open:hidden" aria-hidden="true">+</span>
          <span className="hidden text-muted group-open:inline" aria-hidden="true">−</span>
        </summary>

        <div className="mt-4 grid gap-5 @sm:grid-cols-2 @4xl:grid-cols-6">
          {neighborhoods.length > 0 ? (
            <div className="@sm:col-span-2 @4xl:col-span-2">
              <Select name="neighborhood" label="Barrio" placeholder="Todos los barrios" options={neighborhoods} value={v("neighborhood")} />
            </div>
          ) : (
            <p className="text-sm text-muted @sm:col-span-2 @4xl:col-span-2 @4xl:self-end">
              Elige una comuna y pulsa «Buscar» para filtrar por barrio.
            </p>
          )}
          <NumberInput name="minPrice" label="Precio mínimo" value={v("minPrice")} hint="Sin mínimo" />
          <NumberInput name="maxPrice" label="Precio máximo" value={v("maxPrice")} hint="Sin máximo" />
          <Select name="bedrooms" label="Habitaciones" placeholder="Cualquiera" options={ROOM_OPTIONS} value={v("bedrooms")} />
          <Select name="bathrooms" label="Baños" placeholder="Cualquiera" options={ROOM_OPTIONS} value={v("bathrooms")} />
          <Select
            name="stratum"
            label="Estrato"
            placeholder="Cualquiera"
            options={FILTER_STRATA.map((s) => ({ value: String(s), label: `Estrato ${s}` }))}
            value={v("stratum")}
          />
        </div>
        <p className="mt-4 text-xs text-muted">
          Precios en pesos colombianos (en arriendo, valor mensual). Los filtros de habitaciones y
          baños excluyen las ofertas que no reportan ese dato.
        </p>
      </details>

      <div className="mt-4 flex justify-end">
        <Link href="/propiedades" className="inline-flex min-h-11 items-center text-sm font-semibold text-champagne-deep underline-offset-4 hover:underline">
          Limpiar filtros
        </Link>
      </div>
    </SearchForm>
  );
}
