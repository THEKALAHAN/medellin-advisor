import { IconSearch } from "@/components/ui/icons";

import type { SearchOptions } from "./options";
import { SearchForm } from "./SearchForm";

interface FieldProps {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

function SelectField({ id, name, label, placeholder, options }: FieldProps) {
  return (
    <div className="min-w-0 px-5 py-3.5 md:py-4 lg:px-7">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <select id={id} name={name} defaultValue="" className="field-control mt-1 font-medium">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Buscador del hero. Envía exclusivamente parámetros aceptados por la API:
 * `operation` (venta | arriendo), `commune` (slug) y `type` (slug).
 * Móvil: vertical · Tablet: 3 campos en fila y botón debajo · Escritorio: barra horizontal.
 */
export function SearchBar({ options }: { options: SearchOptions }) {
  return (
    <SearchForm
      ariaLabel="Buscar propiedades"
      className="grid bg-surface text-charcoal shadow-[0_30px_60px_-30px_rgba(0,0,0,0.55)] md:grid-cols-3 lg:grid-cols-[1fr_1.3fr_1.2fr_auto]"
    >
      <div className="min-w-0 border-b border-line md:border-r md:border-b-0">
        <SelectField
          id="search-operation"
          name="operation"
          label="Operación"
          placeholder="Venta o arriendo"
          options={options.operations}
        />
      </div>
      <div className="min-w-0 border-b border-line md:border-r md:border-b-0">
        <SelectField
          id="search-commune"
          name="commune"
          label="Comuna"
          placeholder="Todas las comunas"
          options={options.communes}
        />
      </div>
      <div className="min-w-0 border-b border-line md:border-b-0 lg:border-r">
        <SelectField
          id="search-type"
          name="type"
          label="Tipo de propiedad"
          placeholder="Todos los tipos"
          options={options.types}
        />
      </div>
      <div className="p-3 md:col-span-3 md:border-t md:border-line lg:col-span-1 lg:border-t-0">
        <button type="submit" className="btn btn-primary h-full min-h-14 w-full lg:px-9">
          <IconSearch size={18} />
          Buscar
        </button>
      </div>
    </SearchForm>
  );
}
