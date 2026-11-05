import Link from "next/link";

import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import type { Pagination as PaginationData } from "@/types/property";

function hrefFor(base: URLSearchParams, page: number): string {
  const params = new URLSearchParams(base);
  if (page <= 1) params.delete("page");
  else params.set("page", String(page));
  const query = params.toString();
  return query ? `/propiedades?${query}` : "/propiedades";
}

/** Páginas visibles: primera, última y las vecinas de la actual, con elipsis. */
function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push("gap");
    result.push(page);
  });
  return result;
}

const linkBase =
  "inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm font-semibold transition-colors";

export function Pagination({ pagination, params }: { pagination: PaginationData; params: URLSearchParams }) {
  const { page, totalPages, hasPreviousPage, hasNextPage } = pagination;
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-center gap-1">
      {hasPreviousPage ? (
        <Link href={hrefFor(params, page - 1)} className={`${linkBase} text-forest hover:bg-surface`} rel="prev">
          <IconChevronLeft size={18} />
          <span className="sr-only sm:not-sr-only">Anterior</span>
        </Link>
      ) : (
        <span className={`${linkBase} text-muted/50`} aria-hidden="true">
          <IconChevronLeft size={18} />
        </span>
      )}

      <ol className="flex flex-wrap items-center gap-1">
        {pageWindow(page, totalPages).map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(params, item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Página ${item}`}
                className={`${linkBase} ${
                  item === page ? "bg-forest text-ivory" : "text-forest hover:bg-surface"
                }`}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>

      {hasNextPage ? (
        <Link href={hrefFor(params, page + 1)} className={`${linkBase} text-forest hover:bg-surface`} rel="next">
          <span className="sr-only sm:not-sr-only">Siguiente</span>
          <IconChevronRight size={18} />
        </Link>
      ) : (
        <span className={`${linkBase} text-muted/50`} aria-hidden="true">
          <IconChevronRight size={18} />
        </span>
      )}
    </nav>
  );
}

export { hrefFor as paginationHref };
