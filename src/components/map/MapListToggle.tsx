"use client";

import type { ReactNode } from "react";

import { IconMenu, IconPin } from "@/components/ui/icons";

export type ResultsView = "list" | "map";

/** Selector Lista / Mapa para pantallas menores de 1024px (botones con aria-pressed). */
export function MapListToggle({
  view,
  onChange,
}: {
  view: ResultsView;
  onChange: (view: ResultsView) => void;
}) {
  const option = (value: ResultsView, label: string, icon: ReactNode) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => onChange(value)}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 text-xs font-bold tracking-[0.14em] uppercase transition-colors ${
        view === value ? "bg-forest text-ivory" : "text-forest hover:bg-ivory"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div role="group" aria-label="Vista de resultados" className="flex border border-forest/25 bg-surface p-1">
      {option("list", "Lista", <IconMenu size={16} />)}
      {option("map", "Mapa", <IconPin size={16} />)}
    </div>
  );
}
