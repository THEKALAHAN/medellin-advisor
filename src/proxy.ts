import { NextResponse, type NextRequest } from "next/server";

import { parsePropertyId } from "@/lib/properties/query-params";

/** Ruta sin página asociada: la resuelve `src/app/not-found.tsx` con estado 404. */
const NOT_FOUND_PATH = "/__propiedad-no-encontrada";

/**
 * Estado 404 real para fichas con identificador mal formado.
 *
 * Con Partial Prefetching, /propiedades/[id] envía primero el App Shell y el estado HTTP queda
 * fijado en 200 antes de conocer el resultado. Siguiendo la documentación de Next.js, la
 * comprobación que debe producir un 404 real se hace aquí, antes del render, y solo por formato
 * (rápida, sin consultar datos): `abc`, `01`, `-5`, `1.5`, valores fuera de rango… reciben el
 * 404 general del sitio, renderizado en el servidor y con estado 404.
 *
 * Los identificadores bien formados pero inexistentes (o excluidos por calidad) requieren
 * consultar la fuente: la ficha los resuelve con una página «no encontrada» con `noindex`.
 */
export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[2] ?? "";
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Secuencia de escape inválida: se trata como identificador mal formado.
  }
  if (parsePropertyId(decoded) === null) {
    // `rewrite` no permite fijar el estado (verificado: se ignora `status`). Se reescribe a una
    // ruta que no existe: el not-found raíz responde 404 real con HTML renderizado en el servidor.
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/propiedades/:id",
};
