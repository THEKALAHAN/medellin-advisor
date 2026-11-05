"use client";

import Link from "next/link";

import { PriceTag } from "@/components/property/PriceTag";
import { IconArrowRight, IconClose, IconPin } from "@/components/ui/icons";
import { formatArea, formatCompactCOP } from "@/lib/format";

import { pointTitle, type MapGroup, type MapPoint } from "./points";

/**
 * Resumen de la selección en el mapa. Solo muestra datos que trae la fuente:
 * tipo, operación, barrio/comuna, precio y área (o «Área no reportada»).
 * Si varias ofertas comparten coordenadas, primero se listan para elegir una.
 */
export function PropertyPopup({
  group,
  selectedId,
  onSelectPoint,
  onBackToGroup,
  onShowInList,
  onClose,
}: {
  group: MapGroup;
  selectedId: number | null;
  onSelectPoint: (id: number) => void;
  onBackToGroup: () => void;
  onShowInList: (id: number) => void;
  onClose: () => void;
}) {
  const selected = group.points.find((p) => p.id === selectedId) ?? null;
  const isGroup = group.points.length > 1;

  return (
    <section
      aria-label="Resumen de la selección en el mapa"
      aria-live="polite"
      className="pointer-events-auto relative w-full max-w-sm min-w-0 bg-surface text-charcoal shadow-[0_24px_48px_-20px_rgba(23,45,37,0.55)] ring-1 ring-line"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-1 right-1 inline-flex size-11 items-center justify-center text-muted transition-colors hover:text-forest"
        aria-label="Cerrar resumen"
      >
        <IconClose size={18} />
      </button>

      {selected ? (
        <PointSummary
          point={selected}
          onShowInList={onShowInList}
          backLabel={isGroup ? `Ver las ${group.points.length} ofertas de esta ubicación` : null}
          onBack={onBackToGroup}
        />
      ) : (
        <div className="p-5 pr-12">
          <p className="eyebrow text-champagne-deep">Misma ubicación</p>
          <h2 className="mt-1 font-serif text-[1.35rem] leading-tight text-forest">
            {group.points.length} ofertas en este punto
          </h2>
          <ul className="mt-3 max-h-56 divide-y divide-line overflow-y-auto">
            {group.points.map((point) => (
              <li key={point.id}>
                <button
                  type="button"
                  onClick={() => onSelectPoint(point.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-forest"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {point.typeLabel} · {point.operationLabel}
                    </span>
                    <span className="block truncate text-muted">{pointTitle(point)}</span>
                  </span>
                  <span className="shrink-0 font-serif text-base font-semibold text-forest">
                    {formatCompactCOP(point.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function PointSummary({
  point,
  onShowInList,
  backLabel,
  onBack,
}: {
  point: MapPoint;
  onShowInList: (id: number) => void;
  backLabel: string | null;
  onBack: () => void;
}) {
  const subtitle = point.neighborhood && point.commune ? point.commune : null;
  return (
    <div className="p-5 pr-12">
      <p className="eyebrow text-champagne-deep">
        {point.typeLabel} · {point.operationLabel}
      </p>
      <h2 className="mt-1 font-serif text-[1.45rem] leading-tight wrap-anywhere text-forest">
        {pointTitle(point)}
      </h2>
      {subtitle && (
        <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted">
          <IconPin size={15} className="text-champagne-deep" />
          {subtitle}
        </p>
      )}
      <PriceTag price={point.price} operation={point.operation} className="mt-3" />
      <p className="mt-1 text-sm text-muted">
        {point.areaM2 !== null ? formatArea(point.areaM2) : "Área no reportada"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4">
        <Link
          href={`/propiedades/${point.id}`}
          className="btn btn-primary min-h-11 px-4 py-2 text-[0.6875rem]"
        >
          Ver ficha
        </Link>
        <button
          type="button"
          onClick={() => onShowInList(point.id)}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-forest underline-offset-4 hover:underline"
        >
          Ver en el listado
          <IconArrowRight size={16} />
        </button>
        {backLabel && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-champagne-deep underline-offset-4 hover:underline"
          >
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}
