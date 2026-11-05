"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

import { MapListToggle, type ResultsView } from "@/components/map/MapListToggle";
import type { FocusRequest } from "@/components/map/MapView";
import { groupMapPoints, pointTitle, type MapPoint } from "@/components/map/points";
import { PropertyMap } from "@/components/map/PropertyMap";
import { PropertyPopup } from "@/components/map/PropertyPopup";
import { PROPERTY_GRID_CLASSES } from "@/components/property/PropertyGrid";
import { IconPin } from "@/components/ui/icons";

import { recordDetailOrigin } from "./RememberSearch";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** true en escritorio (≥1024px). En el servidor se asume móvil: el mapa nunca se renderiza en SSR. */
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

function scrollToCard(id: number) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() => {
    document
      .getElementById(`propiedad-${id}`)
      ?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  });
}

interface Selection {
  /** Identifica el conjunto de resultados al que pertenece la selección. */
  pointsKey: string;
  groupKey: string | null;
  id: number | null;
}

/**
 * Listado + mapa sincronizados para /propiedades.
 * - Escritorio: listado a la izquierda y mapa fijo (sticky) a la derecha.
 * - Móvil/tablet: selector Lista / Mapa; nunca ambos comprimidos a la vez.
 * Las tarjetas llegan renderizadas desde el servidor (`cards`) y no se duplican aquí.
 * El mapa solo representa los resultados de la página actual (`points`).
 */
