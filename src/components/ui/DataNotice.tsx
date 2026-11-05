import { DATA_DISCLAIMER } from "@/lib/properties/data-policy";

import { IconInfo } from "./icons";

/** Aviso permanente: los datos son ofertas históricas de agosto de 2023. */
export function DataNotice({ id, className = "" }: { id?: string; className?: string }) {
  return (
    <aside
      id={id}
      aria-label="Aviso sobre los datos"
      className={`flex scroll-mt-28 gap-3 border-l-2 border-champagne bg-surface px-4 py-3 text-sm leading-relaxed text-muted ${className}`}
    >
      <IconInfo size={18} className="mt-0.5 shrink-0 text-champagne-deep" />
      <p>{DATA_DISCLAIMER}</p>
    </aside>
  );
}
