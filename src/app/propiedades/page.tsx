import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { toMapPoints } from "@/components/map/points";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyGridSkeleton } from "@/components/property/PropertyGrid";
import { buildSearchOptions, loadFacetsSafely } from "@/components/search/options";
import { Pagination as PaginationNav, paginationHref } from "@/components/search/Pagination";
import { ResultsExplorer } from "@/components/search/ResultsExplorer";
import { RememberSearch } from "@/components/search/RememberSearch";
import { ResultsFilters } from "@/components/search/ResultsFilters";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { DataNotice } from "@/components/ui/DataNotice";
import { ArcGisError } from "@/lib/arcgis/client";
import { formatNumber } from "@/lib/format";
import { parsePropertySearchParams, type ParamIssue } from "@/lib/properties/query-params";
import { getDatasetMeta, resolveSearchQuery, searchProperties } from "@/lib/properties/service";
import { listingSeo } from "@/lib/seo/listing";
import { socialMetadata } from "@/lib/site";
import type { Pagination } from "@/types/property";

/**
 * Metadatos según los filtros (ver la política en src/lib/seo/listing.ts). Las búsquedas
 * indexables se comprueban con la misma consulta cacheada que usa el listado: los resultados
 * vacíos, las páginas fuera de rango y los fallos de la fuente se marcan `noindex`.
 */
export async function generateMetadata(props: PageProps<"/propiedades">): Promise<Metadata> {
  const params = toURLSearchParams(await props.searchParams);
  const seo = listingSeo(params);
  let indexable = seo.indexable;
  if (indexable && seo.parsed) {
    try {
      const resolved = await resolveSearchQuery(seo.parsed);
      const { pagination } = resolved.ok ? await searchProperties(resolved.query) : { pagination: null };
      indexable = pagination !== null && pagination.total > 0 && !pagination.pageOutOfRange;
    } catch (error) {
      if (!(error instanceof ArcGisError)) throw error;
      indexable = false;
    }
  }
  return {
    title: seo.title,
    description: seo.description,
    alternates: indexable && seo.canonical ? { canonical: seo.canonical } : undefined,
    robots: indexable ? undefined : { index: false, follow: true },
    ...socialMetadata({ title: seo.title, description: seo.description, path: indexable ? (seo.canonical ?? undefined) : undefined }),
  };
}

type RawSearchParams = Record<string, string | string[] | undefined>;

/** Conserva los valores repetidos para que el validador de la API los detecte. */
function toURLSearchParams(raw: RawSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.append(key, value);
  }
  return params;
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="status" className="border border-line bg-surface px-6 py-10 text-center sm:px-10">
      <h2 className="text-[1.9rem] text-forest">{title}</h2>
      <div className="mx-auto mt-3 max-w-xl text-muted">{children}</div>
    </div>
  );
}

function IssueList({ issues }: { issues: ParamIssue[] }) {
  return (
    <ul className="mt-4 space-y-1 text-left text-sm">
      {issues.map((issue) => (
        <li key={`${issue.param}-${issue.message}`}>
          <code className="font-semibold text-forest">{issue.param}</code>: {issue.message}
        </li>
      ))}
    </ul>
  );
}

type ResultsState =
  | { kind: "invalid"; issues: ParamIssue[] }
  | { kind: "upstream-error"; page: number }
  | {
      kind: "ok";
      result: Awaited<ReturnType<typeof searchProperties>>;
      excludedRecords: number | null;
    };

/** Carga de datos separada del render: los errores de ArcGIS se convierten en un estado. */
async function loadResults(params: URLSearchParams): Promise<ResultsState> {
  const parsed = parsePropertySearchParams(params);
  if (!parsed.ok) return { kind: "invalid", issues: parsed.issues };
  try {
    const resolved = await resolveSearchQuery(parsed.params);
    if (!resolved.ok) return { kind: "invalid", issues: resolved.issues };
    const [result, meta] = await Promise.all([searchProperties(resolved.query), getDatasetMeta()]);
    return { kind: "ok", result, excludedRecords: meta.exclusionPolicy.excludedRecords };
  } catch (error) {
    if (!(error instanceof ArcGisError)) throw error;
    console.error(`[propiedades] ${error.kind}: ${error.message}`);
    return { kind: "upstream-error", page: parsed.params.page };
  }
}