export function ResultsExplorer({
  filters,
  summary,
  cards,
  pagination,
  footnote,
  points,
  total,
}: {
  filters: ReactNode;
  summary: ReactNode;
  cards: { id: number; node: ReactNode }[];
  pagination: ReactNode;
  footnote: ReactNode;
  points: MapPoint[];
  total: number;
}) {
  const isDesktop = useIsDesktop();
  const [view, setView] = useState<ResultsView>("list");
  const [mapOpened, setMapOpened] = useState(false);
  const [selection, setSelection] = useState<Selection>({ pointsKey: "", groupKey: null, id: null });
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [fitRequest, setFitRequest] = useState(0);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const toggleRef = useRef<HTMLDivElement>(null);

  const pointsKey = useMemo(() => points.map((p) => p.id).join(","), [points]);
  const groups = useMemo(() => groupMapPoints(points), [points]);
  const groupOf = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of groups) for (const p of g.points) map.set(p.id, g.key);
    return map;
  }, [groups]);
  const pointById = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);

  // Una selección de otra página o de otros filtros deja de ser válida automáticamente.
  const current = selection.pointsKey === pointsKey ? selection : null;
  const selectedGroupKey = current?.groupKey ?? null;
  const selectedId = current?.id ?? null;
  const selectedGroup = groups.find((g) => g.key === selectedGroupKey) ?? null;
  const highlightedGroupKey = hoveredId !== null ? (groupOf.get(hoveredId) ?? null) : null;

  const mapVisible = isDesktop || view === "map";
  const mapMounted = isDesktop || view === "map" || mapOpened;

  const changeView = useCallback((next: ResultsView) => {
    setView(next);
    if (next === "map") setMapOpened(true);
    toggleRef.current?.scrollIntoView({ block: "start" });
  }, []);

  const selectGroup = useCallback(
    (groupKey: string) => {
      const group = groups.find((g) => g.key === groupKey);
      if (!group) return;
      const id = group.points.length === 1 ? group.points[0].id : null;
      setSelection({ pointsKey, groupKey, id });
      if (isDesktop) scrollToCard(id ?? group.points[0].id);
    },
    [groups, pointsKey, isDesktop],
  );

  const selectFromCard = useCallback(
    (id: number) => {
      const groupKey = groupOf.get(id);
      if (!groupKey) return;
      setSelection({ pointsKey, groupKey, id });
      setFocus((prev) => ({ groupKey, nonce: (prev?.nonce ?? 0) + 1 }));
      if (!isDesktop) changeView("map");
    },
    [groupOf, pointsKey, isDesktop, changeView],
  );

  const selectInGroup = useCallback(
    (id: number) => {
      setSelection((prev) => ({ ...prev, id }));
      if (isDesktop) scrollToCard(id);
    },
    [isDesktop],
  );

  const showInList = useCallback(
    (id: number) => {
      if (!isDesktop) setView("list");
      scrollToCard(id);
    },
    [isDesktop],
  );

  const clearSelection = useCallback(
    () => setSelection({ pointsKey, groupKey: null, id: null }),
    [pointsKey],
  );

  const showAll = useCallback(() => {
    clearSelection();
    setFitRequest((n) => n + 1);
  }, [clearSelection]);

  // Fase de captura: se registra el origen antes de que el enlace a una ficha navegue
  // (tarjetas y «Ver ficha» del resumen del mapa). Los clics con modificadores abren otra pestaña.
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    const href = anchor?.getAttribute("href");
    if (href && /^\/propiedades\/\d+$/.test(href)) recordDetailOrigin(href);
  };

  return (
    <div onClickCapture={onClickCapture}>
      <div ref={toggleRef} className="sticky top-[4.5rem] z-30 scroll-mt-[4.5rem] bg-ivory pt-1 pb-3 lg:hidden">
        <MapListToggle view={view} onChange={changeView} />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* Listado (izquierda en escritorio) */}
        <div className={`@container min-w-0 space-y-8 ${view === "map" ? "hidden lg:block" : ""}`}>
          {filters}
          {summary}
          <ul className={PROPERTY_GRID_CLASSES.split}>
            {cards.map(({ id, node }) => {
              const point = pointById.get(id);
              const isSelected =
                selectedId === id || (selectedId === null && selectedGroup?.points.some((p) => p.id === id));
              return (
                <li
                  key={id}
                  id={`propiedad-${id}`}
                  className={`relative scroll-mt-28 transition-shadow duration-300 ${
                    isSelected ? "ring-2 ring-champagne ring-offset-4 ring-offset-ivory" : ""
                  }`}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId((h) => (h === id ? null : h))}
                  onFocus={() => setHoveredId(id)}
                  onBlur={() => setHoveredId((h) => (h === id ? null : h))}
                >
                  {node}
                  {point && (
                    <button
                      type="button"
                      onClick={() => selectFromCard(id)}
                      aria-label={`Ver en mapa: ${pointTitle(point)}`}
                      className="absolute top-3 right-3 inline-flex min-h-11 items-center gap-1.5 bg-ivory/95 px-3 text-[0.6875rem] font-bold tracking-[0.14em] text-forest uppercase shadow-sm transition-colors hover:bg-champagne"
                    >
                      <IconPin size={15} />
                      Ver en mapa
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {pagination}
          {footnote}
        </div>

        {/* Mapa (derecha en escritorio, modo Mapa en móvil) */}
        <div className={`min-w-0 ${view === "list" ? "hidden lg:block" : ""}`}>
          <div className="h-[calc(100svh-9.5rem)] min-h-[24rem] lg:sticky lg:top-24 lg:h-[calc(100svh-7.5rem)]">
            {mapMounted && (
              <PropertyMap
                mapProps={{
                  groups,
                  selectedGroupKey,
                  highlightedGroupKey,
                  focus,
                  fitRequest,
                  visible: mapVisible,
                  onSelectGroup: selectGroup,
                }}
                shownCount={points.length}
                total={total}
                withoutLocation={cards.length - points.length}
                onShowAll={showAll}
                popup={
                  selectedGroup && (
                    <PropertyPopup
                      group={selectedGroup}
                      selectedId={selectedId}
                      onSelectPoint={selectInGroup}
                      onBackToGroup={() => setSelection((prev) => ({ ...prev, id: null }))}
                      onShowInList={showInList}
                      onClose={clearSelection}
                    />
                  )
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