async function Results({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = toURLSearchParams(await searchParams);
  const [facets, state] = await Promise.all([loadFacetsSafely(), loadResults(params)]);
  const filters = <ResultsFilters options={buildSearchOptions(facets)} values={params} />;

  // Con resultados en la página: listado y mapa sincronizados.
  if (state.kind === "ok" && state.result.data.length > 0 && !state.result.pagination.pageOutOfRange) {
    const { data, pagination } = state.result;
    return (
      <>
        <RememberSearch query={params.toString()} />
        <ResultsExplorer
        filters={filters}
        summary={<ResultsSummary pagination={pagination} />}
        cards={data.map((property) => ({ id: property.id, node: <PropertyCard property={property} /> }))}
        pagination={<PaginationNav pagination={pagination} params={params} />}
        footnote={<ExcludedNote excludedRecords={state.excludedRecords} />}
        points={toMapPoints(data)}
        total={pagination.total}
        />
      </>
    );
  }

  // Sin resultados, página fuera de rango o errores: diseño de una columna, sin mapa.
  return (
    <div className="space-y-10">
      <RememberSearch query={params.toString()} />
      {filters}
      <ResultsBody state={state} params={params} />
    </div>
  );
}

function ResultsSummary({ pagination }: { pagination: Pagination }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      <h2 className="font-serif text-[1.6rem] text-forest" aria-live="polite">
        {formatNumber(pagination.total)} {pagination.total === 1 ? "propiedad" : "propiedades"}
      </h2>
      {pagination.totalPages > 0 && !pagination.pageOutOfRange && (
        <p className="text-sm text-muted">
          Página {formatNumber(pagination.page)} de {formatNumber(pagination.totalPages)}
        </p>
      )}
    </div>
  );
}

function ExcludedNote({ excludedRecords }: { excludedRecords: number | null }) {
  if (excludedRecords === null) return null;
  return (
    <p className="text-xs leading-relaxed text-muted">
      Se omiten {formatNumber(excludedRecords)} registros de la fuente por datos inconsistentes
      (precios de relleno o valores fuera de rango).
    </p>
  );
}

function ResultsBody({ state, params }: { state: ResultsState; params: URLSearchParams }) {
  if (state.kind === "invalid") {
    return (
      <Notice title="Revisa los filtros de búsqueda">
        <p>Algunos valores no son válidos:</p>
        <IssueList issues={state.issues} />
        <Link href="/propiedades" className="btn btn-primary mt-8">
          Ver todas las propiedades
        </Link>
      </Notice>
    );
  }

  if (state.kind === "upstream-error") {
    return (
      <Notice title="La fuente de datos no respondió">
        <p>
          El servicio público de la Alcaldía de Medellín no está disponible en este momento o tardó
          demasiado en responder. Inténtalo de nuevo en unos segundos.
        </p>
        <Link href={paginationHref(params, state.page)} className="btn btn-primary mt-8">
          Reintentar
        </Link>
      </Notice>
    );
  }

  const { pagination } = state.result;
  return (
    <>
      <ResultsSummary pagination={pagination} />

      {pagination.pageOutOfRange ? (
        <Notice title="Esta página no existe para la búsqueda actual">
          <p>
            La búsqueda tiene {formatNumber(pagination.totalPages)}{" "}
            {pagination.totalPages === 1 ? "página" : "páginas"}.
          </p>
          <Link href={paginationHref(params, 1)} className="btn btn-primary mt-8">
            Ir a la primera página
          </Link>
        </Notice>
      ) : (
        <Notice title="No encontramos propiedades con estos filtros">
          <p>Prueba con otra comuna, otro tipo de inmueble o un rango de precio más amplio.</p>
          <Link href="/propiedades" className="btn btn-primary mt-8">
            Limpiar filtros
          </Link>
        </Notice>
      )}

      <ExcludedNote excludedRecords={state.excludedRecords} />
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Cargando propiedades">
      <div className="h-40 animate-pulse border border-line bg-surface" />
      <div className="h-8 w-48 animate-pulse bg-line" />
      <PropertyGridSkeleton count={6} />
    </div>
  );
}

export default function PropertiesPage(props: PageProps<"/propiedades">) {
  return (
    <div className="container-editorial py-12 lg:py-16">
      <BreadcrumbJsonLd
        items={[
          { name: "Inicio", path: "/" },
          { name: "Propiedades", path: "/propiedades" },
        ]}
      />
      <header className="max-w-3xl">
        <p className="eyebrow flex items-center gap-4 text-champagne-deep">
          <span className="rule-gold" aria-hidden="true" />
          Buscar propiedades
        </p>
        <h1 className="text-title mt-5 text-forest">Propiedades en Medellín</h1>
      </header>

      <DataNotice id="aviso-datos" className="mt-8 max-w-3xl" />

      <div className="mt-10">
        <Suspense fallback={<ResultsSkeleton />}>
          <Results searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
